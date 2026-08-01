import { buildCertificatePdf } from "@/lib/certificates/pdf";
import { escapeEmailHtml, isMailjetConfigured, sendEmail } from "@/lib/mailjet/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { isWhatsAppCloudConfigured, sendWhatsAppTemplate } from "@/lib/whatsapp/client";
import { buildAttendanceAcknowledgementUrl } from "./delivery";

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
  if (!profile.email_consent) emailStatus = "skipped";
  else if (certificate.email_status !== "sent" && isMailjetConfigured()) {
    try {
      const result = await sendEmail({
        toEmail: profile.email, toName: profile.full_name, subject: `Your certificate for ${event.name}`,
        text: `Thank you for participating in ${event.name}. Your attendance is recorded and your named certificate is attached. Certificate: ${certificateNumber}.`,
        html: `<p>Hello ${escapeEmailHtml(profile.full_name)},</p><p>Thank you for completing <strong>${escapeEmailHtml(event.name)}</strong>. Your attendance has been recorded.</p><p>Your named certificate is attached and is also available from your Passion2Serve profile.</p><p>Certificate: ${escapeEmailHtml(certificateNumber)}</p>`,
        customId: certificate.id, eventPayload: certificate.id,
        attachments: [{ filename: `${certificateNumber}.pdf`, contentType: "application/pdf", base64Content: pdf.toString("base64") }],
      });
      emailStatus = "sent";
      await admin.from("certificates").update({ email_status: "sent", email_message_id: result.messageId || result.messageUuid, email_error: null }).eq("id", certificate.id);
    } catch (error) {
      emailStatus = "failed";
      await admin.from("certificates").update({ email_status: "failed", email_error: error instanceof Error ? error.message : "Mailjet delivery failed." }).eq("id", certificate.id);
    }
  }
  if (emailStatus === "skipped") await admin.from("certificates").update({ email_status: "skipped" }).eq("id", certificate.id);

  const acknowledgementUrl: string | null = profile.phone ? buildAttendanceAcknowledgementUrl(profile.phone, profile.full_name, event.name) : null;
  let whatsappStatus = "skipped";
  if (profile.whatsapp_consent && profile.phone) {
    const key = `attendance_ack:${input.eventId}:${input.participantId}`;
    const { data: existing } = await admin.from("notification_deliveries").select("id,status").eq("idempotency_key", key).maybeSingle();
    if (existing && ["sent", "delivered", "read"].includes(existing.status)) whatsappStatus = existing.status;
    else if (isWhatsAppCloudConfigured() && process.env.WHATSAPP_ACK_TEMPLATE) {
      const { data: delivery } = await admin.from("notification_deliveries").upsert({ participant_id: input.participantId, event_id: input.eventId, channel: "whatsapp", notification_type: "attendance_acknowledgement", idempotency_key: key, recipient: profile.phone, provider: "meta_cloud", status: "pending" }, { onConflict: "idempotency_key" }).select("id").single();
      try {
        const result = await sendWhatsAppTemplate({ to: profile.phone, templateName: process.env.WHATSAPP_ACK_TEMPLATE, bodyParameters: [profile.full_name, event.name, certificateNumber] });
        whatsappStatus = "sent";
        if (delivery) await admin.from("notification_deliveries").update({ status: "sent", provider_message_id: result.messageId, sent_at: new Date().toISOString() }).eq("id", delivery.id);
      } catch (error) {
        whatsappStatus = "failed";
        if (delivery) await admin.from("notification_deliveries").update({ status: "failed", error: error instanceof Error ? error.message : "WhatsApp delivery failed." }).eq("id", delivery.id);
      }
    } else {
      whatsappStatus = "manual";
      await admin.from("notification_deliveries").upsert({ participant_id: input.participantId, event_id: input.eventId, channel: "whatsapp", notification_type: "attendance_acknowledgement", idempotency_key: key, recipient: profile.phone, provider: "wa_me", status: "manual", payload: { acknowledgementUrl } }, { onConflict: "idempotency_key" });
    }
  }
  return { certificateNumber, emailStatus, whatsappStatus, acknowledgementUrl, pointsAwarded: 100, badgesAwarded: badgeCodes };
}
