import Link from "next/link";
import { Activity, AlertCircle, ArrowRight, Building2, CalendarClock, CalendarDays, CheckCircle2, Clock3, Plus, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { dateKeyInSingapore, eventHref, readinessLabel, singaporeTimeZone, type CalendarEvent } from "@/lib/events/calendar";
import { eventStages, formatEventDate, type EventStage } from "@/lib/events/stages";
import { cn } from "@/lib/utils";
import { listCoordinatorCalendarEvents } from "@/server/events/calendar";
import { listRecentEventActivity } from "@/server/events/dashboard";

const stageVisuals: Record<EventStage, { border: string; dot: string; soft: string }> = {
  create: { border: "border-t-sky-500", dot: "bg-sky-500", soft: "bg-sky-50 text-sky-800" },
  ongoing: { border: "border-t-amber-500", dot: "bg-amber-500", soft: "bg-amber-50 text-amber-800" },
  upcoming: { border: "border-t-emerald-600", dot: "bg-emerald-600", soft: "bg-emerald-50 text-emerald-800" },
  awaiting_closure: { border: "border-t-violet-500", dot: "bg-violet-500", soft: "bg-violet-50 text-violet-800" },
  archived: { border: "border-t-slate-500", dot: "bg-slate-500", soft: "bg-slate-100 text-slate-700" },
};

function percentage(value: number, target: number | null) {
  if (!target) return value > 0 ? 100 : 0;
  return Math.min(100, Math.round(value / target * 100));
}

function nextAction(event: CalendarEvent) {
  if (event.status === "create") return "Complete event setup and begin outreach";
  if (event.status === "awaiting_closure") return "Complete publicity and the impact report";
  if (event.status !== "ongoing") return readinessLabel(event);
  if (event.businessConfirmed < event.businessTarget) {
    const missing = event.businessTarget - event.businessConfirmed;
    return `Confirm ${missing} more ${missing === 1 ? "business" : "businesses"}`;
  }
  if (event.volunteerConfirmed < event.volunteerTarget) {
    const missing = event.volunteerTarget - event.volunteerConfirmed;
    return `Confirm ${missing} more ${missing === 1 ? "volunteer" : "volunteers"}`;
  }
  if (!event.participantReviewed) return "Review the participant list";
  return "Move this event to Upcoming";
}

function stageName(status: EventStage) {
  return eventStages.find((stage) => stage.status === status)?.label ?? status.replaceAll("_", " ");
}

function DashboardError({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{children}</p>;
}

export default async function CoordinatorDashboardPage() {
  const [{ events, error: eventsError }, { activity, error: activityError }] = await Promise.all([
    listCoordinatorCalendarEvents(),
    listRecentEventActivity(),
  ]);
  const now = new Date();
  const todayKey = dateKeyInSingapore(now);
  const today = new Intl.DateTimeFormat("en-SG", { dateStyle: "full", timeZone: singaporeTimeZone }).format(now);
  const counts = Object.fromEntries(eventStages.map((stage) => [stage.status, events.filter((event) => event.status === stage.status).length])) as Record<EventStage, number>;
  const needsAttention = events
    .filter((event) => ["create", "ongoing", "awaiting_closure"].includes(event.status))
    .sort((a, b) => {
      const priority = { awaiting_closure: 0, ongoing: 1, create: 2, upcoming: 3, archived: 4 };
      return priority[a.status] - priority[b.status] || new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    });
  const upcomingEvents = events
    .filter((event) => event.status === "upcoming" && new Date(event.endsAt ?? event.startsAt).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const nextEvent = upcomingEvents[0] ?? null;
  const upcomingThisMonth = upcomingEvents.filter((event) => dateKeyInSingapore(event.startsAt).slice(0, 7) === todayKey.slice(0, 7)).length;
  const metrics = [
    { label: "Needs attention", value: needsAttention.length, note: "Events with a next action", icon: AlertCircle, tone: "text-amber-700 bg-amber-50" },
    { label: "Next event", value: nextEvent ? new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", timeZone: singaporeTimeZone }).format(new Date(nextEvent.startsAt)) : "—", note: nextEvent?.name ?? "Nothing scheduled", icon: CalendarClock, tone: "text-emerald-700 bg-emerald-50" },
    { label: "Upcoming this month", value: upcomingThisMonth, note: "Ready for delivery", icon: CalendarDays, tone: "text-sky-700 bg-sky-50" },
    { label: "Awaiting closure", value: counts.awaiting_closure, note: "Impact follow-up required", icon: CheckCircle2, tone: "text-violet-700 bg-violet-50" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-primary">{today}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Event workspace</h1>
          <p className="mt-2 text-muted-foreground">Focus on what needs action and keep delivery on schedule.</p>
        </div>
        <Button asChild><Link href="/coordinator/events/new"><Plus className="size-4" />Create event</Link></Button>
      </div>

      {eventsError && <DashboardError>Dashboard events could not be loaded: {eventsError}</DashboardError>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ icon: Icon, ...metric }) => (
          <Card className="border-0" key={metric.label}>
            <CardContent className="flex items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="mt-1 truncate text-2xl font-bold">{metric.value}</p>
                <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">{metric.note}</p>
              </div>
              <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", metric.tone)}><Icon className="size-5" /></span>
            </CardContent>
          </Card>
        ))}
      </div>

      <section aria-labelledby="pipeline-title">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div><h2 className="text-lg font-bold" id="pipeline-title">Event lifecycle</h2><p className="text-sm text-muted-foreground">Select a stage to view its events.</p></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {eventStages.map((stage) => {
            const visual = stageVisuals[stage.status];
            const actionCount = needsAttention.filter((event) => event.status === stage.status).length;
            return (
              <Link className="group" href={stage.href} key={stage.status}>
                <Card className={cn("h-full border-t-4 shadow-none transition-all group-hover:-translate-y-0.5 group-hover:shadow-soft", visual.border)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-sm font-semibold"><span className={cn("size-2.5 rounded-full", visual.dot)} />{stage.label}</span><ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></div>
                    <div className="mt-4 flex items-end justify-between"><span className="text-3xl font-bold">{counts[stage.status]}</span>{actionCount > 0 && <span className={cn("rounded-full px-2 py-1 text-[11px] font-bold", visual.soft)}>{actionCount} to action</span>}</div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.75fr)_minmax(300px,1fr)]">
        <Card className="border-0">
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div><CardTitle>Action required</CardTitle><p className="mt-1 text-sm text-muted-foreground">Prioritised by lifecycle stage and event date.</p></div>
            <Badge variant={needsAttention.length ? "warning" : "success"}>{needsAttention.length || "All clear"}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {!needsAttention.length ? (
              <div className="rounded-xl border border-dashed p-10 text-center"><CheckCircle2 className="mx-auto size-8 text-emerald-600" /><p className="mt-3 font-bold">No outstanding actions</p><p className="mt-1 text-sm text-muted-foreground">Your active events are ready for their next stage.</p></div>
            ) : needsAttention.slice(0, 5).map((event) => (
              <div className="rounded-xl border p-4" key={event.id}>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{event.name}</h3><Badge className={stageVisuals[event.status].soft} variant="outline">{stageName(event.status)}</Badge></div>
                    <p className="mt-1 text-sm text-muted-foreground">{formatEventDate(event.startsAt)} · {event.venue}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-amber-700"><AlertCircle className="size-4" />{nextAction(event)}</p>
                  </div>
                  <Button asChild size="sm" variant="outline"><Link href={eventHref(event)}>Open event<ArrowRight className="size-4" /></Link></Button>
                </div>
                {event.status === "ongoing" && <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Businesses", value: event.businessConfirmed, target: event.businessTarget, icon: Building2 },
                    { label: "Volunteers", value: event.volunteerConfirmed, target: event.volunteerTarget, icon: UsersRound },
                    { label: "Participants", value: event.registrationCount, target: event.participantCapacity, icon: CheckCircle2 },
                  ].map(({ icon: Icon, ...item }) => <div className="rounded-lg bg-muted/60 p-3" key={item.label}><div className="mb-2 flex items-center justify-between text-xs"><span className="flex items-center gap-1.5 font-semibold"><Icon className="size-3.5 text-primary" />{item.label}</span><span className="text-muted-foreground">{item.value}{item.target !== null ? `/${item.target}` : ""}</span></div><Progress label={`${event.name} ${item.label.toLowerCase()} progress`} value={percentage(item.value, item.target)} /></div>)}
                </div>}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardHeader className="flex-row items-start justify-between gap-3"><div><CardTitle>Upcoming schedule</CardTitle><p className="mt-1 text-sm text-muted-foreground">Events ready for delivery.</p></div><Button asChild size="sm" variant="ghost"><Link href="/coordinator/calendar">Calendar<ArrowRight className="size-4" /></Link></Button></CardHeader>
          <CardContent className="space-y-3">
            {!upcomingEvents.length ? <div className="rounded-xl border border-dashed p-8 text-center"><CalendarDays className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-semibold">No upcoming events</p><p className="mt-1 text-sm text-muted-foreground">Ready events will appear here.</p></div> : upcomingEvents.slice(0, 4).map((event) => {
              const date = new Date(event.startsAt);
              return <Link className="flex gap-3 rounded-xl border p-3 transition-colors hover:bg-accent/40" href={eventHref(event)} key={event.id}><span className="grid size-12 shrink-0 place-items-center rounded-lg bg-emerald-50 text-center text-emerald-800"><span><span className="block text-[10px] font-bold uppercase">{new Intl.DateTimeFormat("en-SG", { month: "short", timeZone: singaporeTimeZone }).format(date)}</span><span className="block text-lg font-bold leading-4">{new Intl.DateTimeFormat("en-SG", { day: "numeric", timeZone: singaporeTimeZone }).format(date)}</span></span></span><span className="min-w-0"><span className="block truncate font-semibold">{event.name}</span><span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="size-3" />{new Intl.DateTimeFormat("en-SG", { hour: "numeric", minute: "2-digit", timeZone: singaporeTimeZone }).format(date)}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{event.venue}</span></span></Link>;
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="border-0">
        <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="size-5 text-primary" />Recent activity</CardTitle><p className="text-sm text-muted-foreground">Latest event lifecycle changes across your programmes.</p></CardHeader>
        <CardContent>
          {activityError && <DashboardError>Recent activity could not be loaded: {activityError}</DashboardError>}
          {!activityError && !activity.length && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Stage changes will appear here.</p>}
          <div className="divide-y">
            {activity.map((item) => <Link className="flex flex-col justify-between gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center" href={`/coordinator/events/${item.eventId}/lifecycle`} key={item.id}><div><p className="font-semibold">{item.eventName}</p><p className="mt-0.5 text-sm text-muted-foreground">{item.previousStatus ? `${stageName(item.previousStatus)} → ` : ""}{stageName(item.newStatus)} · {item.reason || "Stage updated"}</p></div><time className="shrink-0 text-xs text-muted-foreground" dateTime={item.changedAt}>{formatEventDate(item.changedAt)}</time></Link>)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
