import { CalendarPlus, CheckCircle2, MapPin, Sparkles, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getTranslations, formatDate } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/server/auth";

import { EventRegistrationButton } from "./registration-button";

export default async function ParticipantEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string; signup?: string; wallet?: string }>;
}) {
  const query = await searchParams;
  const profile = await getCurrentProfile();
  const lang = profile?.preferredLanguage ?? "en";
  const t = getTranslations(lang);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: events } = await supabase
    .from("events")
    .select("id,name,event_type,description,starts_at,venue,status,participant_capacity,course_id,beneficiary_organisations(name),courses(name,description)")
    .in("status", ["ongoing", "upcoming"])
    .order("starts_at");
  const eventIds = (events ?? []).map((e) => e.id);
  const { data: translations } = eventIds.length > 0
    ? await supabase.from("event_translations").select("event_id,name,description,venue").eq("language", lang).in("event_id", eventIds)
    : { data: [] };
  const translationByEvent = new Map((translations ?? []).map((tr) => [tr.event_id, tr]));
  const { data: registrations } = user
    ? await supabase.from("registrations").select("event_id, status").eq("participant_id", user.id)
    : { data: [] };
  const registrationByEvent = new Map((registrations ?? []).map((registration) => [registration.event_id, registration.status]));
  const [{ data: dependencies }, { data: attendance }] = user ? await Promise.all([
    supabase.from("course_prerequisites").select("course_id,prerequisite_course_id,courses!course_prerequisites_prerequisite_course_id_fkey(name)"),
    supabase.from("attendance").select("events(course_id)").eq("participant_id", user.id),
  ]) : [{ data: [] }, { data: [] }];
  const completedCourseIds = new Set((attendance ?? []).map((record) => { const event = Array.isArray(record.events) ? record.events[0] : record.events; return event?.course_id; }).filter(Boolean));
  const requirementsByCourse = new Map<string, { id: string; name: string }[]>();
  (dependencies ?? []).forEach((dependency) => { const course = Array.isArray(dependency.courses) ? dependency.courses[0] : dependency.courses; requirementsByCourse.set(dependency.course_id, [...(requirementsByCourse.get(dependency.course_id) ?? []), { id: dependency.prerequisite_course_id, name: course?.name ?? "Required course" }]); });

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-primary">
          <Sparkles className="size-4" /> {t.discover.badge}
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">{t.discover.title}</h1>
        <p className="mt-2 text-muted-foreground">{t.discover.subtitle}</p>
        {query.signup === "1" && (
          <p className="mt-5 rounded-xl bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-800" role="status">
            {t.discover.signupSuccess} {query.wallet === "pending" ? t.discover.walletPending : t.discover.walletSent}
          </p>
        )}
      </div>
      {!events?.length ? (
        <Card className="border-0"><CardContent className="grid min-h-64 place-items-center p-8 text-center"><div><CalendarPlus className="mx-auto size-10 text-primary" /><h2 className="mt-4 text-xl font-bold">{t.discover.noEvents}</h2><p className="mt-2 text-muted-foreground">{t.discover.noEventsSub}</p></div></CardContent></Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {events.map((event) => {
            const organisation = Array.isArray(event.beneficiary_organisations) ? event.beneficiary_organisations[0] : event.beneficiary_organisations;
            const registrationStatus = registrationByEvent.get(event.id);
            const course = Array.isArray(event.courses) ? event.courses[0] : event.courses;
            const requirements = requirementsByCourse.get(event.course_id ?? "") ?? [];
            const unmet = requirements.filter((requirement) => !completedCourseIds.has(requirement.id));
            const eligible = unmet.length === 0;
            const tr = translationByEvent.get(event.id);
            const displayName = tr?.name ?? event.name;
            const displayDescription = tr?.description ?? event.description;
            const displayVenue = tr?.venue ?? event.venue;
            return (
              <Card className={`overflow-hidden border-0 ${query.event === event.id ? "ring-2 ring-primary" : ""}`} key={event.id}>
                <div className="h-2 bg-primary" />
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant={registrationStatus ? "success" : "warning"}>{registrationStatus ? <><CheckCircle2 className="mr-1 size-3" /> {t.discover.statusesLookup[registrationStatus] ?? registrationStatus}</> : t.discover.open}</Badge>
                    <span className="text-xs font-semibold text-muted-foreground">{event.status.replaceAll("_", " ")}</span>
                  </div>
                  <p className="mt-6 text-xs font-bold uppercase tracking-wider text-primary">{event.event_type}</p>
                  <h2 className="mt-2 min-h-14 text-xl font-bold">{displayName}</h2>
                  <p className="mt-2 text-sm font-semibold text-muted-foreground">{organisation?.name}</p>
                  {displayDescription && <p className="mt-3 text-sm text-muted-foreground">{displayDescription}</p>}
                  <div className="mt-5 space-y-2 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2"><CalendarPlus className="size-4" /> {formatDate(event.starts_at, lang)}</p>
                    <p className="flex items-center gap-2"><MapPin className="size-4" /> {displayVenue}</p>
                    <p className="flex items-center gap-2"><Users className="size-4" /> {event.participant_capacity ? t.discover.capacity.replace("{count}", String(event.participant_capacity)) : t.discover.openCapacity}</p>
                  </div>
                  {course && <div className={`mt-4 rounded-lg px-3 py-2 text-sm ${eligible ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}><strong>{course.name}</strong><p className="mt-1 text-xs">{eligible ? t.discover.eligible : t.discover.completeFirst.replace("{courses}", unmet.map((item) => item.name).join(", "))}</p></div>}
                  <EventRegistrationButton eligible={eligible} eventId={event.id} status={registrationStatus} t={t} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
