import { AppShell, type NavigationItem } from "@/components/app-shell";
import { LangCookie } from "@/components/lang-cookie";
import { LocaleSwitch } from "@/components/locale-switch";
import { getTranslations } from "@/lib/i18n";
import { getCurrentProfile } from "@/server/auth";

export default async function ParticipantLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  const lang = profile?.preferredLanguage ?? "en";
  const t = getTranslations(lang);
  const navigation: NavigationItem[] = [
    { href: "/participant/events", label: t.nav.discover, icon: "compass" },
    { href: "/participant/calendar", label: t.nav.calendar, icon: "calendar" },
    { href: "/participant/pass", label: t.nav.pass, icon: "pass" },
    { href: "/participant/progress", label: t.nav.progress, icon: "award" },
    { href: "/participant/profile", label: t.nav.profile, icon: "profile" },
  ];

  return (
    <>
      <LangCookie lang={lang} />
      <AppShell navigation={navigation} profileHref="/participant/profile" roleLabel={t.nav.participant} sidebarSlot={<LocaleSwitch currentLang={lang} />} userName={profile?.fullName ?? "Aisha Rahman"}>
        {children}
      </AppShell>
    </>
  );
}
