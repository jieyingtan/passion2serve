"use client";

import Link from "next/link";
import {
  BarChart3,
  ArrowLeft,
  ArrowRight,
  Award,
  BadgeCheck,
  Camera,
  CalendarDays,
  Check,
  ClipboardList,
  Download,
  FileSpreadsheet,
  Gift,
  LayoutDashboard,
  Languages,
  Megaphone,
  QrCode,
  Search,
  Send,
  Sparkles,
  Trophy,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface GuideStep {
  description: string;
  icon: LucideIcon;
  outcome: string;
  preview: GuidePreview;
  tasks: string[];
  title: string;
}

interface GuidePreview {
  action: string;
  activeNav: string;
  items: { label: string; meta: string; status?: string }[];
  metrics?: { label: string; value: string }[];
  pageTitle: string;
  sectionTitle: string;
  variant?: "analytics" | "calendar" | "camera" | "certificate" | "form" | "matching" | "pass" | "pathway" | "publicity" | "rewards";
}

const guides = {
  coordinator: {
    audience: "For event coordinators",
    description: "See how an event moves from an idea to measurable community impact.",
    signInLabel: "Sign in as Coordinator",
    title: "Coordinator guided tour",
    steps: [
      {
        title: "See the full event pipeline",
        description: "The Event dashboard mirrors the real coordinator landing page: lifecycle counts, prioritised actions, and a compact delivery calendar.",
        icon: LayoutDashboard,
        tasks: ["Review Create, Ongoing, Upcoming, Awaiting Closure, and Archived counts", "Use the colour-coded mini calendar to spot delivery dates", "Open a prioritised action without searching across pages"],
        outcome: "You always know what needs to happen next.",
        preview: {
          activeNav: "Event dashboard",
          pageTitle: "Event workspace",
          sectionTitle: "Action required",
          action: "Create event",
          variant: "calendar",
          metrics: [{ label: "Needs attention", value: "3" }, { label: "Next event", value: "12 Aug" }, { label: "Awaiting closure", value: "2" }],
          items: [{ label: "Digital Skills Workshop", meta: "Review participant list", status: "Ongoing" }, { label: "Community Yoga", meta: "12 Aug · Tampines Hub", status: "Upcoming" }],
        },
      },
      {
        title: "Create the event",
        description: "The snapshot follows the real stepped event form, including programme selection and the AI matching preview.",
        icon: ClipboardList,
        tasks: ["Choose the event type, course, date, venue, and beneficiary", "Set volunteer and business targets", "Preview the capabilities the AI matcher will look for"],
        outcome: "A complete event plan is ready for outreach.",
        preview: {
          activeNav: "Create event",
          pageTitle: "Create a new event",
          sectionTitle: "1. Event details · 2. Programme and AI matching",
          action: "Create event",
          variant: "form",
          items: [{ label: "Event name", meta: "Digital Skills Workshop" }, { label: "Event type", meta: "Knowledge to Serve" }, { label: "Course", meta: "Computer Literacy" }, { label: "Beneficiary", meta: "Migrant Community Learning Hub" }, { label: "Date and time", meta: "18 August 2026 · 10:00 am" }, { label: "Venue", meta: "Skills Lab, Level 3" }],
        },
      },
      {
        title: "Match partners and import volunteers",
        description: "The Ongoing workspace starts with empty outreach lists, then uses AI to shortlist only relevant businesses and volunteers.",
        icon: UsersRound,
        tasks: ["Import Giving.sg or PTS volunteer registrations from Excel/CSV", "Generate the AI business and volunteer shortlist", "Track contacts from Awaiting response to Confirmed or Declined"],
        outcome: "Meeting the requirements moves the event to Upcoming.",
        preview: {
          activeNav: "Ongoing",
          pageTitle: "Digital Skills Workshop",
          sectionTitle: "AI-powered matching",
          action: "Generate AI shortlist",
          variant: "matching",
          metrics: [{ label: "Businesses", value: "2 / 2" }, { label: "Volunteers", value: "8 / 10" }, { label: "Participants", value: "24" }],
          items: [{ label: "TechForward Singapore", meta: "Computer facilities · Match 92%", status: "Awaiting response" }, { label: "Aisha Rahman", meta: "Computer literacy · Teaching · Match 89%", status: "Confirmed" }],
        },
      },
      {
        title: "Scan attendance with the camera",
        description: "The Upcoming event page provides the same scan-first attendance experience used during live delivery on laptop, iPad, or phone.",
        icon: Camera,
        tasks: ["Open the event from the delivery calendar", "Scan Apple Wallet, Google Wallet, or profile QR passes", "Track participant and volunteer attendance in real time"],
        outcome: "Attendance automatically flows into event closure.",
        preview: {
          activeNav: "Upcoming",
          pageTitle: "Event attendance",
          sectionTitle: "3. Scan participant attendance",
          action: "Scan with camera",
          variant: "camera",
          metrics: [{ label: "Present", value: "18" }, { label: "Registered", value: "24" }, { label: "Attendance", value: "75%" }],
          items: [{ label: "Jane Tan", meta: "Scanned at 10:42 am", status: "Recorded" }, { label: "Arjun Nair", meta: "Scanned at 10:45 am", status: "Recorded" }],
        },
      },
      {
        title: "Generate the publicity post",
        description: "Awaiting Closure uses verified attendance and outcomes to draft a publicity poster and social caption for coordinator review.",
        icon: Megaphone,
        tasks: ["Verify attendance totals flowed from camera scans", "Draft an AI publicity poster and caption", "Edit and approve the generated content before publishing"],
        outcome: "Closure content is created from verified event data.",
        preview: {
          activeNav: "Awaiting closure",
          pageTitle: "Awaiting closure",
          sectionTitle: "3. Prepare publicity content",
          action: "Draft AI publicity poster",
          variant: "publicity",
          metrics: [{ label: "Attendance", value: "22" }, { label: "Volunteer hours", value: "48" }, { label: "Feedback", value: "4.8 / 5" }],
          items: [{ label: "AI-generated caption", meta: "22 learners completed practical digital skills training.", status: "Editable" }, { label: "Approved event photo", meta: "Consent checked · Ready for poster", status: "Selected" }],
        },
      },
      {
        title: "Measure impact across events",
        description: "Impact Analytics brings archived attendance, beneficiary reach, volunteer participation, and partner participation rates into one reporting view.",
        icon: BarChart3,
        tasks: ["Filter analytics by date, event type, venue, or beneficiary", "Compare participant, volunteer, and partner participation rates", "Audit beneficiary outcomes and participant feedback"],
        outcome: "Coordinators can demonstrate impact with traceable data.",
        preview: {
          activeNav: "Impact analytics",
          pageTitle: "Impact analytics",
          sectionTitle: "Attendance and beneficiary impact",
          action: "Export report",
          variant: "analytics",
          metrics: [{ label: "Events delivered", value: "24" }, { label: "Participants reached", value: "486" }, { label: "Attendance rate", value: "87%" }],
          items: [{ label: "Knowledge to Serve", meta: "248 participants · 91% attendance", status: "+18%" }, { label: "Peace to Serve", meta: "156 participants · 84% attendance", status: "+9%" }],
        },
      },
    ] satisfies GuideStep[],
  },
  participant: {
    audience: "For community participants",
    description: "See how to discover an event, attend with your pass, and continue your learning journey.",
    signInLabel: "Sign in as Participant",
    title: "Participant guided tour",
    steps: [
      {
        title: "Set your profile and language",
        description: "My Profile follows the real protected-details layout, with English, Chinese, Malay, and Tamil available from the translation control.",
        icon: Languages,
        tasks: ["Review your name, email, phone number, and organisation", "Select your preferred interface language", "Use Edit details before changing protected information"],
        outcome: "Your account and preferred language apply across participant pages.",
        preview: {
          activeNav: "My profile",
          pageTitle: "My profile",
          sectionTitle: "Personal details and preferences",
          action: "Edit details",
          variant: "form",
          items: [{ label: "Full name", meta: "Jane Tan" }, { label: "Email address", meta: "jane@example.com" }, { label: "Phone number", meta: "+65 8457 8898" }, { label: "Preferred language", meta: "English · 中文 · Melayu · தமிழ்" }],
        },
      },
      {
        title: "Discover and register",
        description: "Discover Events separates invitations from open events and checks course prerequisites before allowing registration.",
        icon: Search,
        tasks: ["Confirm registration for invited events", "Browse other available events", "Register only when completed courses meet the prerequisites"],
        outcome: "Confirmed events are added to your personal schedule.",
        preview: {
          activeNav: "Discover events",
          pageTitle: "Discover events",
          sectionTitle: "Invited events",
          action: "Browse all events",
          items: [{ label: "Digital Skills Workshop", meta: "18 Aug · 10:00 am · Skills Lab", status: "Confirm registration" }, { label: "Wellness Morning", meta: "24 Aug · 9:00 am · Tampines Hub", status: "Registered" }],
        },
      },
      {
        title: "Plan with My Calendar",
        description: "The participant calendar uses colour-coded event dates and a clear upcoming schedule, matching the coordinator calendar pattern.",
        icon: CalendarDays,
        tasks: ["See confirmed events by month", "Select a coloured date to view event details", "Use reminders to reduce missed registrations and attendance"],
        outcome: "Upcoming commitments are visible in one place.",
        preview: {
          activeNav: "My calendar",
          pageTitle: "My calendar",
          sectionTitle: "August 2026",
          action: "View event",
          variant: "calendar",
          items: [{ label: "Digital Skills Workshop", meta: "18 Aug · 10:00 am · Skills Lab", status: "Confirmed" }, { label: "Wellness Morning", meta: "24 Aug · 9:00 am · Tampines Hub", status: "Registered" }],
        },
      },
      {
        title: "Use your membership pass",
        description: "The Membership Pass page keeps the QR visible and provides direct, familiar Apple Wallet and Google Wallet actions.",
        icon: WalletCards,
        tasks: ["Open the QR directly from Passion2Serve", "Add the pass to Apple Wallet or Google Wallet", "Present the same secure membership QR after an event"],
        outcome: "Your pass is ready whether or not you use a wallet app.",
        preview: {
          activeNav: "Membership pass",
          pageTitle: "Membership pass",
          sectionTitle: "Your Passion2Serve QR pass",
          action: "Open full-screen QR",
          variant: "pass",
          items: [{ label: "Jane Tan", meta: "Member since July 2026", status: "Active" }, { label: "Wallet options", meta: "Add to Apple Wallet · Add to Google Wallet" }],
        },
      },
      {
        title: "Download your certificate",
        description: "After attendance is scanned, a named PDF certificate is emailed and saved under My Profile for future download.",
        icon: Download,
        tasks: ["Receive attendance confirmation", "Open the saved certificate from your profile", "Download the personalised PDF at any time"],
        outcome: "Your verified participation record stays with your account.",
        preview: {
          activeNav: "My profile",
          pageTitle: "My profile",
          sectionTitle: "Certificates",
          action: "Download PDF",
          variant: "certificate",
          metrics: [{ label: "Attendance", value: "Confirmed" }, { label: "Points earned", value: "+100" }, { label: "Certificate", value: "Ready" }],
          items: [{ label: "Certificate of Participation", meta: "Digital Skills Workshop · 18 August 2026", status: "PDF" }],
        },
      },
      {
        title: "Follow your learning pathway",
        description: "My Progress presents Wellness, Knowledge, and Distribution as course flow charts, with completed prerequisites visibly unlocked.",
        icon: Award,
        tasks: ["See completed and locked learning milestones", "Understand which course becomes eligible next", "Move between the three learning pathways"],
        outcome: "Your next learning step is easy to understand.",
        preview: {
          activeNav: "My progress",
          pageTitle: "My progress",
          sectionTitle: "Learning pathways",
          action: "Explore next event",
          variant: "pathway",
          metrics: [{ label: "Points", value: "430" }, { label: "Badges", value: "4" }, { label: "Events", value: "6" }],
          items: [{ label: "Wellness", meta: "Foundation → Movement → Mindfulness", status: "50%" }, { label: "Knowledge", meta: "Digital basics → Productivity → Mentor", status: "75%" }, { label: "Distribution", meta: "Sorting → Logistics → Lead", status: "25%" }],
        },
      },
      {
        title: "Earn badges and redeem rewards",
        description: "Completed events and feedback build points, activate milestone badges, and unlock sponsor-funded rewards.",
        icon: Gift,
        tasks: ["See earned badges in colour and locked badges in grey", "Earn event and feedback points", "Redeem points for available sponsor rewards"],
        outcome: "Progress is recognised and encourages continued participation.",
        preview: {
          activeNav: "My progress",
          pageTitle: "My progress",
          sectionTitle: "Badges and rewards",
          action: "Redeem reward",
          variant: "rewards",
          metrics: [{ label: "Available points", value: "430" }, { label: "Badges earned", value: "4" }, { label: "Rewards claimed", value: "1" }],
          items: [{ label: "Community Starter", meta: "Attend your first event", status: "Achieved" }, { label: "$10 Grocery Voucher", meta: "Sponsored by CommunityMart · 300 points", status: "Available" }],
        },
      },
    ] satisfies GuideStep[],
  },
} as const;

function InterfacePreview({ preview, role }: { preview: GuidePreview; role: keyof typeof guides }) {
  const navItems = role === "coordinator"
    ? ["Event dashboard", "Create event", "Ongoing", "Upcoming", "Awaiting closure", "Archived", "Calendar", "Impact analytics"]
    : ["My profile", "Membership pass", "My progress", "Discover events", "My calendar"];

  return (
    <div className="mt-7 overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-2.5">
        <div className="flex items-center gap-1.5" aria-hidden="true"><span className="size-2.5 rounded-full bg-rose-300" /><span className="size-2.5 rounded-full bg-amber-300" /><span className="size-2.5 rounded-full bg-emerald-300" /></div>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Interface snapshot</p>
        <div className="w-10" />
      </div>

      <div className="flex min-h-[330px] bg-[#f6f8f7] sm:min-h-[390px]">
        <aside className="hidden w-36 shrink-0 border-r bg-[#123b36] p-3 text-white md:block">
          <p className="px-2 py-2 text-xs font-black">Passion2Serve</p>
          <div className="mt-3 space-y-1">
            {navItems.map((item) => <div aria-current={item === preview.activeNav ? "page" : undefined} className={cn("rounded-lg border-l-2 px-2 py-1.5 text-[9px] font-semibold", item === preview.activeNav ? "border-emerald-300 bg-white/15 text-white" : "border-transparent text-white/65")} key={item}>{item}</div>)}
          </div>
        </aside>

        <div className="min-w-0 flex-1 p-3 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[9px] font-black uppercase tracking-wider text-emerald-700">{role} workspace</p><h3 className="mt-1 text-base font-black text-slate-900 sm:text-lg">{preview.pageTitle}</h3></div>
            <span className="shrink-0 rounded-lg bg-[#176f64] px-2.5 py-2 text-[9px] font-bold text-white sm:px-3">{preview.action}</span>
          </div>

          {preview.metrics && <div className="mt-4 grid grid-cols-3 gap-2">{preview.metrics.map((metric) => <div className="rounded-xl border bg-white p-2.5" key={metric.label}><p className="text-[9px] font-semibold text-slate-500">{metric.label}</p><p className="mt-1 text-sm font-black text-slate-900 sm:text-base">{metric.value}</p></div>)}</div>}

          <div className="mt-4 overflow-hidden rounded-xl border bg-white">
            <div className="bg-emerald-50 px-3 py-2.5"><p className="text-[10px] font-black text-emerald-950 sm:text-xs">{preview.sectionTitle}</p></div>
            {preview.variant === "calendar" && (
              <div className="grid gap-3 border-b p-3 sm:grid-cols-[1fr_150px]">
                <div className="grid grid-cols-7 gap-1 rounded-lg bg-slate-50 p-2">
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span className="text-center text-[8px] font-black text-slate-400" key={`${day}-${index}`}>{day}</span>)}
                  {Array.from({ length: 28 }, (_, index) => index + 1).map((day) => <span className={cn("grid aspect-square place-items-center rounded text-[8px] font-semibold", [6, 12, 18, 24].includes(day) ? "bg-emerald-600 text-white" : "text-slate-500")} key={day}>{day}</span>)}
                </div>
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3"><CalendarDays className="size-4 text-emerald-700" /><p className="mt-2 text-[10px] font-black text-slate-800">18 August</p><p className="mt-1 text-[9px] leading-4 text-slate-500">Digital Skills Workshop<br />10:00 am · Skills Lab</p></div>
              </div>
            )}
            {preview.variant === "matching" && (
              <div className="grid gap-2 border-b p-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-lg border border-dashed border-sky-300 bg-sky-50 p-3"><FileSpreadsheet className="size-5 text-sky-700" /><div><p className="text-[10px] font-black text-slate-800">Import volunteer spreadsheet</p><p className="text-[9px] text-slate-500">Giving.sg or PTS Excel/CSV</p></div></div>
                <div className="flex items-center gap-3 rounded-lg border border-violet-200 bg-violet-50 p-3"><Sparkles className="size-5 text-violet-700" /><div><p className="text-[10px] font-black text-slate-800">AI shortlist ready</p><p className="text-[9px] text-slate-500">Skills and capabilities matched</p></div></div>
              </div>
            )}
            {preview.variant === "camera" && (
              <div className="grid gap-3 border-b p-3 sm:grid-cols-[1.25fr_1fr]">
                <div className="relative grid min-h-28 place-items-center overflow-hidden rounded-lg bg-slate-950 text-white"><div className="absolute inset-5 rounded-lg border-2 border-emerald-400" /><Camera className="size-8" /><span className="absolute bottom-2 text-[8px] font-bold text-emerald-300">Align QR within the frame</span></div>
                <div className="rounded-lg bg-emerald-50 p-3"><QrCode className="size-5 text-emerald-700" /><p className="mt-2 text-[10px] font-black">Camera scan active</p><p className="mt-1 text-[9px] leading-4 text-slate-500">Works with wallet and profile membership passes.</p></div>
              </div>
            )}
            {preview.variant === "pass" && (
              <div className="grid gap-3 border-b px-3 py-4 sm:grid-cols-[1fr_1.2fr]">
                <div className="flex items-center gap-3"><div className="grid size-16 shrink-0 place-items-center rounded-xl bg-slate-950 text-white"><QrCode className="size-11" /></div><div><p className="text-xs font-black text-slate-900">Jane Tan</p><p className="mt-1 text-[9px] text-emerald-700">Active member</p></div></div>
                <div className="space-y-2"><div className="rounded-lg bg-black px-3 py-2 text-center text-[9px] font-bold text-white">Add to Apple Wallet</div><div className="rounded-lg bg-slate-200 px-3 py-2 text-center text-[9px] font-bold text-slate-800">Add to Google Wallet</div></div>
              </div>
            )}
            {preview.variant === "publicity" && (
              <div className="grid gap-3 border-b p-3 sm:grid-cols-[130px_1fr]">
                <div className="grid min-h-32 place-items-center rounded-lg bg-gradient-to-br from-emerald-800 to-sky-600 p-3 text-center text-white"><Megaphone className="size-5" /><p className="text-sm font-black">Skills that serve</p><p className="text-[8px]">Digital Skills Workshop</p></div>
                <div className="rounded-lg border bg-slate-50 p-3"><p className="text-[9px] font-black uppercase text-violet-700">AI-generated social copy</p><p className="mt-2 text-[10px] leading-4 text-slate-600">Together, 22 learners built practical digital confidence with the support of 8 volunteers.</p><p className="mt-2 text-[9px] font-bold text-emerald-700">Edit caption · Approve poster</p></div>
              </div>
            )}
            {preview.variant === "analytics" && (
              <div className="grid gap-3 border-b p-3 sm:grid-cols-2">
                <div className="flex h-32 items-end gap-2 rounded-lg bg-slate-50 p-3">{[42, 68, 54, 86, 72, 94].map((height, index) => <div className="flex-1 rounded-t bg-emerald-500" key={index} style={{ height: `${height}%` }} />)}</div>
                <div className="rounded-lg bg-slate-50 p-3"><BarChart3 className="size-5 text-emerald-700" /><p className="mt-2 text-[10px] font-black">Attendance trend</p><p className="mt-1 text-2xl font-black text-slate-900">+14%</p><p className="text-[9px] text-slate-500">Compared with the previous period</p></div>
              </div>
            )}
            {preview.variant === "certificate" && (
              <div className="border-b bg-slate-100 p-3">
                <div className="mx-auto max-w-sm border-4 border-double border-amber-500 bg-white px-4 py-5 text-center shadow-sm"><Trophy className="mx-auto size-5 text-amber-600" /><p className="mt-2 text-[8px] font-bold uppercase tracking-[0.25em] text-amber-700">Certificate of Participation</p><p className="mt-3 text-[9px] text-slate-500">Presented to</p><p className="font-serif text-lg font-bold text-slate-900">Jane Tan</p><p className="mt-2 text-[9px] text-slate-600">for completing <strong>Digital Skills Workshop</strong></p><p className="mt-2 text-[8px] text-slate-500">18 August 2026 · Passion2Serve</p></div>
              </div>
            )}
            {preview.variant === "rewards" && (
              <div className="grid grid-cols-3 gap-2 border-b p-3">
                <div className="rounded-lg bg-gradient-to-br from-amber-100 to-orange-50 p-3 text-center"><Award className="mx-auto size-6 text-amber-600" /><p className="mt-1 text-[9px] font-black">Starter</p><span className="text-[8px] text-emerald-700">Achieved</span></div>
                <div className="rounded-lg border border-dashed bg-slate-100 p-3 text-center grayscale"><BadgeCheck className="mx-auto size-6 text-slate-400" /><p className="mt-1 text-[9px] font-black">Champion</p><span className="text-[8px] text-slate-400">Locked</span></div>
                <div className="rounded-lg bg-emerald-50 p-3 text-center"><Gift className="mx-auto size-6 text-emerald-700" /><p className="mt-1 text-[9px] font-black">Voucher</p><span className="text-[8px] text-emerald-700">300 pts</span></div>
              </div>
            )}
            <div className={cn("p-3", preview.variant === "form" ? "grid gap-2 sm:grid-cols-2" : "space-y-2")}>
              {preview.items.map((item, index) => (
                <div className={cn("rounded-lg border border-slate-200 bg-slate-50 p-2.5", preview.variant !== "form" && preview.variant !== "pathway" && "flex items-center justify-between gap-3")} key={`${item.label}-${index}`}>
                  <div className="min-w-0"><p className="text-[10px] font-black text-slate-800 sm:text-xs">{item.label}</p><p className="mt-0.5 truncate text-[9px] text-slate-500 sm:text-[10px]">{item.meta}</p></div>
                  {item.status && preview.variant !== "pathway" && <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[8px] font-bold text-emerald-800 sm:text-[9px]">{item.status}</span>}
                  {preview.variant === "pathway" && <div className="mt-2 flex items-center gap-1.5"><span className="grid size-5 place-items-center rounded-full bg-emerald-600 text-[8px] font-black text-white"><Check className="size-3" /></span><span className="h-0.5 flex-1 bg-emerald-400" /><span className="grid size-5 place-items-center rounded-full bg-emerald-100 text-[8px] font-black text-emerald-800">2</span><span className="h-0.5 flex-1 bg-slate-200" /><span className="grid size-5 place-items-center rounded-full bg-slate-200 text-[8px] font-black text-slate-500">3</span><span className="ml-1 text-[9px] font-black text-emerald-700">{item.status}</span></div>}
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-center text-[9px] font-medium text-slate-400">Preview data is illustrative</p>
        </div>
      </div>
    </div>
  );
}

export function RoleGuide({ role }: { role: keyof typeof guides }) {
  const guide = guides[role];
  const [activeIndex, setActiveIndex] = useState(0);
  const step = guide.steps[activeIndex];
  const StepIcon = step.icon;
  const isLast = activeIndex === guide.steps.length - 1;

  return (
    <main className="min-h-screen bg-muted/35 px-4 py-5 sm:px-8 sm:py-7">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Brand />
          <Button asChild variant="outline"><Link href="/">Back to home</Link></Button>
        </header>

        <section className="py-10 text-center sm:py-14">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-sm font-bold text-primary">
            <Sparkles className="size-4" /> {guide.audience}
          </div>
          <h1 className="mt-5 text-balance text-3xl font-black tracking-tight sm:text-5xl">{guide.title}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">{guide.description}</p>
          <p className="mt-3 text-sm font-semibold text-primary">About 2 minutes · No account required</p>
        </section>

        <div className="grid min-w-0 gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <Card className="h-fit min-w-0 border-0">
            <CardContent className="p-4 sm:p-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Your walkthrough</p>
              <div className="flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">
                {guide.steps.map((item, index) => {
                  const Icon = item.icon;
                  const active = index === activeIndex;
                  const complete = index < activeIndex;
                  return (
                    <button
                      aria-current={active ? "step" : undefined}
                      className={cn("flex min-w-[220px] items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors lg:min-w-0 lg:w-full", active ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
                      key={item.title}
                      onClick={() => setActiveIndex(index)}
                      type="button"
                    >
                      <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", active ? "bg-white/15" : complete ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground")}>
                        {complete ? <Check className="size-4" /> : <Icon className="size-4" />}
                      </span>
                      <span><span className="block text-xs font-semibold opacity-75">Step {index + 1}</span><span className="mt-0.5 block text-sm font-bold">{item.title}</span></span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0 overflow-hidden border-0">
            <div className="bg-primary px-5 py-4 text-primary-foreground sm:px-8">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-bold">Step {activeIndex + 1} of {guide.steps.length}</p>
                <p className="text-sm font-semibold">{Math.round(((activeIndex + 1) / guide.steps.length) * 100)}% complete</p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-white transition-[width]" style={{ width: `${((activeIndex + 1) / guide.steps.length) * 100}%` }} /></div>
            </div>
            <CardContent className="p-5 sm:p-8">
              <div className="grid size-14 place-items-center rounded-2xl bg-accent text-primary"><StepIcon className="size-7" /></div>
              <h2 className="mt-6 text-2xl font-black sm:text-3xl">{step.title}</h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{step.description}</p>

              <InterfacePreview preview={step.preview} role={role} />

              <div className="mt-7 rounded-2xl border bg-muted/45 p-5 sm:p-6">
                <p className="text-sm font-black uppercase tracking-[0.12em] text-primary">What you will do</p>
                <ul className="mt-4 space-y-4">
                  {step.tasks.map((task) => <li className="flex gap-3" key={task}><span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="size-3.5" /></span><span className="leading-6">{task}</span></li>)}
                </ul>
              </div>

              <div className="mt-5 flex gap-3 rounded-xl bg-secondary/70 p-4"><Send className="mt-0.5 size-5 shrink-0 text-primary" /><div><p className="font-bold">Result</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{step.outcome}</p></div></div>

              <div className="mt-8 flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
                <Button disabled={activeIndex === 0} onClick={() => setActiveIndex((index) => Math.max(0, index - 1))} variant="outline"><ArrowLeft className="size-4" />Previous</Button>
                {isLast ? (
                  <Button asChild><Link href={`/login?role=${role}`}>{guide.signInLabel}<ArrowRight className="size-4" /></Link></Button>
                ) : (
                  <Button onClick={() => setActiveIndex((index) => Math.min(guide.steps.length - 1, index + 1))}>Next step<ArrowRight className="size-4" /></Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
