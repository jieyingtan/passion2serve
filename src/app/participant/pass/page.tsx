import Image from "next/image";
import { Check, Download, QrCode, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getTranslations } from "@/lib/i18n";
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
  const lang = profile?.preferredLanguage ?? "en";
  const t = getTranslations(lang);
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
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.pass.title}</h1>
      <p className="mt-2 text-muted-foreground">{t.pass.subtitle}</p>
      {query.activated === "1" && (
        <p className="mt-5 rounded-xl bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-800" role="status">
          {t.pass.signupSuccess} {query.wallet === "pending" ? t.pass.walletPending : t.pass.walletSent}
        </p>
      )}
      <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card className="overflow-hidden border-0 bg-primary text-primary-foreground">
          <CardContent className="p-5 sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/70">Passion2Serve</p>
                <p className="mt-1 text-xl font-bold">{t.pass.communityMember}</p>
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
                {qrConfigured ? t.pass.securePass : t.pass.demoPass}
              </p>
            </div>
            <div className="mt-6 flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-primary-foreground/65">{t.pass.member}</p>
                <p className="mt-1 font-bold">{memberName}</p>
              </div>
              <p className="text-xs text-primary-foreground/65">{t.pass.valid}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="border-0">
            <CardContent className="p-5 sm:p-7">
              <h2 className="text-xl font-bold">{t.pass.alwaysReady}</h2>
              <p className="mt-2 leading-7 text-muted-foreground">
                {t.pass.alwaysReadyDesc}
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {[t.pass.feature1, t.pass.feature2, t.pass.feature3].map((item) => (
                  <li className="flex items-center gap-3" key={item}>
                    <span className="grid size-6 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="size-3.5" /></span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-7 grid gap-3 sm:flex sm:flex-wrap">
                {pass?.share_url ? (
                  <Button asChild className="w-full sm:w-auto">
                    <a href={pass.share_url} rel="noreferrer" target="_blank"><Download className="size-4" /> {t.pass.addAppleWallet}</a>
                  </Button>
                ) : (
                  <Button className="w-full sm:w-auto" disabled><Download className="size-4" /> {t.pass.addAppleWallet}</Button>
                )}
                {pass?.google_save_url ? (
                  <Button asChild className="w-full sm:w-auto" variant="outline">
                    <a href={pass.google_save_url} rel="noreferrer" target="_blank"><Download className="size-4" /> {t.pass.addGoogleWallet}</a>
                  </Button>
                ) : (
                  <Button className="w-full sm:w-auto" disabled variant="outline"><Download className="size-4" /> {t.pass.addGoogleWallet}</Button>
                )}
              </div>
              {!pass?.share_url && !pass?.google_save_url && <WalletAction t={t} />}
            </CardContent>
          </Card>
          <p className="px-2 text-xs leading-5 text-muted-foreground">
            {qrConfigured
              ? t.pass.securityNotice
              : t.pass.demoNotice}
          </p>
        </div>
      </div>
    </div>
  );
}
