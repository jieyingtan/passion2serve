import { CalendarPlus, CheckCircle2, MailCheck, MapPin, Sparkles, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, getTranslations } from "@/lib/i18n";
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

  const eventIds = (events ?? []).map((event) => event.id);
  const [{ data: translations }, registrationResult, invitationResult] = await Promise.all([
    eventIds.length
      ? supabase.from("event_translations").select("event_id,name,description,venue").eq("language", lang).in("event_id", eventIds)
      : Promise.resolve({ data: [] }),
    user
      ? supabase.from("registrations").select("event_id,status").eq("participant_id", user.id)
      : Promise.resolve({ data: [] }),
    user
      ? supabase.from("participant_invitations").select("event_id").eq("auth_user_id", user.id)
      : Promise.resolve({ data: [] }),
  ]);
  const translationByEvent = new Map((translations ?? []).map((translation) => [translation.event_id, translation]));
  const registrationByEvent = new Map((registrationResult.data ?? []).map((registration) => [registration.event_id, registration.status]));
  const invitedEventIds = new Set((invitationResult.data ?? []).map((invitation) => invitation.event_id));

  const [{ data: dependencies }, { data: attendance }] = user ? await Promise.all([
    supabase.from("course_prerequisites").select("course_id,prerequisite_course_id,courses!course_prerequisites_prerequisite_course_id_fkey(name)"),
    supabase.from("attendance").select("events(course_id)").eq("participant_id", user.id),
  ]) : [{ data: [] }, { data: [] }];
  const completedCourseIds = new Set((attendance ?? []).map((record) => {
    const event = Array.isArray(record.events) ? record.events[0] : record.events;
    return event?.course_id;
  }).filter(Boolean));
  const requirementsByCourse = new Map<string, { id: string; name: string }[]>();
  (dependencies ?? []).forEach((dependency) => {
    const course = Array.isArray(dependency.courses) ? dependency.courses[0] : dependency.courses;
    requirementsByCourse.set(dependency.course_id, [
      ...(requirementsByCourse.get(dependency.course_id) ?? []),
      { id: dependency.prerequisite_course_id, name: course?.name ?? "Required course" },
    ]);
  });

  const invitedEvents = (events ?? []).filter((event) => invitedEventIds.has(event.id));
  const openEvents = (events ?? []).filter((event) => !invitedEventIds.has(event.id));
  const eventGrid = (eventList: NonNullable<typeof events>, invited: boolean) => eventList.length ? (
    <div className="grid gap-5 lg:grid-cols-3">
      {eventList.map((event) => {
        const organisation = Array.isArray(event.beneficiary_organisations) ? event.beneficiary_organisations[0] : event.beneficiary_organisations;
        const registrationStatus = registrationByEvent.get(event.id);
        const course = Array.isArray(event.courses) ? event.courses[0] : event.courses;
        const requirements = requirementsByCourse.get(event.course_id ?? "") ?? [];
        const unmet = requirements.filter((requirement) => !completedCourseIds.has(requirement.id));
        const eligible = unmet.length === 0;
        const translation = translationByEvent.get(event.id);
        const displayName = translation?.name ?? event.name;
        const displayDescription = translation?.description ?? event.description;
        const displayVenue = translation?.venue ?? event.venue;
        const statusLabel = registrationStatus
          ? t.discover.statusesLookup[registrationStatus] ?? registrationStatus.replaceAll("_", " ")
          : invited ? t.discover.statusesLookup.invited : t.discover.open;

        return (
          <Card className={`overflow-hidden border-0 ${query.event === event.id ? "ring-2 ring-primary" : ""}`} key={event.id}>
            <div className={`h-2 ${invited ? "bg-secondary" : "bg-primary"}`} />
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-3">
                <Badge variant={invited || registrationStatus ? "success" : "warning"}>
                  {invited && !registrationStatus ? <MailCheck className="mr-1 size-3" /> : registrationStatus ? <CheckCircle2 className="mr-1 size-3" /> : null}
                  {statusLabel}
                </Badge>
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
              {course && (
                <div className={`mt-4 rounded-lg px-3 py-2 text-sm ${eligible ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
                  <strong>{course.name}</strong>
                  <p className="mt-1 text-xs">{eligible ? t.discover.eligible : t.discover.completeFirst.replace("{courses}", unmet.map((item) => item.name).join(", "))}</p>
                </div>
              )}
              <EventRegistrationButton eligible={eligible} eventId={event.id} invited={invited} status={registrationStatus} t={t} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  ) : (
    <Card className="border-dashed bg-transparent">
      <CardContent className="p-8 text-center text-sm text-muted-foreground">
        {invited ? t.discover.noInvitations : t.discover.noOtherEvents}
      </CardContent>
    </Card>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-10">
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
        <>
          <section className="space-y-4"><div><h2 className="text-2xl font-bold">{t.discover.invitedEvents}</h2><p className="mt-1 text-sm text-muted-foreground">{t.discover.invitedEventsSub}</p></div>{eventGrid(invitedEvents, true)}</section>
          <section className="space-y-4"><div><h2 className="text-2xl font-bold">{t.discover.otherEvents}</h2><p className="mt-1 text-sm text-muted-foreground">{t.discover.otherEventsSub}</p></div>{eventGrid(openEvents, false)}</section>
        </>
      )}
    </div>
  );
}
