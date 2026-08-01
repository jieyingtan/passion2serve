"use client";

import Link from "next/link";
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  dateKeyToUtc,
  eventDateRange,
  eventHref,
  monthGridKeys,
  readinessLabel,
  shiftDateKey,
  shiftMonthKey,
  singaporeTimeZone,
  startOfWeekKey,
  type CalendarEvent,
  type CalendarView,
} from "@/lib/events/calendar";
import { cn } from "@/lib/utils";

const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const views: { label: string; value: CalendarView }[] = [
  { label: "Month", value: "month" },
  { label: "Week", value: "week" },
  { label: "Day", value: "day" },
  { label: "List", value: "list" },
];
const stageLabels = {
  create: "Create",
  ongoing: "Ongoing",
  upcoming: "Upcoming",
  awaiting_closure: "Awaiting closure",
  archived: "Archived",
};
const stageStyles = {
  create: "border-sky-500 bg-sky-50 text-sky-950 hover:bg-sky-100",
  ongoing: "border-amber-500 bg-amber-50 text-amber-950 hover:bg-amber-100",
  upcoming: "border-emerald-600 bg-emerald-50 text-emerald-950 hover:bg-emerald-100",
  awaiting_closure: "border-violet-500 bg-violet-50 text-violet-950 hover:bg-violet-100",
  archived: "border-slate-500 bg-slate-100 text-slate-700 hover:bg-slate-200",
};
const legendDots = {
  create: "bg-sky-500",
  ongoing: "bg-amber-500",
  upcoming: "bg-emerald-600",
  awaiting_closure: "bg-violet-500",
  archived: "bg-slate-600",
};

function formatKey(key: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-SG", { ...options, timeZone: "UTC" }).format(dateKeyToUtc(key));
}

function formatEventTime(event: CalendarEvent) {
  const formatter = new Intl.DateTimeFormat("en-SG", { hour: "numeric", minute: "2-digit", timeZone: singaporeTimeZone });
  const start = formatter.format(new Date(event.startsAt));
  return event.endsAt ? `${start}–${formatter.format(new Date(event.endsAt))}` : start;
}

function formatEventRange(event: CalendarEvent) {
  const formatter = new Intl.DateTimeFormat("en-SG", { dateStyle: "medium", timeStyle: "short", timeZone: singaporeTimeZone });
  const start = formatter.format(new Date(event.startsAt));
  return event.endsAt ? `${start} – ${formatter.format(new Date(event.endsAt))}` : start;
}

function intersects(event: CalendarEvent, startKey: string, endKey: string) {
  const range = eventDateRange(event);
  return range.startKey <= endKey && range.endKey >= startKey;
}

function EventList({ events, emptyMessage = "No events in this period." }: { events: CalendarEvent[]; emptyMessage?: string }) {
  if (!events.length) {
    return <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">{emptyMessage}</div>;
  }
  return (
    <div className="space-y-3">
      {events.map((event) => (
        <Link
          className="group grid gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/40 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
          href={eventHref(event)}
          key={event.id}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("size-2.5 rounded-full", legendDots[event.status])} aria-hidden="true" />
              <h3 className="truncate font-bold group-hover:text-primary">{event.name}</h3>
              <Badge variant="outline">{stageLabels[event.status]}</Badge>
            </div>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="size-4 shrink-0" />{formatEventRange(event)}</p>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4 shrink-0" />{event.venue} · {event.organisationName}</p>
          </div>
          <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", readinessLabel(event).includes("outstanding") || event.status === "awaiting_closure" ? "text-amber-700" : "text-primary")}>
            {(readinessLabel(event).includes("outstanding") || event.status === "awaiting_closure") && <AlertCircle className="size-4" />}
            {readinessLabel(event)}
          </span>
        </Link>
      ))}
    </div>
  );
}

interface MonthSegment { event: CalendarEvent; lane: number; span: number; startIndex: number }

function getMonthSegments(events: CalendarEvent[], weekKeys: string[]) {
  const first = weekKeys[0];
  const last = weekKeys[6];
  const candidates = events
    .filter((event) => intersects(event, first, last))
    .map((event) => {
      const range = eventDateRange(event);
      const startKey = range.startKey < first ? first : range.startKey;
      const endKey = range.endKey > last ? last : range.endKey;
      return { event, startIndex: weekKeys.indexOf(startKey), endIndex: weekKeys.indexOf(endKey) };
    })
    .sort((a, b) => a.startIndex - b.startIndex || b.endIndex - a.endIndex);
  const laneEnds: number[] = [];
  return candidates.map((candidate) => {
    let lane = laneEnds.findIndex((endIndex) => endIndex < candidate.startIndex);
    if (lane < 0) lane = laneEnds.length;
    laneEnds[lane] = candidate.endIndex;
    return { ...candidate, lane, span: candidate.endIndex - candidate.startIndex + 1 } satisfies MonthSegment;
  });
}

