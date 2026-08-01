import { NextResponse } from "next/server";
import { z } from "zod";

import { isQrConfigured } from "@/lib/config";
import { verifyMembershipToken } from "@/lib/qr/token";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { processAttendanceFollowUp } from "@/server/follow-up/attendance";

const scanSchema = z.object({
  eventId: z.string().uuid(),
  token: z.string().min(40).max(4096),
});

export async function POST(request: Request) {
  if (!isQrConfigured()) {
    return NextResponse.json({ error: "Attendance scanning is not configured." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = scanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid event and membership QR are required." }, { status: 400 });
  }

  let payload;
  try {
    payload = verifyMembershipToken(parsed.data.token);
  } catch {
    return NextResponse.json({ error: "This membership QR is invalid." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "coordinator") {
    return NextResponse.json({ error: "Coordinator access required." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: pass } = await admin
    .from("membership_passes")
    .select("id, participant_id, token_version, status")
    .eq("id", payload.passId)
    .eq("participant_id", payload.participantId)
    .maybeSingle();

  if (
    !pass ||
    pass.status !== "active" ||
    pass.token_version !== payload.tokenVersion
  ) {
    return NextResponse.json({ error: "This membership pass has expired or been revoked." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("record_attendance", {
    target_event_id: parsed.data.eventId,
    target_participant_id: payload.participantId,
    attendance_source: "qr",
  });

  if (error) {
    const forbidden = error.message.toLowerCase().includes("not authorised");
    return NextResponse.json(
      { error: error.message || "Attendance could not be recorded." },
      { status: forbidden ? 403 : 400 },
    );
  }

  let followUp: Awaited<ReturnType<typeof processAttendanceFollowUp>> | { error: string };
  try {
    followUp = await processAttendanceFollowUp({ eventId: parsed.data.eventId, participantId: payload.participantId });
  } catch (error) {
    followUp = { error: error instanceof Error ? error.message : "Automated follow-up could not be completed." };
  }
  return NextResponse.json({ ...(data as Record<string, unknown>), followUp }, { status: 200 });
}
