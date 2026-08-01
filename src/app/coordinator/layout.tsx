import { AppShell, type NavigationItem } from "@/components/app-shell";
import { getCurrentProfile } from "@/server/auth";

const navigation: NavigationItem[] = [
  { href: "/coordinator/dashboard", label: "Event dashboard", shortLabel: "Dashboard", icon: "dashboard" },
  { href: "/coordinator/events/new", label: "Create event", shortLabel: "Create", icon: "create" },
  { href: "/coordinator/events/ongoing", label: "Ongoing", icon: "ongoing" },
  { href: "/coordinator/events/upcoming", label: "Upcoming", icon: "upcoming" },
  { href: "/coordinator/events/awaiting-closure", label: "Awaiting closure", icon: "closure" },
  { href: "/coordinator/events/archived", label: "Archived", icon: "archive" },
  { href: "/coordinator/calendar", label: "Calendar", icon: "calendar" },
  { href: "/coordinator/analytics", label: "Impact analytics", icon: "analytics" },
  { href: "/coordinator/integrations", label: "Messaging setup", icon: "integrations" },
];

export default async function CoordinatorLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  return (
    <AppShell navigation={navigation} profileHref="/coordinator/profile" roleLabel="Coordinator" userName={profile?.fullName ?? "Jamie Tan"}>
      {children}
    </AppShell>
  );
}
