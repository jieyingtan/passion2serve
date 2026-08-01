"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Archive,
  Award,
  BarChart3,
  Bell,
  CalendarDays,
  CalendarClock,
  ClipboardCheck,
  Compass,
  LayoutDashboard,
  LogOut,
  Menu,
  MessagesSquare,
  PlusCircle,
  QrCode,
  Radio,
  UserRound,
} from "lucide-react";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigationIcons = {
  archive: Archive,
  award: Award,
  analytics: BarChart3,
  calendar: CalendarDays,
  closure: ClipboardCheck,
  compass: Compass,
  dashboard: LayoutDashboard,
  create: PlusCircle,
  pass: QrCode,
  profile: UserRound,
  ongoing: Radio,
  upcoming: CalendarClock,
  integrations: MessagesSquare,
};

export interface NavigationItem {
  href: string;
  label: string;
  icon: keyof typeof navigationIcons;
}

interface AppShellProps {
  children: React.ReactNode;
  navigation: NavigationItem[];
  roleLabel: string;
  userName: string;
}

export function AppShell({ children, navigation, roleLabel, userName }: AppShellProps) {
  const pathname = usePathname();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  return (
    <div className="min-h-screen bg-muted/35">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r bg-background px-5 py-6 lg:flex lg:flex-col">
        <Brand />
        <div className="mt-8 rounded-xl bg-accent px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workspace</p>
          <p className="mt-1 font-semibold">{roleLabel}</p>
        </div>
        <nav aria-label={`${roleLabel} navigation`} className="mt-6 flex-1 space-y-1">
          {navigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = navigationIcons[item.icon];
            return (
              <Link
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                )}
                href={item.href}
                key={item.href}
              >
                <Icon aria-hidden="true" className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form action="/auth/signout" method="post">
          <Button className="w-full justify-start" type="submit" variant="ghost">
            <LogOut aria-hidden="true" className="size-4" />
            Sign out
          </Button>
        </form>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <Button
              aria-expanded={mobileNavigationOpen}
              aria-label="Open navigation"
              onClick={() => setMobileNavigationOpen((open) => !open)}
              size="icon"
              variant="ghost"
            >
              <Menu className="size-5" />
            </Button>
            <Brand compact />
          </div>
          <div className="hidden lg:block">
            <p className="text-sm text-muted-foreground">Welcome back,</p>
            <p className="font-semibold">{userName}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button aria-label="Notifications" size="icon" variant="ghost">
              <Bell className="size-5" />
            </Button>
            <div className="grid size-9 place-items-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
              {userName
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </div>
          </div>
          {mobileNavigationOpen && (
            <div className="absolute inset-x-0 top-16 border-b bg-background p-4 shadow-soft lg:hidden">
              <div className="mb-3 rounded-lg bg-accent px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{roleLabel} workspace</p>
              </div>
              <nav aria-label={`${roleLabel} mobile navigation`} className="space-y-1">
                {navigation.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = navigationIcons[item.icon];
                  return (
                    <Link
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground",
                        active && "bg-primary text-primary-foreground",
                      )}
                      href={item.href}
                      key={item.href}
                      onClick={() => setMobileNavigationOpen(false)}
                    >
                      <Icon aria-hidden="true" className="size-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <form action="/auth/signout" className="mt-2 border-t pt-2" method="post">
                <Button className="w-full justify-start" type="submit" variant="ghost">
                  <LogOut aria-hidden="true" className="size-4" /> Sign out
                </Button>
              </form>
            </div>
          )}
        </header>
        <main className="px-4 py-8 sm:px-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
