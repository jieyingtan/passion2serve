import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  if (query.get("hub.mode") === "subscribe" && query.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN) return new Response(query.get("hub.challenge") || "", { status: 200 });
  return new Response("Verification failed", { status: 403 });
}

export async function POST(request: Request) {
  const payload = await request.json() as { entry?: Array<{ changes?: Array<{ value?: { statuses?: Array<{ id?: string; status?: string; timestamp?: string; errors?: Array<{ title?: string }> }> } }> }> };
  const statuses = payload.entry?.flatMap((entry) => entry.changes?.flatMap((change) => change.value?.statuses ?? []) ?? []) ?? [];
  const admin = createAdminClient();
  for (const update of statuses) {
    if (!update.id) continue;
    const status = update.status === "read" ? "read" : update.status === "delivered" ? "delivered" : update.status === "failed" ? "failed" : "sent";
    await admin.from("notification_deliveries").update({ status, delivered_at: ["delivered", "read"].includes(status) ? new Date().toISOString() : undefined, error: update.errors?.[0]?.title || null }).eq("provider_message_id", update.id);
  }
  return NextResponse.json({ received: true });
}
