import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEventNotice } from "@/server/follow-up/delivery";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  const now = new Date();
  const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const admin = createAdminClient();
  const { data: registrations, error } = await admin.from("registrations").select("participant_id,event_id,events!inner(starts_at,status)").in("status", ["registered", "confirmed"]).gte("events.starts_at", now.toISOString()).lte("events.starts_at", end.toISOString()).eq("events.status", "upcoming");
  if (error) return NextResponse.json({ error: "Reminder recipients could not be loaded." }, { status: 500 });
  let processed = 0;
  for (const registration of registrations ?? []) {
    await sendEventNotice({ participantId: registration.participant_id, eventId: registration.event_id, type: "event_reminder" });
    processed += 1;
  }
  return NextResponse.json({ processed });
}
