import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWhatsAppWebhookSignature } from "@/lib/whatsapp/client";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  if (!process.env.WHATSAPP_VERIFY_TOKEN) return new Response("Webhook verification is not configured", { status: 503 });
  if (query.get("hub.mode") === "subscribe" && query.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN) return new Response(query.get("hub.challenge") || "", { status: 200 });
  return new Response("Verification failed", { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!process.env.WHATSAPP_APP_SECRET) return NextResponse.json({ error: "Webhook signatures are not configured." }, { status: 503 });
  if (!verifyWhatsAppWebhookSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }
  let payload: { entry?: Array<{ changes?: Array<{ value?: { statuses?: Array<{ id?: string; status?: string; timestamp?: string; errors?: Array<{ title?: string }> }> } }> }> };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }
  const statuses = payload.entry?.flatMap((entry) => entry.changes?.flatMap((change) => change.value?.statuses ?? []) ?? []) ?? [];
  const admin = createAdminClient();
  for (const update of statuses) {
    if (!update.id) continue;
    const status = update.status === "read" ? "read" : update.status === "delivered" ? "delivered" : update.status === "failed" ? "failed" : "sent";
    const eventTime = update.timestamp ? new Date(Number(update.timestamp) * 1000).toISOString() : new Date().toISOString();
    await admin.from("notification_deliveries").update({ status, delivered_at: ["delivered", "read"].includes(status) ? eventTime : undefined, error: update.errors?.[0]?.title || null }).eq("provider_message_id", update.id);
  }
  return NextResponse.json({ received: true });
}
