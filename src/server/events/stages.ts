import type { EventStage } from "@/lib/events/stages";
import { createClient } from "@/lib/supabase/server";

export interface StageEvent {
  attendanceCount: number;
  businessTarget: number;
  eventType: string;
  id: string;
  name: string;
  participantCapacity: number | null;
  registrationCount: number;
  startsAt: string;
  status: EventStage;
  venue: string;
  volunteerTarget: number;
}

interface RelationCount {
  count: number;
}

function readRelationCount(value: unknown) {
  if (!Array.isArray(value)) return 0;
  const item = value[0] as RelationCount | undefined;
  return typeof item?.count === "number" ? item.count : 0;
}

export async function listEventsByStage(status: EventStage) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, name, event_type, starts_at, venue, volunteer_target, business_target, participant_capacity, status, registrations(count), attendance(count)",
    )
    .eq("status", status)
    .order("starts_at", { ascending: status !== "archived" });

  if (error) {
    return { events: [] as StageEvent[], error: error.message };
  }

  const events = (data ?? []).map((event) => ({
    id: event.id as string,
    name: event.name as string,
    eventType: event.event_type as string,
    startsAt: event.starts_at as string,
    venue: event.venue as string,
    volunteerTarget: event.volunteer_target as number,
    businessTarget: event.business_target as number,
    participantCapacity: event.participant_capacity as number | null,
    status: event.status as EventStage,
    registrationCount: readRelationCount(event.registrations),
    attendanceCount: readRelationCount(event.attendance),
  }));

  return { events, error: null };
}

export async function getEventStageCounts() {
  const counts: Record<EventStage, number> = {
    create: 0,
    ongoing: 0,
    upcoming: 0,
    awaiting_closure: 0,
    archived: 0,
  };
  const supabase = await createClient();
  const { data, error } = await supabase.from("events").select("status");

  if (error) {
    return { counts, error: error.message };
  }

  for (const event of data ?? []) {
    const status = event.status as EventStage;
    if (status in counts) counts[status] += 1;
  }
  return { counts, error: null };
}

