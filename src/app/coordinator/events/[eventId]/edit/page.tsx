import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isoToSingaporeLocal } from "@/lib/events/datetime";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getEventOrganisations } from "@/server/events";
import { getCourseOptions } from "@/server/courses";

import { EditEventForm } from "./edit-event-form";

export default async function EditEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/coordinator/events/${eventId}/edit`);
  const admin = createAdminClient();
  const [{ data: event }, organisations, courses] = await Promise.all([
    admin.from("events").select("id,name,event_type,description,starts_at,venue,organisation_id,volunteer_target,business_target,participant_capacity,status,course_id").eq("id", eventId).maybeSingle(),
    getEventOrganisations(),
    getCourseOptions(),
  ]);
  if (!event) notFound();
  const { data: assignment } = await admin.from("coordinator_assignments").select("id").eq("coordinator_id", user.id).eq("organisation_id", event.organisation_id).maybeSingle();
  if (!assignment) notFound();
  if (event.status !== "ongoing") redirect(`/coordinator/events/${event.id}/lifecycle`);

  return <div className="mx-auto max-w-5xl space-y-7">
    <div><Link className="inline-flex items-center gap-2 text-sm font-semibold text-primary" href={`/coordinator/events/${event.id}/operations`}><ArrowLeft className="size-4"/>Back to event operations</Link><h1 className="mt-5 text-3xl font-bold tracking-tight">Edit event requirements</h1><p className="mt-2 text-muted-foreground">Update the operational details and targets for {event.name}.</p></div>
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]"><Card className="border-0"><CardHeader><CardTitle>Event details</CardTitle><CardDescription>Changes appear across the dashboard, outreach messages, participant views, and readiness checks.</CardDescription></CardHeader><CardContent><EditEventForm courses={courses} event={{id:event.id,name:event.name,eventType:event.event_type,description:event.description,startsAt:isoToSingaporeLocal(event.starts_at),venue:event.venue,organisationId:event.organisation_id,volunteerTarget:event.volunteer_target,businessTarget:event.business_target,participantCapacity:event.participant_capacity,courseId:event.course_id}} organisations={organisations}/></CardContent></Card>
      <Card className="h-fit border-primary/20 bg-accent shadow-none"><CardContent className="p-6"><Info className="size-6 text-primary"/><h2 className="mt-4 font-bold">Readiness review</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Saving changes resets the participant-list review. Existing partner and volunteer selections remain available, while recommendations refresh from the updated event name and type.</p></CardContent></Card>
    </div>
  </div>;
}
