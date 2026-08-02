import Link from "next/link";
import { CalendarCheck, CheckCircle2, Download, QrCode, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { getTranslations, formatDate } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/server/auth";

import { ProfileForm } from "./profile-form";

export default async function ParticipantProfilePage() {
  const profile = await getCurrentProfile();
  const lang = profile?.preferredLanguage ?? "en";
  const t = getTranslations(lang);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    { data: dbProfile },
    { count: upcomingCount },
    { count: attendanceCount },
    { data: recentAttendance },
    { data: certificates },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,email,phone,preferred_language,email_consent,whatsapp_consent,publicity_consent,beneficiary_organisations(name)")
      .eq("id", user.id)
      .single(),
    supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("participant_id", user.id)
      .in("status", ["registered", "confirmed", "waitlisted"]),
    supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("participant_id", user.id),
    supabase
      .from("attendance")
      .select("id,scanned_at,events(name,starts_at)")
      .eq("participant_id", user.id)
      .order("scanned_at", { ascending: false })
      .limit(5),
    supabase
      .from("certificates")
      .select("id,certificate_number,storage_path,issued_at,events(name)")
      .eq("participant_id", user.id)
      .order("issued_at", { ascending: false }),
  ]);

  if (!dbProfile) return null;
  const organisation = Array.isArray(dbProfile.beneficiary_organisations)
    ? dbProfile.beneficiary_organisations[0]
    : dbProfile.beneficiary_organisations;

  const admin = createAdminClient();
  const certificateLinks = await Promise.all(
    (certificates ?? []).map(async (certificate) => {
      const { data } = await admin.storage
        .from("certificates-private")
        .createSignedUrl(certificate.storage_path, 600);
      return { ...certificate, url: data?.signedUrl ?? null };
    }),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 sm:space-y-7">
      <PageHeader eyebrow={<span className="inline-flex items-center gap-2"><UserRound className="size-4" />Participant account</span>} title={t.profile.title} description={t.profile.subtitle} />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { Icon: CalendarCheck, label: t.profile.upcomingRegistrations, value: upcomingCount ?? 0 },
          { Icon: CheckCircle2, label: t.profile.eventsAttended, value: attendanceCount ?? 0 },
          { Icon: QrCode, label: t.profile.membershipPass, value: t.profile.active },
        ].map(({ Icon, label, value }) => (
          <Card className="border-0" key={label}>
            <CardContent className="p-5">
              <Icon className="size-5 text-primary" />
              <p className="mt-3 text-sm font-bold text-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card className="border-0">
          <CardHeader className="rounded-t-xl bg-accent/70">
            <CardTitle className="text-xl font-black">{t.profile.personalDetails}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ProfileForm
              profile={{
                fullName: dbProfile.full_name,
                email: dbProfile.email,
                phone: dbProfile.phone ?? "",
                preferredLanguage: dbProfile.preferred_language,
                emailConsent: dbProfile.email_consent,
                whatsappConsent: dbProfile.whatsapp_consent,
                publicityConsent: dbProfile.publicity_consent,
              }}
              t={t}
            />
          </CardContent>
        </Card>
        <Card className="h-fit border-0">
          <CardHeader className="rounded-t-xl bg-accent/70"><CardTitle className="text-xl font-black">{t.profile.yourOrganisation}</CardTitle></CardHeader>
          <CardContent className="pt-6">
            <p className="mt-2 text-sm text-muted-foreground">
              {organisation?.name ?? t.profile.notLinked}
            </p>
            <Button asChild className="mt-5" variant="outline">
              <Link href="/participant/pass">{t.profile.openQr}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      <Card className="border-0">
        <CardHeader className="rounded-t-xl bg-accent/70">
          <CardTitle className="text-xl font-black">{t.profile.attendanceConfirmations}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {recentAttendance?.length ? (
            <div className="space-y-3">
              {recentAttendance.map((record) => {
                const event = Array.isArray(record.events) ? record.events[0] : record.events;
                return (
                  <div
                    className="flex flex-col justify-between gap-2 rounded-xl border p-4 sm:flex-row sm:items-center"
                    key={record.id}
                  >
                    <div>
                      <strong>{event?.name ?? "Completed event"}</strong>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t.profile.attendanceRecorded} {formatDate(record.scanned_at, lang)}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                      <CheckCircle2 className="size-4" />
                      {t.profile.confirmed}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t.profile.noAttendance}</p>
          )}
        </CardContent>
      </Card>
      <Card className="border-0">
        <CardHeader className="rounded-t-xl bg-accent/70">
          <CardTitle className="text-xl font-black">{t.profile.certificates}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {certificateLinks.length ? (
            <div className="space-y-3">
              {certificateLinks.map((certificate) => {
                const event = Array.isArray(certificate.events)
                  ? certificate.events[0]
                  : certificate.events;
                return (
                  <div
                    className="flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"
                    key={certificate.id}
                  >
                    <div>
                      <strong>{event?.name ?? "Completed event"}</strong>
                      <p className="text-sm text-muted-foreground">{certificate.certificate_number}</p>
                    </div>
                    {certificate.url && (
                      <Button asChild size="sm" variant="outline">
                        <a href={certificate.url}>
                          <Download className="size-4" />
                          {t.profile.download}
                        </a>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t.profile.noCertificates}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
