import Link from "next/link";
import { Archive, ArrowRight, CalendarClock, ClipboardCheck, Pencil, Plus, Radio } from "lucide-react";

import { EventStageTabs } from "@/components/coordinator/event-stage-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatEventDate, getEventStage, type EventStage } from "@/lib/events/stages";
import { listEventsByStage } from "@/server/events/stages";

const stageIcons = {
  create: Plus,
  ongoing: Radio,
  upcoming: CalendarClock,
  awaiting_closure: ClipboardCheck,
  archived: Archive,
};

function percentage(value: number, target: number | null) {
  if (!target) return 0;
  return Math.round((value / target) * 100);
}

export async function EventStagePage({ status }: { status: Exclude<EventStage, "create"> }) {
  const stage = getEventStage(status);
  const Icon = stageIcons[status];
  const { events, error } = await listEventsByStage(status);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold text-primary">Coordinator event pipeline</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{stage.label} events</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">{stage.description}</p>
        </div>
        <Button asChild><Link href="/coordinator/events/new"><Plus className="size-4" /> Create event</Link></Button>
      </div>

      <EventStageTabs active={status} />

      {error && (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          Events could not be loaded: {error}
        </p>
      )}

      {!error && events.length === 0 ? (
        <Card className="border-0">
          <CardContent className="grid min-h-[360px] place-items-center p-10 text-center">
            <div>
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-primary"><Icon className="size-7" /></span>
              <h2 className="mt-5 text-xl font-bold">{stage.emptyTitle}</h2>
              <p className="mx-auto mt-2 max-w-lg text-muted-foreground">{stage.emptyDescription}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {events.map((event) => {
            const participantTarget = event.participantCapacity;
            const participantProgress = percentage(event.registrationCount, participantTarget);
            return (
              <Card className="border-0" key={event.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-bold">{event.name}</h2>
                        <Badge variant={status === "archived" ? "secondary" : status === "upcoming" ? "success" : "warning"}>{stage.label}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{event.eventType} · {formatEventDate(event.startsAt)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{event.venue}</p>
                    </div>
                    <Icon className="size-5 shrink-0 text-primary" />
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-muted p-3">
                      <p className="text-xs text-muted-foreground">Participants</p>
                      <p className="mt-1 font-bold">{event.registrationCount}{participantTarget ? `/${participantTarget}` : ""}</p>
                    </div>
                    <div className="rounded-xl bg-muted p-3">
                      <p className="text-xs text-muted-foreground">Volunteer target</p>
                      <p className="mt-1 font-bold">{event.volunteerTarget}</p>
                    </div>
                    <div className="rounded-xl bg-muted p-3">
                      <p className="text-xs text-muted-foreground">Business target</p>
                      <p className="mt-1 font-bold">{event.businessTarget}</p>
                    </div>
                  </div>

                  {participantTarget && (
                    <div className="mt-5">
                      <div className="mb-2 flex justify-between text-xs">
                        <span className="font-semibold">Participant readiness</span>
                        <span className="text-muted-foreground">{participantProgress}%</span>
                      </div>
                      <Progress label={`${event.name} participant readiness`} value={participantProgress} />
                    </div>
                  )}

                  {status === "archived" && <p className="mt-4 text-sm text-muted-foreground">Recorded attendance: <span className="font-semibold text-foreground">{event.attendanceCount}</span></p>}

                  <div className="mt-6 flex flex-wrap justify-end gap-2">
                    {status === "ongoing" && <Button asChild size="sm" variant="outline"><Link href={`/coordinator/events/${event.id}/edit`}><Pencil className="size-4"/>Edit requirements</Link></Button>}
                    <Button asChild size="sm" variant="outline">
                      <Link href={status === "ongoing" ? `/coordinator/events/${event.id}/operations` : `/coordinator/events/${event.id}/lifecycle`}>
                        {status === "ongoing" ? "Manage event operations" : status === "upcoming" ? "Attendance and delivery" : status === "awaiting_closure" ? "Complete closure" : "View event record"} <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
