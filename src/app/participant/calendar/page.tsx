import { PageHeader } from "@/components/page-header";
import { ParticipantCalendar } from "@/components/coordinator/coordinator-calendar";
import {
  dateKeyInSingapore,
  type CalendarEvent,
  type ParticipantRegistrationStatus,
} from "@/lib/events/calendar";
import { getTranslations } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/server/auth";

export default async function ParticipantCalendarPage() {
  const profile = await getCurrentProfile();
  const lang = profile?.preferredLanguage ?? "en";
  const t = getTranslations(lang);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: registrations, error } = user
    ? await supabase
        .from("registrations")
        .select("id,status,events(id,name,starts_at,ends_at,venue,event_type,status,beneficiary_organisations(name))")
        .eq("participant_id", user.id)
        .in("status", ["registered", "confirmed", "waitlisted"])
        .order("created_at")
    : { data: [], error: null };

  const eventIds = (registrations ?? [])
    .map((registration) => {
      const event = Array.isArray(registration.events) ? registration.events[0] : registration.events;
      return event?.id;
    })
    .filter(Boolean) as string[];
  const { data: translations } = eventIds.length > 0
    ? await supabase.from("event_translations").select("event_id,name,venue").eq("language", lang).in("event_id", eventIds)
    : { data: [] };
  const translationByEvent = new Map((translations ?? []).map((translation) => [translation.event_id, translation]));

  const events: CalendarEvent[] = (registrations ?? []).flatMap((registration) => {
    const event = Array.isArray(registration.events) ? registration.events[0] : registration.events;
    if (!event) return [];
    const organisation = Array.isArray(event.beneficiary_organisations)
      ? event.beneficiary_organisations[0]
      : event.beneficiary_organisations;
    const translation = translationByEvent.get(event.id);

    return [{
      businessConfirmed: 0,
      businessTarget: 0,
      endsAt: event.ends_at,
      eventType: event.event_type,
      id: event.id,
      name: translation?.name ?? event.name,
      organisationName: organisation?.name ?? "Organisation",
      participantCapacity: null,
      participantReviewed: false,
      registrationCount: 0,
      registrationStatus: registration.status as ParticipantRegistrationStatus,
      startsAt: event.starts_at,
      status: event.status as CalendarEvent["status"],
      venue: translation?.venue ?? event.venue,
      volunteerConfirmed: 0,
      volunteerTarget: 0,
    }];
  });

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader eyebrow="Your schedule" title={t.calendar.title} description={t.calendar.subtitle} />
      {error ? (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          Calendar events could not be loaded: {error.message}
        </p>
      ) : (
        <ParticipantCalendar
          addToCalendarLabel={t.calendar.addToCalendar}
          emptyMessage={`${t.calendar.noEvents}. ${t.calendar.noEventsSub}`}
          events={events}
          todayKey={dateKeyInSingapore(new Date())}
        />
      )}
    </div>
  );
}
