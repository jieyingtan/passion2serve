import type { CalendarEvent } from "@/lib/events/calendar";
import type { EventStage } from "@/lib/events/stages";
import { createClient } from "@/lib/supabase/server";

interface StatusRelation { status: string }

function countConfirmed(value: unknown) {
  return Array.isArray(value)
    ? (value as StatusRelation[]).filter((item) => item.status === "confirmed" || item.status === "attended").length
    : 0;
}

export async function listCoordinatorCalendarEvents() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, name, event_type, starts_at, ends_at, venue, status, volunteer_target, business_target, participant_capacity, participant_reviewed_at, beneficiary_organisations(name), event_businesses(status), event_volunteers(status), registrations(status)")
    .order("starts_at", { ascending: true });

  if (error) return { events: [] as CalendarEvent[], error: error.message };

  const events = (data ?? []).map((event) => {
    const organisation = Array.isArray(event.beneficiary_organisations)
      ? event.beneficiary_organisations[0]
      : event.beneficiary_organisations;
    return {
      id: event.id as string,
      name: event.name as string,
      eventType: event.event_type as string,
      startsAt: event.starts_at as string,
      endsAt: event.ends_at as string | null,
      venue: event.venue as string,
      status: event.status as EventStage,
      organisationName: organisation?.name ?? "No organisation",
      participantCapacity: event.participant_capacity as number | null,
      registrationCount: Array.isArray(event.registrations)
        ? (event.registrations as StatusRelation[]).filter((item) => !["cancelled", "ineligible"].includes(item.status)).length
        : 0,
      volunteerTarget: event.volunteer_target as number,
      volunteerConfirmed: countConfirmed(event.event_volunteers),
      businessTarget: event.business_target as number,
      businessConfirmed: countConfirmed(event.event_businesses),
      participantReviewed: Boolean(event.participant_reviewed_at),
    } satisfies CalendarEvent;
  });

  return { events, error: null };
}
