import { CalendarPlus, CheckCircle2, MapPin, Sparkles, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

import { EventRegistrationButton } from "./registration-button";

export default async function ParticipantEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string; signup?: string; wallet?: string }>;
}) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: events } = await supabase
    .from("events")
    .select("id,name,event_type,description,starts_at,venue,status,participant_capacity,course_id,beneficiary_organisations(name),courses(name,description)")
    .in("status", ["ongoing", "upcoming"])
    .order("starts_at");
  const { data: registrations } = user
    ? await supabase.from("registrations").select("event_id, status").eq("participant_id", user.id)
    : { data: [] };
  const registrationByEvent = new Map((registrations ?? []).map((registration) => [registration.event_id, registration.status]));
  const [{data:dependencies},{data:attendance}] = user ? await Promise.all([
    supabase.from("course_prerequisites").select("course_id,prerequisite_course_id,courses!course_prerequisites_prerequisite_course_id_fkey(name)"),
    supabase.from("attendance").select("events(course_id)").eq("participant_id",user.id),
  ]) : [{data:[]},{data:[]}];
  const completedCourseIds=new Set((attendance??[]).map(record=>{const event=Array.isArray(record.events)?record.events[0]:record.events;return event?.course_id}).filter(Boolean));
  const requirementsByCourse=new Map<string,{id:string;name:string}[]>(); (dependencies??[]).forEach(dependency=>{const course=Array.isArray(dependency.courses)?dependency.courses[0]:dependency.courses;requirementsByCourse.set(dependency.course_id,[...(requirementsByCourse.get(dependency.course_id)??[]),{id:dependency.prerequisite_course_id,name:course?.name??"Required course"}]);});

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-primary">
          <Sparkles className="size-4" /> Discover and register
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Upcoming opportunities</h1>
        <p className="mt-2 text-muted-foreground">Register for an event or confirm an invitation from a beneficiary organisation.</p>
        {query.signup === "1" && (
          <p className="mt-5 rounded-xl bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-800" role="status">
            Account created successfully. {query.wallet === "pending" ? "Your wallet pass email is pending provider configuration." : "Your membership wallet pass has been emailed to you."}
          </p>
        )}
      </div>
      {!events?.length ? (
        <Card className="border-0"><CardContent className="grid min-h-64 place-items-center p-8 text-center"><div><CalendarPlus className="mx-auto size-10 text-primary" /><h2 className="mt-4 text-xl font-bold">No events are open yet</h2><p className="mt-2 text-muted-foreground">Ongoing and upcoming events will appear here.</p></div></CardContent></Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {events.map((event) => {
            const organisation = Array.isArray(event.beneficiary_organisations) ? event.beneficiary_organisations[0] : event.beneficiary_organisations;
            const registrationStatus = registrationByEvent.get(event.id);
            const course=Array.isArray(event.courses)?event.courses[0]:event.courses; const requirements=requirementsByCourse.get(event.course_id??"")??[]; const unmet=requirements.filter(requirement=>!completedCourseIds.has(requirement.id)); const eligible=unmet.length===0;
            return (
              <Card className={`overflow-hidden border-0 ${query.event === event.id ? "ring-2 ring-primary" : ""}`} key={event.id}>
                <div className="h-2 bg-primary" />
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant={registrationStatus ? "success" : "warning"}>{registrationStatus ? <><CheckCircle2 className="mr-1 size-3" /> {registrationStatus.replaceAll("_", " ")}</> : "Open"}</Badge>
                    <span className="text-xs font-semibold text-muted-foreground">{event.status.replaceAll("_", " ")}</span>
                  </div>
                  <p className="mt-6 text-xs font-bold uppercase tracking-wider text-primary">{event.event_type}</p>
                  <h2 className="mt-2 min-h-14 text-xl font-bold">{event.name}</h2>
                  <p className="mt-2 text-sm font-semibold text-muted-foreground">{organisation?.name}</p>
                  {event.description&&<p className="mt-3 text-sm text-muted-foreground">{event.description}</p>}
                  <div className="mt-5 space-y-2 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2"><CalendarPlus className="size-4" /> {new Intl.DateTimeFormat("en-SG", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Singapore" }).format(new Date(event.starts_at))}</p>
                    <p className="flex items-center gap-2"><MapPin className="size-4" /> {event.venue}</p>
                    <p className="flex items-center gap-2"><Users className="size-4" /> {event.participant_capacity?`Capacity: ${event.participant_capacity}`:"Open capacity"}</p>
                  </div>
                  {course&&<div className={`mt-4 rounded-lg px-3 py-2 text-sm ${eligible?"bg-emerald-50 text-emerald-800":"bg-amber-50 text-amber-900"}`}><strong>{course.name}</strong><p className="mt-1 text-xs">{eligible?"You meet the course prerequisites.":`Complete first: ${unmet.map(item=>item.name).join(", ")}`}</p></div>}
                  <EventRegistrationButton eligible={eligible} eventId={event.id} status={registrationStatus} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
