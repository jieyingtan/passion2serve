import { CalendarDays, CalendarPlus, Clock3, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getTranslations, formatDate, formatDateShort } from "@/lib/i18n";
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.calendar.title}</h1>
        <p className="mt-2 text-muted-foreground">{t.calendar.subtitle}</p>
      </div>
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
      ) : (
        <div className="space-y-4">
          {entries.map(({ registration, event }) => {
            const organisation = Array.isArray(event!.beneficiary_organisations)
              ? event!.beneficiary_organisations[0]
              : event!.beneficiary_organisations;
            const date = new Date(event!.starts_at);
            const dateShort = formatDateShort(date, lang);
            const tr = translationByEvent.get(event!.id);
            const displayName = tr?.name ?? event!.name;
            const displayVenue = tr?.venue ?? event!.venue;
            return (
              <Card className="border-0" key={registration.id}>
                <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
                  <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary text-center text-primary-foreground">
                    <span className="text-xs uppercase">{dateShort.month}</span>
                    <strong className="-mt-3 text-2xl">{dateShort.day}</strong>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold">{displayName}</h2>
                      <Badge variant={registration.status === "waitlisted" ? "warning" : "success"}>
                        {registration.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {organisation?.name} · {event!.event_type}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                      <span className="flex items-center gap-1.5">
                        <Clock3 className="size-4 text-primary" />
                        {formatDate(date, lang)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="size-4 text-primary" />
                        {displayVenue}
                      </span>
                    </div>
                  </div>
                  {registration.status !== "waitlisted" && (
                    <Button asChild className="w-full sm:w-auto" variant="outline">
                      <a href={`/api/calendar/${event!.id}`}>
                        <CalendarPlus className="size-4" />
                        {t.calendar.addToCalendar}
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
