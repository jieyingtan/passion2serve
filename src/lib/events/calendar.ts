import type { EventStage } from "@/lib/events/stages";

export type CalendarView = "month" | "week" | "day" | "list";

export interface CalendarEvent {
  businessConfirmed: number;
  businessTarget: number;
  endsAt: string | null;
  eventType: string;
  id: string;
  name: string;
  organisationName: string;
  participantCapacity: number | null;
  participantReviewed: boolean;
  registrationCount: number;
  startsAt: string;
  status: EventStage;
  venue: string;
  volunteerConfirmed: number;
  volunteerTarget: number;
}

export const singaporeTimeZone = "Asia/Singapore";

export function dateKeyInSingapore(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: singaporeTimeZone,
  }).formatToParts(typeof value === "string" ? new Date(value) : value);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return `${read("year")}-${read("month")}-${read("day")}`;
}

export function dateKeyToUtc(key: string) {
  return new Date(`${key}T00:00:00.000Z`);
}

export function shiftDateKey(key: string, days: number) {
  const date = dateKeyToUtc(key);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function shiftMonthKey(key: string, months: number) {
  const date = dateKeyToUtc(key);
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

export function startOfWeekKey(key: string) {
  const date = dateKeyToUtc(key);
  return shiftDateKey(key, -date.getUTCDay());
}

export function monthGridKeys(key: string) {
  const month = dateKeyToUtc(key);
  const first = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
  const last = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0));
  const start = shiftDateKey(first.toISOString().slice(0, 10), -first.getUTCDay());
  const requiredCells = first.getUTCDay() + last.getUTCDate();
  const cellCount = requiredCells <= 35 ? 35 : 42;
  return Array.from({ length: cellCount }, (_, index) => shiftDateKey(start, index));
}

export function eventDateRange(event: Pick<CalendarEvent, "startsAt" | "endsAt">) {
  const startKey = dateKeyInSingapore(event.startsAt);
  if (!event.endsAt) return { startKey, endKey: startKey };
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const inclusiveEnd = end.getTime() > start.getTime() ? new Date(end.getTime() - 1) : end;
  return { startKey, endKey: dateKeyInSingapore(inclusiveEnd) };
}

export function eventHref(event: Pick<CalendarEvent, "id" | "status">) {
  return event.status === "ongoing"
    ? `/coordinator/events/${event.id}/operations`
    : `/coordinator/events/${event.id}/lifecycle`;
}

export function readinessLabel(event: CalendarEvent) {
  if (event.status === "archived") return "Complete";
  if (event.status === "awaiting_closure") return "Closure required";
  if (event.status === "upcoming") return "Ready for delivery";
  if (event.status === "create") return "Complete event setup";
  const actions = Number(event.businessConfirmed < event.businessTarget)
    + Number(event.volunteerConfirmed < event.volunteerTarget)
    + Number(!event.participantReviewed);
  return actions === 0 ? "Ready to progress" : `${actions} outstanding ${actions === 1 ? "action" : "actions"}`;
}
