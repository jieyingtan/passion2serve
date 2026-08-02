import Image from "next/image";
import { Check, QrCode, Smartphone } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { getTranslations } from "@/lib/i18n";
import { isQrConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/server/auth";
import { WalletAction } from "./wallet-action";

function WalletIcon({ provider }: { provider: "apple" | "google" }) {
  if (provider === "apple") {
    return <span className="relative block size-12 shrink-0 overflow-hidden rounded-lg bg-[#f0eee3] shadow-inner"><span className="absolute inset-x-1 top-1 h-2 rounded bg-[#36a8e0]"/><span className="absolute inset-x-1 top-3 h-2 rounded bg-[#f6bd18]"/><span className="absolute inset-x-1 top-5 h-2 rounded bg-[#34b97a]"/><span className="absolute inset-x-1 top-7 h-2 rounded bg-[#ef6258]"/></span>;
  }
  return <span className="relative block size-12 shrink-0"><span className="absolute left-1 top-2 h-8 w-10 rotate-[-7deg] rounded-xl bg-[#b8ecd0]"/><span className="absolute left-1 top-3 h-8 w-10 rotate-[5deg] rounded-xl bg-[#ffe5a5]"/><span className="absolute left-1 top-4 h-8 w-10 rotate-[-2deg] rounded-xl bg-[#f5bfc0]"/><span className="absolute left-1 top-5 h-8 w-10 rounded-xl bg-[#b8d1ff] [clip-path:polygon(0_20%,100%_0,100%_100%,0_100%)]"/></span>;
}

function WalletBadge({ href, provider, label }: { href?: string | null; provider: "apple" | "google"; label: string }) {
  const classes = "flex h-[72px] w-full max-w-[310px] items-center gap-4 rounded-2xl px-5 text-left text-white shadow-sm transition sm:w-[310px]";
  const content = <><WalletIcon provider={provider}/><span className="leading-none"><span className="block text-lg font-medium">Add to</span><span className="mt-1 block text-2xl font-semibold tracking-tight">{label}</span></span></>;
  return href ? <a aria-label={`Add to ${label}`} className={`${classes} bg-black hover:-translate-y-0.5 hover:bg-black/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`} href={href}>{content}</a> : <span aria-disabled="true" className={`${classes} cursor-not-allowed bg-neutral-400 opacity-70`}>{content}</span>;
}

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
        .select("apple_storage_path, google_save_url")
        .eq("participant_id", profile.id)
        .maybeSingle()
    : { data: null };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Participant membership" title={t.pass.title} description={t.pass.subtitle} />
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
              <h2 className="rounded-xl bg-accent/70 px-4 py-3 text-xl font-black">{t.pass.alwaysReady}</h2>
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
              <div className="mt-7 grid justify-items-start gap-3">
                <WalletBadge href={pass?.apple_storage_path ? "/api/membership-pass/apple" : null} label="Apple Wallet" provider="apple" />
                <WalletBadge href={pass?.google_save_url} label="Google Wallet" provider="google" />
              </div>
              {(!pass?.apple_storage_path || !pass?.google_save_url) && <WalletAction t={t} />}
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
