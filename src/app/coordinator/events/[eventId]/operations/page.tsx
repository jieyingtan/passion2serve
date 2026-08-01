import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Building2, Check, Clock3, Pencil, Sparkles, UserRoundCheck, UsersRound, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getEventStage, type EventStage } from "@/lib/events/stages";
import { createClient } from "@/lib/supabase/server";

import { updateBusinessStatus, updateVolunteerStatus } from "./actions";
import { AiShortlistForm } from "./ai-shortlist-form";
import { OutreachSendForm } from "./outreach-send-form";
import { moveReadyEventToUpcoming } from "../lifecycle/actions";
import { VolunteerImportForm } from "./volunteer-import-form";

function percent(value: number, target: number) {
  return target ? Math.min(100, Math.round(value / target * 100)) : 100;
}

function statusVariant(status: string) {
  return status === "confirmed" ? "success" as const : status === "declined" ? "secondary" as const : "warning" as const;
}

const selectionPriority: Record<string, number> = {
  attended: 7, confirmed: 6, awaiting_response: 5, contacted: 4,
  recommended: 3, not_contacted: 3, declined: 2, no_show: 1,
};

const responseStatuses = [
  { value: "awaiting_response", label: "Awaiting", icon: Clock3 },
  { value: "confirmed", label: "Confirmed", icon: Check },
  { value: "declined", label: "Declined", icon: X },
] as const;

function OutreachActions({
  action,
  eventId,
  selectionId,
  selectionField,
  recipientType,
  currentStatus,
}: {
  action: (formData: FormData) => Promise<void>;
  eventId: string;
  selectionId: string;
  selectionField: "eventBusinessId" | "eventVolunteerId";
  recipientType: "business" | "volunteer";
  currentStatus: string;
}) {
  return (
    <div className="flex w-full flex-col gap-2.5 md:w-[390px]">
      <OutreachSendForm eventId={eventId} recipientType={recipientType} selectionId={selectionId} />
      <div aria-label="Update outreach status" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
        {responseStatuses.map(({ value, label, icon: Icon }) => {
          const selected = currentStatus === value;
          return (
            <form action={action} key={value}>
              <input name="eventId" type="hidden" value={eventId} />
              <input name={selectionField} type="hidden" value={selectionId} />
              <input name="status" type="hidden" value={value} />
              <Button
                aria-pressed={selected}
                className={selected
                  ? value === "confirmed"
                    ? "w-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                    : value === "awaiting_response"
                      ? "w-full bg-amber-100 text-amber-900 shadow-sm hover:bg-amber-100"
                      : "w-full bg-background text-foreground shadow-sm hover:bg-background"
                  : "w-full text-muted-foreground hover:text-foreground"}
                size="sm"
                type="submit"
                variant="ghost"
              >
                <Icon className="size-3.5" />
                <span className="max-[420px]:sr-only">{label}</span>
              </Button>
            </form>
          );
        })}
      </div>
    </div>
  );
}

