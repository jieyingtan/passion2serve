import Link from "next/link";
import { ArrowRight, CalendarClock, ClipboardCheck, Plus, Radio } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { eventStages, formatEventDate } from "@/lib/events/stages";
import { getEventStageCounts, listEventsByStage } from "@/server/events/stages";

export default async function CoordinatorDashboardPage() {
  const [{ counts, error: countError }, { events: ongoingEvents, error: ongoingError }] = await Promise.all([
    getEventStageCounts(),
    listEventsByStage("ongoing"),
  ]);
  const today = new Intl.DateTimeFormat("en-SG", {
    dateStyle: "full",
    timeZone: "Asia/Singapore",
  }).format(new Date());
  const pipelineTotal = counts.create + counts.ongoing + counts.upcoming + counts.awaiting_closure;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-primary">{today}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Event workspace</h1>
          <p className="mt-2 text-muted-foreground">Keep every event moving and every follow-up visible.</p>
        </div>
        <Button asChild>
          <Link href="/coordinator/events/new"><Plus className="size-4" /> Create event</Link>
        </Button>
      </div>

      {countError && <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">Event counts could not be loaded: {countError}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {eventStages.map((stage) => (
          <Link className="group" href={stage.href} key={stage.status}>
            <Card className={stage.status === "ongoing" ? "h-full border-primary/30 bg-primary text-primary-foreground transition-transform group-hover:-translate-y-0.5" : "h-full shadow-none transition-transform group-hover:-translate-y-0.5"}>
              <CardContent className="p-5">
                <p className={stage.status === "ongoing" ? "text-sm text-primary-foreground/75" : "text-sm text-muted-foreground"}>{stage.label}</p>
                <div className="mt-2 flex items-end justify-between">
                  <p className="text-3xl font-bold">{counts[stage.status]}</p>
                  <ArrowRight className="mb-1 size-4 transition-transform group-hover:translate-x-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {[
          { label: "Active pipeline", value: pipelineTotal, icon: Radio, note: "Events not yet archived" },
          { label: "Upcoming events", value: counts.upcoming, icon: CalendarClock, note: "Ready for delivery" },
          { label: "Awaiting closure", value: counts.awaiting_closure, icon: ClipboardCheck, note: "Need follow-up" },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <Card className="border-0" key={metric.label}>
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="mt-1 text-3xl font-bold">{metric.value}</p>
                  <p className="mt-1 text-xs font-semibold text-primary">{metric.note}</p>
                </div>
                <div className="grid size-12 place-items-center rounded-xl bg-accent text-primary"><Icon className="size-5" /></div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-0">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Ongoing events</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Recruitment and participant readiness at a glance.</p>
          </div>
          <Button asChild variant="ghost"><Link href="/coordinator/events/ongoing">View all <ArrowRight className="size-4" /></Link></Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {ongoingError && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">Ongoing events could not be loaded: {ongoingError}</p>}
          {!ongoingError && ongoingEvents.length === 0 && (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <p className="font-semibold">No ongoing events</p>
              <p className="mt-1 text-sm text-muted-foreground">Start outreach from a new event to see it here.</p>
            </div>
          )}
          {ongoingEvents.slice(0, 3).map((event) => (
            <div className="grid gap-4 rounded-xl border p-5 lg:grid-cols-[1.5fr_1fr_1fr_auto] lg:items-center" key={event.id}>
              <div>
                <h2 className="font-bold">{event.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{event.eventType} · {formatEventDate(event.startsAt)} · {event.venue}</p>
              </div>
              <div><p className="text-xs text-muted-foreground">Participants</p><p className="mt-1 font-bold">{event.registrationCount}{event.participantCapacity ? `/${event.participantCapacity}` : ""}</p></div>
              <div><p className="text-xs text-muted-foreground">Targets</p><p className="mt-1 font-bold">{event.volunteerTarget} volunteers · {event.businessTarget} businesses</p></div>
              <Button asChild size="sm" variant="outline"><Link href={`/coordinator/events/${event.id}/operations`}>Manage operations</Link></Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
