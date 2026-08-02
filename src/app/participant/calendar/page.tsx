import { CalendarDays } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { ParticipantCalendar } from "@/components/participant/participant-calendar";
import { dateKeyInSingapore } from "@/lib/events/calendar";
import { getTranslations } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/server/auth";

export default async function ParticipantCalendarPage() {
  const profile = await getCurrentProfile();
  const lang = profile?.preferredLanguage ?? "en";
  const t = getTranslations(lang);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: registrations } = user
    ? await supabase
        .from("registrations")
        .select("id,status,events(id,name,starts_at,ends_at,venue,event_type,beneficiary_organisations(name))")
        .eq("participant_id", user.id)
        .in("status", ["registered", "confirmed", "waitlisted"])
        .order("created_at")
    : { data: [] };
  const eventIds = (registrations ?? [])
    .map((r) => {
      const event = Array.isArray(r.events) ? r.events[0] : r.events;
      return event?.id;
    })
    .filter(Boolean) as string[];
  const { data: translations } = eventIds.length > 0
    ? await supabase.from("event_translations").select("event_id,name,venue").eq("language", lang).in("event_id", eventIds)
    : { data: [] };
  const translationByEvent = new Map((translations ?? []).map((tr) => [tr.event_id, tr]));
  const entries = (registrations ?? [])
    .map((registration) => ({
      registration,
      event: Array.isArray(registration.events) ? registration.events[0] : registration.events,
    }))
    .filter((entry) => entry.event)
    .sort((a, b) => new Date(a.event!.starts_at).getTime() - new Date(b.event!.starts_at).getTime());

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader eyebrow="Your schedule" title={t.calendar.title} description={t.calendar.subtitle} />
      {!entries.length ? (
        <Card className="border-0">
          <CardContent className="grid min-h-[280px] place-items-center p-7 text-center sm:min-h-[360px] sm:p-10">
            <div>
              <CalendarDays className="mx-auto size-12 text-primary" />
              <h2 className="mt-5 text-xl font-bold">{t.calendar.noEvents}</h2>
              <p className="mt-2 text-muted-foreground">{t.calendar.noEventsSub}</p>
            </div>
          </CardContent>
        </Card>
      ) : <ParticipantCalendar events={entries.map(({registration,event})=>{
            const organisation = Array.isArray(event!.beneficiary_organisations)
              ? event!.beneficiary_organisations[0]
              : event!.beneficiary_organisations;
            const tr = translationByEvent.get(event!.id);
            return {id:event!.id,name:tr?.name??event!.name,startsAt:event!.starts_at,venue:tr?.venue??event!.venue,status:registration.status,organisation:organisation?.name??""};
          })} todayKey={dateKeyInSingapore(new Date())}/>}
    </div>
  );
}