export default async function EventOperationsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("id, name, event_type, starts_at, venue, volunteer_target, business_target, organisation_id, status, participant_reviewed_at, beneficiary_organisations(name)").eq("id", eventId).maybeSingle();
  if (!event) notFound();
  if (event.status !== "ongoing") redirect(`/coordinator/events/${event.id}/lifecycle`);

  const [{ data: selectedBusinesses }, { data: selectedVolunteers }] = await Promise.all([
    supabase.from("event_businesses").select("id, business_id, match_score, match_explanation, status, contacted_at, businesses(id, name, contact_name, phone, capabilities)").eq("event_id", eventId).order("match_score", { ascending: false }),
    supabase.from("event_volunteers").select("id, volunteer_id, match_score, match_explanation, status, contacted_at, volunteers(id, full_name, email, phone, interests, skills, source)").eq("event_id", eventId).order("match_score", { ascending: false }),
  ]);

  const organisation = Array.isArray(event.beneficiary_organisations) ? event.beneficiary_organisations[0] : event.beneficiary_organisations;
  const eventDate = new Intl.DateTimeFormat("en-SG", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Singapore" }).format(new Date(event.starts_at));
  const orderedBusinesses = [...(selectedBusinesses ?? [])].sort((a, b) => (selectionPriority[b.status] ?? 0) - (selectionPriority[a.status] ?? 0) || b.match_score - a.match_score);
  const cleanSelectedBusinesses = orderedBusinesses.filter((selection, index) => {
    const business = Array.isArray(selection.businesses) ? selection.businesses[0] : selection.businesses;
    const key = business?.name.trim().toLowerCase();
    return key && orderedBusinesses.findIndex((candidate) => {
      const value = Array.isArray(candidate.businesses) ? candidate.businesses[0] : candidate.businesses;
      return value?.name.trim().toLowerCase() === key;
    }) === index;
  });
  const orderedVolunteers = [...(selectedVolunteers ?? [])].sort((a, b) => (selectionPriority[b.status] ?? 0) - (selectionPriority[a.status] ?? 0) || b.match_score - a.match_score);
  const cleanSelectedVolunteers = orderedVolunteers.filter((selection, index) => {
    const volunteer = Array.isArray(selection.volunteers) ? selection.volunteers[0] : selection.volunteers;
    const key = volunteer?.full_name.trim().toLowerCase();
    return key && orderedVolunteers.findIndex((candidate) => {
      const value = Array.isArray(candidate.volunteers) ? candidate.volunteers[0] : candidate.volunteers;
      return value?.full_name.trim().toLowerCase() === key;
    }) === index;
  });
  const confirmedBusinesses = cleanSelectedBusinesses.filter((item) => item.status === "confirmed").length;
  const confirmedVolunteers = cleanSelectedVolunteers.filter((item) => item.status === "confirmed").length;
  const stage = getEventStage(event.status as EventStage);
  const outreachReady = confirmedBusinesses >= event.business_target && confirmedVolunteers >= event.volunteer_target;
  const readyForUpcoming = outreachReady && Boolean(event.participant_reviewed_at);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-primary" href={stage.href}><ArrowLeft className="size-4" /> Back to {stage.label} events</Link>
        <div className="mt-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div><p className="text-sm font-semibold text-primary">Ongoing event operations</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{event.name}</h1><p className="mt-2 text-muted-foreground">{organisation?.name} · {eventDate} · {event.venue}</p></div>
          <div className="grid gap-2 sm:flex sm:flex-wrap"><Button asChild className="w-full sm:w-auto" variant="outline"><Link href={`/coordinator/events/${event.id}/edit`}><Pencil className="size-4"/>Edit requirements</Link></Button><Button asChild className="w-full sm:w-auto" variant="outline"><Link href={`/coordinator/events/${event.id}/participants`}>Manage participants</Link></Button></div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-0"><CardContent className="p-5"><div className="flex justify-between"><span className="font-semibold">Business readiness</span><strong>{confirmedBusinesses}/{event.business_target}</strong></div><Progress className="mt-3" label="Business readiness" value={percent(confirmedBusinesses, event.business_target)} /></CardContent></Card>
        <Card className="border-0"><CardContent className="p-5"><div className="flex justify-between"><span className="font-semibold">Volunteer readiness</span><strong>{confirmedVolunteers}/{event.volunteer_target}</strong></div><Progress className="mt-3" label="Volunteer readiness" value={percent(confirmedVolunteers, event.volunteer_target)} /></CardContent></Card>
      </div>

      <Card className="border-0 bg-accent"><CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"><div><strong className="flex items-center gap-2"><Sparkles className="size-5 text-primary"/>AI-powered matching</strong><p className="mt-1 text-sm text-muted-foreground">The outreach lists start empty. Generate a shortlist to match and add both businesses and volunteers for this event.</p></div><AiShortlistForm eventId={event.id} hasShortlist={Boolean(cleanSelectedBusinesses.length || cleanSelectedVolunteers.length)} /></CardContent></Card>

      <section className="space-y-5">
        <div><h2 className="flex items-center gap-2 text-2xl font-bold"><Building2 className="size-6 text-primary" /> Business outreach</h2><p className="mt-1 text-muted-foreground">Send a personalised WhatsApp template through Meta Cloud API and record the response.</p></div>
        {cleanSelectedBusinesses.length === 0 && <Card className="border-dashed bg-transparent"><CardContent className="p-6 text-sm text-muted-foreground">No businesses have been shortlisted yet. Generate the AI shortlist to begin outreach.</CardContent></Card>}
        <div className="space-y-3">{cleanSelectedBusinesses.map((selection) => { const business = Array.isArray(selection.businesses) ? selection.businesses[0] : selection.businesses; if (!business) return null; return <Card className="border border-border/60 shadow-sm" key={selection.id}><CardContent className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-base">{business.name}</strong><Badge variant={statusVariant(selection.status)}>{selection.status.replaceAll("_", " ")}</Badge><Badge variant="outline">{selection.match_score}% match</Badge></div><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{selection.match_explanation}</p></div><OutreachActions action={updateBusinessStatus} currentStatus={selection.status} eventId={event.id} recipientType="business" selectionField="eventBusinessId" selectionId={selection.id} /></CardContent></Card>; })}</div>
      </section>

      <section className="space-y-5">
        <div><h2 className="flex items-center gap-2 text-2xl font-bold"><UsersRound className="size-6 text-primary" /> Volunteer matching</h2><p className="mt-1 text-muted-foreground">Matches use imported interests and skills from Giving.sg or the PTS registration form.</p></div>
        <VolunteerImportForm eventId={event.id}/>
        {cleanSelectedVolunteers.length === 0 && <Card className="border-dashed bg-transparent"><CardContent className="p-6 text-sm text-muted-foreground">No volunteers have been shortlisted yet. Import volunteers if needed, then generate the AI shortlist.</CardContent></Card>}
        <div className="space-y-3">{cleanSelectedVolunteers.map((selection) => { const volunteer = Array.isArray(selection.volunteers) ? selection.volunteers[0] : selection.volunteers; if (!volunteer) return null; return <Card className="border border-border/60 shadow-sm" key={selection.id}><CardContent className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-base">{volunteer.full_name}</strong><Badge variant={statusVariant(selection.status)}>{selection.status.replaceAll("_", " ")}</Badge><Badge variant="outline">{selection.match_score}% match</Badge></div><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{selection.match_explanation}</p></div><OutreachActions action={updateVolunteerStatus} currentStatus={selection.status} eventId={event.id} recipientType="volunteer" selectionField="eventVolunteerId" selectionId={selection.id} /></CardContent></Card>; })}</div>
      </section>

      <Card className="border-0"><CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"><div><strong>Participant list review</strong><p className="mt-1 text-sm text-muted-foreground">Review eligible invitations and registrations, then complete the review from the participant page.</p></div>{event.participant_reviewed_at?<Badge variant="success">Reviewed</Badge>:<Button asChild variant="outline"><Link href={`/coordinator/events/${event.id}/participants`}>Review participant list</Link></Button>}</CardContent></Card>

      <Card className={readyForUpcoming ? "border-0 bg-emerald-50" : "border-0 bg-accent"}>
        <CardContent className="flex flex-col justify-between gap-5 p-5 sm:flex-row sm:items-center">
          <div className="flex gap-3">
            <UserRoundCheck className="mt-0.5 size-6 shrink-0 text-primary" />
            <div>
              <strong>{readyForUpcoming ? "All ongoing requirements are complete." : "Complete the ongoing requirements"}</strong>
              <p className="mt-1 text-sm text-muted-foreground">The event moves only when you select Proceed to Upcoming.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant={confirmedBusinesses >= event.business_target ? "success" : "warning"}>Businesses {confirmedBusinesses}/{event.business_target}</Badge>
                <Badge variant={confirmedVolunteers >= event.volunteer_target ? "success" : "warning"}>Volunteers {confirmedVolunteers}/{event.volunteer_target}</Badge>
                <Badge variant={event.participant_reviewed_at ? "success" : "warning"}>Participants {event.participant_reviewed_at ? "reviewed" : "pending review"}</Badge>
              </div>
            </div>
          </div>
          {readyForUpcoming ? (
            <form action={moveReadyEventToUpcoming} className="w-full sm:w-auto">
              <input name="eventId" type="hidden" value={event.id}/>
              <Button className="w-full sm:w-auto" type="submit">Proceed to Upcoming</Button>
            </form>
          ) : (
            <Button className="w-full sm:w-auto" disabled type="button">Proceed to Upcoming</Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
