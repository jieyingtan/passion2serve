import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

type MailjetEvent = { event?: string; CustomID?: string; MessageID?: string | number; time?: number; error?: string };

export async function POST(request: Request) {
  const configured = process.env.MAILJET_WEBHOOK_TOKEN;
  const supplied = new URL(request.url).searchParams.get("token") || request.headers.get("x-webhook-token");
  if (!configured || supplied !== configured) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  const body = await request.json() as MailjetEvent | MailjetEvent[];
  const events = Array.isArray(body) ? body : [body];
  const admin = createAdminClient();
  for (const event of events) {
    if (!event.CustomID) continue;
    const status = event.event === "sent" ? "sent" : event.event === "open" ? "read" : event.event === "bounce" || event.event === "blocked" || event.event === "spam" ? "failed" : event.event === "click" ? "delivered" : "delivered";
    await Promise.all([
      admin.from("notification_deliveries").update({ status, provider_message_id: event.MessageID ? String(event.MessageID) : undefined, delivered_at: ["delivered", "read"].includes(status) ? new Date().toISOString() : undefined, error: status === "failed" ? event.error || event.event : null }).eq("id", event.CustomID),
      admin.from("certificates").update({ email_status: status === "failed" ? "failed" : "sent", email_message_id: event.MessageID ? String(event.MessageID) : undefined, email_error: status === "failed" ? event.error || event.event : null }).eq("id", event.CustomID),
      admin.from("participant_invitations").update({ email_delivery_status: status === "failed" ? "failed" : "sent", email_delivery_error: status === "failed" ? event.error || event.event : null }).eq("id", event.CustomID),
    ]);
  }
  return NextResponse.json({ processed: events.length });
}