function MonthView({ anchorKey, events, todayKey }: { anchorKey: string; events: CalendarEvent[]; todayKey: string }) {
  const keys = monthGridKeys(anchorKey);
  const currentMonth = anchorKey.slice(0, 7);
  const weeks = Array.from({ length: keys.length / 7 }, (_, index) => keys.slice(index * 7, index * 7 + 7));
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="grid grid-cols-7 bg-primary text-primary-foreground">
        {weekDays.map((day) => <div className="px-2 py-4 text-center text-sm font-semibold" key={day}>{day}</div>)}
      </div>
      {weeks.map((week) => {
        const segments = getMonthSegments(events, week);
        const laneCount = Math.max(0, ...segments.map((segment) => segment.lane + 1));
        return (
          <div className="grid grid-cols-7" key={week[0]} style={{ minHeight: `${Math.max(148, 54 + laneCount * 34)}px` }}>
            {week.map((key, index) => (
              <div className={cn("border-r border-t p-3 last:border-r-0", key.slice(0, 7) !== currentMonth && "bg-muted/45 text-muted-foreground")} key={key} style={{ gridColumn: index + 1, gridRow: 1 }}>
                <span className={cn("grid size-7 place-items-center rounded-full text-sm font-semibold", key === todayKey && "bg-primary text-primary-foreground")} aria-current={key === todayKey ? "date" : undefined}>
                  {Number(key.slice(8, 10))}
                </span>
              </div>
            ))}
            {segments.map(({ event, lane, span, startIndex }) => (
              <Link
                aria-label={`${event.name}, ${formatEventRange(event)}, ${readinessLabel(event)}`}
                className={cn("z-10 mx-1.5 truncate border-l-4 px-2 py-1 text-xs font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", stageStyles[event.status])}
                href={eventHref(event)}
                key={`${event.id}-${week[0]}`}
                style={{ gridColumn: `${startIndex + 1} / span ${span}`, gridRow: 1, alignSelf: "start", marginTop: `${45 + lane * 34}px` }}
                title={`${event.name} · ${readinessLabel(event)}`}
              >
                <span className="block truncate">{event.name}</span>
                {span > 1 && <span className="block truncate font-normal opacity-75">{formatEventTime(event)}</span>}
              </Link>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function WeekView({ anchorKey, events, todayKey }: { anchorKey: string; events: CalendarEvent[]; todayKey: string }) {
  const start = startOfWeekKey(anchorKey);
  const keys = Array.from({ length: 7 }, (_, index) => shiftDateKey(start, index));
  return (
    <div className="grid min-h-[520px] grid-cols-7 overflow-hidden rounded-xl border bg-card">
      {keys.map((key, index) => {
        const dayEvents = events.filter((event) => intersects(event, key, key));
        return (
          <div className="border-r last:border-r-0" key={key}>
            <div className={cn("border-b p-3 text-center", key === todayKey && "bg-accent")}>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{weekDays[index].slice(0, 3)}</p>
              <p className="mt-1 text-xl font-bold">{Number(key.slice(8, 10))}</p>
            </div>
            <div className="space-y-2 p-2">
              {dayEvents.map((event) => (
                <Link className={cn("block border-l-4 p-2 text-xs transition-colors", stageStyles[event.status])} href={eventHref(event)} key={event.id}>
                  <span className="block font-bold">{event.name}</span>
                  <span className="mt-1 block opacity-75">{formatEventTime(event)}</span>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CoordinatorCalendar({ events, todayKey }: { events: CalendarEvent[]; todayKey: string }) {
  const [view, setView] = useState<CalendarView>("month");
  const [anchorKey, setAnchorKey] = useState(todayKey);
  const [status, setStatus] = useState("all");
  const [eventType, setEventType] = useState("all");
  const [organisation, setOrganisation] = useState("all");
  const [venue, setVenue] = useState("all");
  const optionValues = (key: "eventType" | "organisationName" | "venue") => [...new Set(events.map((event) => event[key]))].sort();
  const filteredEvents = useMemo(() => events.filter((event) =>
    (status === "all" || event.status === status)
    && (eventType === "all" || event.eventType === eventType)
    && (organisation === "all" || event.organisationName === organisation)
    && (venue === "all" || event.venue === venue)), [events, eventType, organisation, status, venue]);
  const sortedEvents = [...filteredEvents].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const monthKeys = monthGridKeys(anchorKey);
  const weekStart = startOfWeekKey(anchorKey);
  const periodEvents = view === "list" ? sortedEvents : sortedEvents.filter((event) => {
    if (view === "day") return intersects(event, anchorKey, anchorKey);
    if (view === "week") return intersects(event, weekStart, shiftDateKey(weekStart, 6));
    return intersects(event, monthKeys[0], monthKeys[monthKeys.length - 1]);
  });
  const title = view === "month"
    ? formatKey(anchorKey, { month: "long", year: "numeric" })
    : view === "week"
      ? `${formatKey(weekStart, { day: "numeric", month: "short" })} – ${formatKey(shiftDateKey(weekStart, 6), { day: "numeric", month: "short", year: "numeric" })}`
      : view === "day"
        ? formatKey(anchorKey, { dateStyle: "full" })
        : "All scheduled events";
  const hasFilters = status !== "all" || eventType !== "all" || organisation !== "all" || venue !== "all";
  const move = (direction: number) => setAnchorKey(view === "month" ? shiftMonthKey(anchorKey, direction) : shiftDateKey(anchorKey, direction * (view === "week" ? 7 : 1)));
  const resetFilters = () => { setStatus("all"); setEventType("all"); setOrganisation("all"); setVenue("all"); };

  return (
    <Card className="border-0 shadow-soft">
      <CardContent className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <h2 className="text-xl font-bold sm:order-2" aria-live="polite">{title}</h2>
            {view !== "list" && <div className="flex items-center gap-2 sm:order-1">
              <Button aria-label="Previous period" onClick={() => move(-1)} size="icon" variant="outline"><ChevronLeft className="size-4" /></Button>
              <Button onClick={() => setAnchorKey(todayKey)} variant="outline">Today</Button>
              <Button aria-label="Next period" onClick={() => move(1)} size="icon" variant="outline"><ChevronRight className="size-4" /></Button>
            </div>}
          </div>
          <div className="grid w-full grid-cols-4 rounded-lg border bg-background p-1 sm:w-fit" aria-label="Calendar view">
            {views.map((item) => <button className={cn("min-h-10 rounded-md px-2 py-1.5 text-sm font-semibold transition-colors sm:px-3", view === item.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")} key={item.value} onClick={() => setView(item.value)} type="button">{item.label}</button>)}
          </div>
        </div>

        <div className="grid gap-3 rounded-xl bg-muted/60 p-3 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
          {[
            { label: "Status", allLabel: "All statuses", value: status, set: setStatus, options: Object.entries(stageLabels) },
            { label: "Event type", allLabel: "All event types", value: eventType, set: setEventType, options: optionValues("eventType").map((value) => [value, value]) },
            { label: "Organisation", allLabel: "All organisations", value: organisation, set: setOrganisation, options: optionValues("organisationName").map((value) => [value, value]) },
            { label: "Venue", allLabel: "All venues", value: venue, set: setVenue, options: optionValues("venue").map((value) => [value, value]) },
          ].map((filter) => (
            <label className="text-xs font-semibold text-muted-foreground" key={filter.label}>{filter.label}
              <select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" onChange={(event) => filter.set(event.target.value)} value={filter.value}>
                <option value="all">{filter.allLabel}</option>
                {filter.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          ))}
          <Button className="self-end" disabled={!hasFilters} onClick={resetFilters} variant="ghost"><RotateCcw className="size-4" />Clear</Button>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground" aria-label="Event status legend">
          {Object.entries(stageLabels).map(([key, label]) => <span className="flex items-center gap-1.5" key={key}><span className={cn("size-2.5 rounded-full", legendDots[key as keyof typeof legendDots])} />{label}</span>)}
          <span className="ml-auto font-semibold">{filteredEvents.length} {filteredEvents.length === 1 ? "event" : "events"}</span>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <div className={view === "month" || view === "week" ? "min-w-[900px]" : undefined}>
            {view === "month" && <MonthView anchorKey={anchorKey} events={filteredEvents} todayKey={todayKey} />}
            {view === "week" && <WeekView anchorKey={anchorKey} events={filteredEvents} todayKey={todayKey} />}
            {view === "day" && <EventList events={periodEvents} />}
            {view === "list" && <EventList events={periodEvents} emptyMessage="No events match these filters." />}
          </div>
        </div>
        <div className="md:hidden">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><CalendarDays className="size-4 text-primary" />Compact calendar list</div>
          <EventList events={periodEvents} emptyMessage={view === "list" ? "No events match these filters." : "No events in this period."} />
        </div>
      </CardContent>
    </Card>
  );
}
