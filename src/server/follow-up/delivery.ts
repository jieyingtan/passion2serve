import { escapeEmailHtml, isMailjetConfigured, sendEmail } from "@/lib/mailjet/client";
import {
  attendanceAcknowledgementMessage,
  buildWhatsAppUrl,
  eventReminderMessage,
  registrationConfirmationMessage,
} from "@/lib/outreach/whatsapp";
import { createAdminClient } from "@/lib/supabase/admin";

interface EventNoticeInput {
  participantId: string;
  eventId: string;
  type: "registration_receipt" | "event_reminder";
}

export async function sendEventNotice(input: EventNoticeInput) {
  const admin = createAdminClient();
  const [{ data: profile }, { data: event }] = await Promise.all([
    admin.from("profiles").select("full_name,email,phone,email_consent,whatsapp_consent").eq("id", input.participantId).maybeSingle(),
    admin.from("events").select("name,starts_at,venue").eq("id", input.eventId).maybeSingle(),
  ]);
  if (!profile || !event) throw new Error("Notification recipient or event not found.");
  const eventDate = new Intl.DateTimeFormat("en-SG", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Singapore" }).format(new Date(event.starts_at));
  const label = input.type === "event_reminder" ? "Event reminder" : "Registration confirmed";
  const keyBase = `${input.type}:${input.eventId}:${input.participantId}`;

  if (profile.email_consent && isMailjetConfigured()) {
    const { data: existing } = await admin.from("notification_deliveries").select("id,status").eq("idempotency_key", `${keyBase}:email`).maybeSingle();
    if (!existing || !["sent", "delivered", "read"].includes(existing.status)) {
      const { data: delivery } = await admin.from("notification_deliveries").upsert({ participant_id: input.participantId, event_id: input.eventId, channel: "email", notification_type: input.type, idempotency_key: `${keyBase}:email`, recipient: profile.email, provider: "mailjet", status: "pending", error: null }, { onConflict: "idempotency_key" }).select("id").single();
      try {
        const result = await sendEmail({
          toEmail: profile.email, toName: profile.full_name, subject: `${label}: ${event.name}`,
          text: `${label} for ${event.name} on ${eventDate} at ${event.venue}. Open your Passion2Serve account for details.`,
          html: `<p>Hello ${escapeEmailHtml(profile.full_name)},</p><p><strong>${escapeEmailHtml(label)}</strong> for ${escapeEmailHtml(event.name)}.</p><p>${escapeEmailHtml(eventDate)}<br>${escapeEmailHtml(event.venue)}</p><p>Open your Passion2Serve account for event details and your membership QR.</p>`,
          customId: delivery?.id, eventPayload: delivery?.id,
        });
        if (delivery) await admin.from("notification_deliveries").update({ status: "sent", provider_message_id: result.messageUuid || result.messageId, sent_at: new Date().toISOString() }).eq("id", delivery.id);
      } catch (error) {
        if (delivery) await admin.from("notification_deliveries").update({ status: "failed", error: error instanceof Error ? error.message : "Mailjet delivery failed." }).eq("id", delivery.id);
      }
    }
  }

  if (profile.whatsapp_consent && profile.phone) {
    const messageInput = { participantName: profile.full_name, eventName: event.name, eventDate, venue: event.venue };
    const message = input.type === "event_reminder" ? eventReminderMessage(messageInput) : registrationConfirmationMessage(messageInput);
    const whatsappUrl = buildWhatsAppUrl(profile.phone, message);
    await admin.from("notification_deliveries").upsert({
      participant_id: input.participantId,
      event_id: input.eventId,
      channel: "whatsapp",
      notification_type: input.type,
      idempotency_key: `${keyBase}:whatsapp`,
      recipient: profile.phone,
      provider: "wa_me",
      status: "manual",
      error: null,
      payload: { whatsappUrl, message },
    }, { onConflict: "idempotency_key" });
  }
}

export function buildAttendanceAcknowledgementUrl(phone: string, name: string, eventName: string) {
  return buildWhatsAppUrl(phone, attendanceAcknowledgementMessage({ participantName: name, eventName }));
}
