import Image from "next/image";
import { Check, Download, QrCode, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isQrConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/server/auth";
import { WalletAction } from "./wallet-action";

export default async function ParticipantPassPage({
  searchParams,
}: {
  searchParams: Promise<{ activated?: string; wallet?: string }>;
}) {
  const query = await searchParams;
  const profile = await getCurrentProfile();
  const qrConfigured = isQrConfigured();
  const memberName = profile?.fullName ?? "Aisha Rahman";
  const supabase = await createClient();
  const { data: pass } = profile
    ? await supabase
        .from("membership_passes")
        .select("share_url, google_save_url")
        .eq("participant_id", profile.id)
        .maybeSingle()
    : { data: null };

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-bold tracking-tight">Membership pass</h1>
      <p className="mt-2 text-muted-foreground">Your QR remains available here even if you do not add it to a mobile wallet.</p>
      {query.activated === "1" && (
        <p className="mt-5 rounded-xl bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-800" role="status">
          Account created successfully. {query.wallet === "pending" ? "Your wallet email is queued until the email and wallet providers are configured." : "Your wallet pass has been emailed to you."}
        </p>
      )}
      <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card className="overflow-hidden border-0 bg-primary text-primary-foreground">
          <CardContent className="p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/70">Passion2Serve</p>
                <p className="mt-1 text-xl font-bold">Community Member</p>
              </div>
              <Smartphone className="size-7" />
            </div>
            <div className="mt-9 rounded-2xl bg-white p-5 text-foreground">
              <div className="grid aspect-square place-items-center rounded-xl border-2 border-dashed bg-muted">
                {qrConfigured ? (
                  <Image
                    alt="Membership QR code"
                    className="size-full rounded-lg"
                    height={320}
                    priority
                    src="/api/membership-pass/qr"
                    unoptimized
                    width={320}
                  />
                ) : (
                  <QrCode aria-label="Membership QR placeholder" className="size-40 text-foreground" />
                )}
              </div>
              <p className="mt-4 text-center text-xs font-semibold text-muted-foreground">
                {qrConfigured ? "Secure in-app membership pass" : "P2S · DEMO MEMBER · A8R4K2"}
              </p>
            </div>
            <div className="mt-6 flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-primary-foreground/65">Member</p>
                <p className="mt-1 font-bold">{memberName}</p>
              </div>
              <p className="text-xs text-primary-foreground/65">Valid</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="border-0">
            <CardContent className="p-7">
              <h2 className="text-xl font-bold">Always ready in your profile</h2>
              <p className="mt-2 leading-7 text-muted-foreground">
                Present this QR after an event. Adding it to Apple Wallet or Google Wallet is optional and does not affect attendance.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {["Works from your signed-in profile", "Uses the same secure membership identity", "Can be revoked and reissued if needed"].map((item) => (
                  <li className="flex items-center gap-3" key={item}>
                    <span className="grid size-6 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="size-3.5" /></span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap gap-3">
                {pass?.share_url ? (
                  <Button asChild>
                    <a href={pass.share_url} rel="noreferrer" target="_blank"><Download className="size-4" /> Add to Apple Wallet</a>
                  </Button>
                ) : (
                  <Button disabled><Download className="size-4" /> Add to Apple Wallet</Button>
                )}
                {pass?.google_save_url ? (
                  <Button asChild variant="outline">
                    <a href={pass.google_save_url} rel="noreferrer" target="_blank"><Download className="size-4" /> Add to Google Wallet</a>
                  </Button>
                ) : (
                  <Button disabled variant="outline"><Download className="size-4" /> Add to Google Wallet</Button>
                )}
              </div>
              {!pass?.share_url&&!pass?.google_save_url&&<WalletAction/>}
            </CardContent>
          </Card>
          <p className="px-2 text-xs leading-5 text-muted-foreground">
            {qrConfigured
              ? "This QR is cryptographically signed and can be revoked without exposing your personal details."
              : "Demo preview: configure Supabase and QR_SIGNING_SECRET to activate the signed QR."}
          </p>
        </div>
      </div>
    </div>
  );
}
