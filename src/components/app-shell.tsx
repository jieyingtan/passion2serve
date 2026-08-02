"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Archive,
  Award,
  BarChart3,
  CalendarDays,
  CalendarClock,
  ClipboardCheck,
  Compass,
  LayoutDashboard,
  LogOut,
  Menu,
  MessagesSquare,
  MoreHorizontal,
  PlusCircle,
  QrCode,
  Radio,
  UserRound,
  X,
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
  shortLabel?: string;
  icon: keyof typeof navigationIcons;
}

interface AppShellProps {
  children: React.ReactNode;
  navigation: NavigationItem[];
  roleLabel: string;
  userName: string;
  profileHref: string;
  sidebarSlot?: React.ReactNode;
}

export function AppShell({ children, navigation, profileHref, roleLabel, sidebarSlot, userName }: AppShellProps) {
  const pathname = usePathname();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const bottomNavigation = navigation.slice(0, 4);

  useEffect(() => {
    setMobileNavigationOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavigationOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavigationOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileNavigationOpen]);

  return (
    <div className="min-h-screen bg-muted/35">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r bg-background px-5 py-6 lg:flex lg:flex-col">
        <Brand />
        <div className="mt-8 rounded-xl bg-accent px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workspace</p>
          <p className="mt-1 font-semibold">{roleLabel}</p>
        </div>
        {sidebarSlot}
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

      <div className="min-w-0 lg:pl-72">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/95 px-3 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <Button
              aria-controls="mobile-navigation"
              aria-expanded={mobileNavigationOpen}
              aria-label={mobileNavigationOpen ? "Close navigation" : "Open navigation"}
              onClick={() => setMobileNavigationOpen((open) => !open)}
              size="icon"
              variant="ghost"
            >
              {mobileNavigationOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
            <Brand compact />
            <span className="hidden text-sm font-semibold text-muted-foreground min-[390px]:block sm:text-base">{roleLabel}</span>
          </div>
          <div className="hidden lg:block">
            <p className="text-sm text-muted-foreground">Welcome back,</p>
            <p className="font-semibold">{userName}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden max-w-40 truncate text-sm font-semibold sm:block lg:hidden">{userName}</span>
            <Link aria-label="Open profile" className="grid size-10 place-items-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground shadow-sm transition-all hover:scale-105 hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={profileHref} title="Open profile">
              {userName
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </Link>
          </div>
        </header>
        <main className="min-w-0 px-4 py-6 pb-24 sm:px-6 sm:py-8 sm:pb-8 lg:px-10">{children}</main>
      </div>

      <button
        aria-label="Close navigation"
        className={cn(
          "fixed inset-0 z-40 bg-foreground/30 backdrop-blur-[1px] transition-opacity lg:hidden",
          mobileNavigationOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setMobileNavigationOpen(false)}
        type="button"
      />
      <aside
        aria-hidden={!mobileNavigationOpen}
        aria-label={`${roleLabel} navigation menu`}
        aria-modal={mobileNavigationOpen || undefined}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(22rem,calc(100vw-3rem))] flex-col border-r bg-background shadow-2xl transition-transform duration-200 lg:hidden",
          mobileNavigationOpen ? "translate-x-0" : "-translate-x-full",
        )}
        id="mobile-navigation"
        inert={!mobileNavigationOpen}
        role="dialog"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
          <Brand />
          <Button aria-label="Close navigation" onClick={() => setMobileNavigationOpen(false)} size="icon" variant="ghost">
            <X className="size-5" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5">
          <div className="rounded-xl bg-accent px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workspace</p>
            <p className="mt-1 font-semibold">{roleLabel}</p>
          </div>
          {sidebarSlot}
          <nav aria-label={`${roleLabel} mobile navigation`} className="mt-5 space-y-1">
            {navigation.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = navigationIcons[item.icon];
              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                    active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  )}
                  href={item.href}
                  key={item.href}
                >
                  <Icon aria-hidden="true" className="size-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <form action="/auth/signout" className="shrink-0 border-t p-4" method="post">
          <Button className="h-11 w-full justify-start" type="submit" variant="ghost">
            <LogOut aria-hidden="true" className="size-5" /> Sign out
          </Button>
        </form>
      </aside>

      <nav aria-label={`${roleLabel} quick navigation`} className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background/95 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-8px_24px_rgba(18,64,58,0.08)] backdrop-blur sm:hidden">
        {bottomNavigation.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = navigationIcons[item.icon];
          return (
            <Link aria-current={active ? "page" : undefined} className={cn("flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-semibold text-muted-foreground", active && "bg-accent text-primary")} href={item.href} key={item.href}>
              <Icon aria-hidden="true" className="size-5" />
              <span className="max-w-full truncate">{item.shortLabel ?? item.label}</span>
            </Link>
          );
        })}
        <button aria-expanded={mobileNavigationOpen} className={cn("flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-semibold text-muted-foreground", mobileNavigationOpen && "bg-accent text-primary")} onClick={() => setMobileNavigationOpen(true)} type="button">
          <MoreHorizontal aria-hidden="true" className="size-5" />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
