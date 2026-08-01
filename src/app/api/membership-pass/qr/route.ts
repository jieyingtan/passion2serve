import QRCode from "qrcode";

import { isQrConfigured } from "@/lib/config";
import { signMembershipToken } from "@/lib/qr/token";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isQrConfigured()) {
    return new Response("Membership QR is not configured.", { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Authentication required.", { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "participant") {
    return new Response("Participant access required.", { status: 403 });
  }

  const admin = createAdminClient();
  let { data: pass } = await admin
    .from("membership_passes")
    .select("id, participant_id, token_version, status")
    .eq("participant_id", user.id)
    .maybeSingle();

  if (!pass) {
    const { data: createdPass, error } = await admin
      .from("membership_passes")
      .insert({ participant_id: user.id })
      .select("id, participant_id, token_version, status")
      .single();

    if (error) {
      const { data: concurrentPass } = await admin
        .from("membership_passes")
        .select("id, participant_id, token_version, status")
        .eq("participant_id", user.id)
        .maybeSingle();
      pass = concurrentPass;
    } else {
      pass = createdPass;
    }
  }

  if (!pass || pass.status !== "active") {
    return new Response("The membership pass is unavailable.", { status: 404 });
  }

  const token = signMembershipToken({
    v: 1,
    passId: pass.id,
    participantId: pass.participant_id,
    tokenVersion: pass.token_version,
  });
  const svg = await QRCode.toString(token, {
    type: "svg",
    errorCorrectionLevel: "M",
    // Four modules is the QR standard quiet zone and materially improves
    // camera recognition when the pass is displayed on a bright phone screen.
    margin: 4,
    color: { dark: "#000000", light: "#ffffff" },
  });

  return new Response(svg, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      "Content-Type": "image/svg+xml; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
