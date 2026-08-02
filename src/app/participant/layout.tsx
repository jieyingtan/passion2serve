import { AppShell, type NavigationItem } from "@/components/app-shell";
import { LangCookie } from "@/components/lang-cookie";
import { LocaleSwitch } from "@/components/locale-switch";
import { getTranslations } from "@/lib/i18n";
import { getCurrentProfile } from "@/server/auth";

export default async function ParticipantLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  const lang = profile?.preferredLanguage ?? "en";
  const t = getTranslations(lang);
  const shortLabels = {
    en: { profile: "Profile", discover: "Discover", calendar: "Calendar", pass: "Pass", progress: "Progress" },
    zh: { profile: "资料", discover: "探索", calendar: "日历", pass: "通行证", progress: "进度" },
    ms: { profile: "Profil", discover: "Acara", calendar: "Kalendar", pass: "Pas", progress: "Kemajuan" },
    ta: { profile: "சுயவிவரம்", discover: "தேடல்", calendar: "நாட்காட்டி", pass: "அட்டை", progress: "வளர்ச்சி" },
  }[lang];
  const navigation: NavigationItem[] = [
    { href: "/participant/profile", label: t.nav.profile, shortLabel: shortLabels.profile, icon: "profile" },
    { href: "/participant/pass", label: t.nav.pass, shortLabel: shortLabels.pass, icon: "pass" },
    { href: "/participant/progress", label: t.nav.progress, shortLabel: shortLabels.progress, icon: "award" },
    { href: "/participant/events", label: t.nav.discover, shortLabel: shortLabels.discover, icon: "compass" },
    { href: "/participant/calendar", label: t.nav.calendar, shortLabel: shortLabels.calendar, icon: "calendar" },
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
