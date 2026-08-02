import { buildCertificatePdf } from "@/lib/certificates/pdf";
import { escapeEmailHtml, isMailjetConfigured, sendEmail } from "@/lib/mailjet/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildAttendanceAcknowledgementUrl } from "./delivery";
import { sendAttendanceWalletNotification } from "./wallet";

export async function processAttendanceFollowUp(input: { eventId: string; participantId: string }) {
  const admin = createAdminClient();
  const [{ data: profile }, { data: event }, { count: attendanceCount }] = await Promise.all([
    admin.from("profiles").select("full_name,email,phone,email_consent,whatsapp_consent").eq("id", input.participantId).maybeSingle(),
    admin.from("events").select("name,starts_at,course_id").eq("id", input.eventId).maybeSingle(),
    admin.from("attendance").select("id", { count: "exact", head: true }).eq("participant_id", input.participantId),
  ]);
  if (!profile || !event) throw new Error("Attendance follow-up details were not found.");
  const certificateNumber = `P2S-${new Date(event.starts_at).getFullYear()}-${input.eventId.slice(0, 8).toUpperCase()}-${input.participantId.slice(0, 8).toUpperCase()}`;
  const eventDate = new Intl.DateTimeFormat("en-SG", { dateStyle: "long", timeZone: "Asia/Singapore" }).format(new Date(event.starts_at));
  const walletNotification = await sendAttendanceWalletNotification({
    participantId: input.participantId,
    eventId: input.eventId,
    participantName: profile.full_name,
    eventName: event.name,
    eventDate,
  });
  const pdf = buildCertificatePdf({ participantName: profile.full_name, eventName: event.name, eventDate, certificateNumber });
  const storagePath = `${input.eventId}/${input.participantId}.pdf`;
  const uploaded = await admin.storage.from("certificates-private").upload(storagePath, pdf, { contentType: "application/pdf", upsert: true });
  if (uploaded.error) throw new Error(`Certificate storage failed: ${uploaded.error.message}`);
  const { data: certificate, error: certificateError } = await admin.from("certificates").upsert({ participant_id: input.participantId, event_id: input.eventId, certificate_number: certificateNumber, storage_path: storagePath }, { onConflict: "participant_id,event_id" }).select("id,email_status").single();
  if (certificateError || !certificate) throw new Error("The named certificate could not be saved.");

  await admin.from("point_ledger").upsert({ participant_id: input.participantId, event_id: input.eventId, points: 100, reason: "Event attendance", idempotency_key: `attendance:${input.eventId}:${input.participantId}` }, { onConflict: "idempotency_key", ignoreDuplicates: true });
  const badgeCodes = ["FIRST_STEP"];
  if ((attendanceCount ?? 0) >= 3) badgeCodes.push("COMMUNITY_REGULAR");
  const { data: courseAttendance } = await admin.from("attendance").select("events(course_id)").eq("participant_id", input.participantId);
  const distinctCourses = new Set((courseAttendance ?? []).flatMap((record) => { const related = Array.isArray(record.events) ? record.events[0] : record.events; return related?.course_id ? [related.course_id] : []; }));
  if (distinctCourses.size >= 3) badgeCodes.push("LEARNING_CHAMPION");
  const { data: badges } = await admin.from("badges").select("id,code").in("code", badgeCodes);
  if (badges?.length) await admin.from("participant_badges").upsert(badges.map((badge) => ({ participant_id: input.participantId, badge_id: badge.id, source_event_id: input.eventId })), { onConflict: "participant_id,badge_id", ignoreDuplicates: true });

  let emailStatus = certificate.email_status;
  // Attendance acknowledgements and certificates are transactional service
  // messages requested as part of event participation, not marketing email.
  if (certificate.email_status !== "sent" && isMailjetConfigured()) {
    try {
      const result = await sendEmail({
        toEmail: profile.email, toName: profile.full_name, subject: `Attendance confirmed: ${event.name}`,
        text: `Hello ${profile.full_name},\n\nYour attendance for ${event.name} on ${eventDate} has been recorded. Thank you for participating with Passion2Serve.\n\nYour named Certificate of Participation is attached as a PDF and has also been saved to your participant profile.\n\nCertificate number: ${certificateNumber}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#173b37;line-height:1.6"><p style="font-size:13px;font-weight:700;letter-spacing:.12em;color:#237266">PASSION2SERVE</p><h1 style="font-size:26px">Your attendance is confirmed</h1><p>Hello ${escapeEmailHtml(profile.full_name)},</p><p>Your attendance for <strong>${escapeEmailHtml(event.name)}</strong> on ${escapeEmailHtml(eventDate)} has been recorded. Thank you for participating with Passion2Serve.</p><div style="background:#f1f7f5;border-radius:14px;padding:18px 20px;margin:22px 0"><strong>Your Certificate of Participation is ready</strong><p style="margin-bottom:0">The named PDF certificate is attached to this email and has also been saved to your participant profile.</p></div><p style="font-size:14px;color:#617773">Certificate number: ${escapeEmailHtml(certificateNumber)}</p></div>`,
        customId: certificate.id, eventPayload: certificate.id,
        attachments: [{ filename: `${certificateNumber}.pdf`, contentType: "application/pdf", base64Content: pdf.toString("base64") }],
      });
      emailStatus = "sent";
      await admin.from("certificates").update({ email_status: "sent", email_message_id: result.messageUuid || result.messageId, email_error: null }).eq("id", certificate.id);
    } catch (error) {
      emailStatus = "failed";
      await admin.from("certificates").update({ email_status: "failed", email_error: error instanceof Error ? error.message : "Mailjet delivery failed." }).eq("id", certificate.id);
    }
  }
  const acknowledgementUrl: string | null = profile.phone ? buildAttendanceAcknowledgementUrl(profile.phone, profile.full_name, event.name) : null;
  let whatsappStatus = "skipped";
  if (profile.whatsapp_consent && profile.phone) {
    const key = `attendance_ack:${input.eventId}:${input.participantId}`;
    whatsappStatus = "manual";
    await admin.from("notification_deliveries").upsert({ participant_id: input.participantId, event_id: input.eventId, channel: "whatsapp", notification_type: "attendance_acknowledgement", idempotency_key: key, recipient: profile.phone, provider: "wa_me", status: "manual", payload: { acknowledgementUrl } }, { onConflict: "idempotency_key" });
  }
  return { certificateNumber, emailStatus, whatsappStatus, walletNotification, acknowledgementUrl, pointsAwarded: 100, badgesAwarded: badgeCodes };
}
