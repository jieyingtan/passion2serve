import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { decodeApplePass } from "@/lib/walletwallet/apple-pass";
import {
  CURRENT_WALLET_PASS_FORMAT_SINCE,
  issueAndEmailMembershipPass,
} from "@/server/participants/wallet";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to download your Apple Wallet pass." }, { status: 401 });
  }

  let { data: pass, error } = await supabase
    .from("membership_passes")
    .select("apple_storage_path, status, last_synced_at")
    .eq("participant_id", user.id)
    .maybeSingle();

  if (error || !pass?.apple_storage_path || pass.status !== "active") {
    return NextResponse.json({ error: "Your Apple Wallet pass is not ready." }, { status: 404 });
  }

  const passNeedsArtworkRefresh =
    !pass.last_synced_at ||
    new Date(pass.last_synced_at).getTime() < new Date(CURRENT_WALLET_PASS_FORMAT_SINCE).getTime();

  if (passNeedsArtworkRefresh) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "participant") {
      return NextResponse.json({ error: "Participant access required." }, { status: 403 });
    }

    try {
      await issueAndEmailMembershipPass({
        participantId: user.id,
        fullName: profile.full_name,
        email: profile.email,
        forceReissue: true,
        sendReadyEmail: false,
      });
    } catch {
      return NextResponse.json(
        { error: "Your Apple Wallet pass could not be refreshed. Please try again." },
        { status: 502 },
      );
    }

    const refreshed = await supabase
      .from("membership_passes")
      .select("apple_storage_path, status, last_synced_at")
      .eq("participant_id", user.id)
      .maybeSingle();
    pass = refreshed.data;
    error = refreshed.error;

    if (error || !pass?.apple_storage_path || pass.status !== "active") {
      return NextResponse.json({ error: "Your refreshed Apple Wallet pass is not ready." }, { status: 502 });
    }
  }

  let passBytes: Uint8Array;
  try {
    passBytes = decodeApplePass(pass.apple_storage_path);
  } catch {
    return NextResponse.json({ error: "The Apple Wallet pass data is invalid. Prepare the pass again." }, { status: 422 });
  }

  const responseBody = new ArrayBuffer(passBytes.byteLength);
  new Uint8Array(responseBody).set(passBytes);

  return new NextResponse(responseBody, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": 'attachment; filename="Passion2Serve.pkpass"',
      "Content-Length": String(passBytes.byteLength),
      "Content-Type": "application/vnd.apple.pkpass",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
