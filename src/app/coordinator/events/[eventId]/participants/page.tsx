import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MailCheck, Send, UserRoundPlus, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEventStage, type EventStage } from "@/lib/events/stages";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import { InviteParticipantForm } from "./invite-form";
import { MailingListForm } from "./mailing-list-form";
import { ParticipantImportForm } from "./participant-import-form";
import { markParticipantListReviewed, moveReadyEventToUpcoming } from "../lifecycle/actions";
import { removeIneligibleParticipant } from "./actions";

export default async function EventParticipantsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id,name,starts_at,venue,organisation_id,status,business_target,volunteer_target,participant_reviewed_at,course_id,beneficiary_organisations(name),courses(name)")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) {
    notFound();
  }

  const [{ data: invitations }, { count: memberCount }, { count: confirmedBusinesses }, { count: confirmedVolunteers }] = await Promise.all([
    supabase.from("participant_invitations").select("id,full_name,email,status,wallet_delivery_status,email_delivery_status,invitation_source,invited_at,auth_user_id").eq("event_id", eventId).order("invited_at", { ascending: false }),
    supabase.from("beneficiary_organisation_members").select("id", { count: "exact", head: true }).eq("organisation_id", event.organisation_id).eq("active", true),
    supabase.from("event_businesses").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "confirmed"),
    supabase.from("event_volunteers").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "confirmed"),
  ]);
  const organisation = Array.isArray(event.beneficiary_organisations)
    ? event.beneficiary_organisations[0]
    : event.beneficiary_organisations;
  const stage = getEventStage(event.status as EventStage);
  const outreachReady = (confirmedBusinesses ?? 0) >= event.business_target && (confirmedVolunteers ?? 0) >= event.volunteer_target;
  const admin=createAdminClient(); const participantIds=(invitations??[]).map(invitation=>invitation.auth_user_id).filter(Boolean) as string[];
  const [{data:prerequisites},{data:completionRows}]=await Promise.all([
    event.course_id?admin.from("course_prerequisites").select("prerequisite_course_id,courses!course_prerequisites_prerequisite_course_id_fkey(name)").eq("course_id",event.course_id):Promise.resolve({data:[]}),
    participantIds.length?admin.from("attendance").select("participant_id,events(course_id)").in("participant_id",participantIds):Promise.resolve({data:[]}),
  ]);
  const prerequisiteList=(prerequisites??[]).map(item=>({id:item.prerequisite_course_id,name:(Array.isArray(item.courses)?item.courses[0]:item.courses)?.name??"Required course"}));
  const completedByParticipant=new Map<string,Set<string>>(); (completionRows??[]).forEach(row=>{const completedEvent=Array.isArray(row.events)?row.events[0]:row.events;if(completedEvent?.course_id)completedByParticipant.set(row.participant_id,new Set([...(completedByParticipant.get(row.participant_id)??[]),completedEvent.course_id]));});
  const course=Array.isArray(event.courses)?event.courses[0]:event.courses;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-primary" href={stage.href}>
          <ArrowLeft className="size-4" /> Back to {stage.label} events
        </Link>
        <h1 className="mt-5 text-3xl font-bold tracking-tight">Recruit and confirm participants</h1>
        <p className="mt-2 text-muted-foreground">{event.name} · {organisation?.name} · {event.venue}</p>
      </div>

      {event.status === "ongoing" && (
        <Card className={outreachReady ? "border-0 bg-emerald-50" : "border-0 bg-accent"}>
          <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
            <div>
              <strong>{event.participant_reviewed_at ? "Participant list reviewed" : "Complete participant review"}</strong>
              <p className="mt-1 text-sm text-muted-foreground">
                {outreachReady
                  ? "Confirm this list after reviewing it. The event will move to Upcoming automatically."
                  : "Confirm this list after reviewing it. The event will move automatically when the remaining business and volunteer targets are met."}
              </p>
            </div>
            {event.participant_reviewed_at && outreachReady ? (
              <form action={moveReadyEventToUpcoming}>
                <input name="eventId" type="hidden" value={event.id} />
                <Button type="submit">Move to Upcoming</Button>
              </form>
            ) : event.participant_reviewed_at ? <Badge variant="success">Reviewed</Badge> : (
              <form action={markParticipantListReviewed}>
                <input name="eventId" type="hidden" value={event.id} />
                <Button type="submit">{outreachReady ? "Complete review and move to Upcoming" : "Complete participant review"}</Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {course&&<Card className="border-0 bg-accent"><CardContent className="p-5"><strong>Eligibility for {course.name}</strong><p className="mt-1 text-sm text-muted-foreground">{prerequisiteList.length?`Required first: ${prerequisiteList.map(item=>item.name).join(", ")}`:"No prerequisite courses. All participants are eligible."}</p></CardContent></Card>}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-0">
          <CardHeader>
            <span className="mb-3 grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground"><UsersRound className="size-5" /></span>
            <CardTitle>1. Invite the beneficiary mailing list</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              Email every active member of {organisation?.name}. Each email includes the event details, sign-in link, and new-account link.
            </p>
          </CardHeader>
          <CardContent><MailingListForm eventId={eventId} memberCount={memberCount ?? 0} /></CardContent>
        </Card>

        <Card className="border-0">
          <CardHeader>
            <span className="mb-3 grid size-11 place-items-center rounded-xl bg-secondary text-secondary-foreground"><Send className="size-5" /></span>
            <CardTitle>2. Participant self-registration</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              Signed-in participants can discover this event and register or confirm attendance from their participant workspace.
            </p>
          </CardHeader>
          <CardContent>
            <Link className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-semibold hover:bg-accent" href="/participant/events">
              Preview participant events
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0"><CardHeader><CardTitle>Import eligible participants</CardTitle><p className="text-sm text-muted-foreground">Upload a Giving.sg, PTS, or beneficiary Excel/CSV list. Existing accounts are linked without duplication and new participants receive sign-up instructions.</p></CardHeader><CardContent><ParticipantImportForm eventId={event.id}/></CardContent></Card>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card className="border-0">
          <CardHeader>
            <span className="mb-3 grid size-11 place-items-center rounded-xl bg-secondary text-secondary-foreground">
              <UserRoundPlus className="size-5" />
            </span>
            <CardTitle>Invite one participant</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              New people receive an account setup email. Existing Participants are linked without duplication.
            </p>
          </CardHeader>
          <CardContent><InviteParticipantForm eventId={eventId} /></CardContent>
        </Card>

        <Card className="border-0">
          <CardHeader><CardTitle>Invitation status</CardTitle></CardHeader>
          <CardContent>
            {!invitations?.length ? (
              <div className="grid min-h-56 place-items-center rounded-xl border border-dashed text-center">
                <div><MailCheck className="mx-auto size-9 text-primary" /><p className="mt-3 font-semibold">No invitations yet</p></div>
              </div>
            ) : (
              <div className="space-y-3">
                {invitations.map((invitation) => {const completed=completedByParticipant.get(invitation.auth_user_id??"")??new Set<string>();const unmet=prerequisiteList.filter(item=>!completed.has(item.id));return (
                  <div className="flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center" key={invitation.id}>
                    <div>
                      <p className="font-semibold">{invitation.full_name}</p>
                      <p className="text-sm text-muted-foreground">{invitation.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={invitation.status === "accepted" ? "success" : "warning"}>{invitation.status.replaceAll("_", " ")}</Badge>
                      <Badge variant={invitation.email_delivery_status === "sent" ? "success" : "warning"}>{`Email: ${invitation.email_delivery_status}`}</Badge>
                      <Badge>{`Wallet: ${invitation.wallet_delivery_status.replaceAll("_", " ")}`}</Badge>
                      <Badge variant={!invitation.auth_user_id?"secondary":unmet.length?"warning":"success"}>{!invitation.auth_user_id?"Eligibility pending":unmet.length?`Needs ${unmet.map(item=>item.name).join(", ")}`:"Eligible"}</Badge>
                      {invitation.auth_user_id&&unmet.length>0&&<form action={removeIneligibleParticipant}><input name="eventId" type="hidden" value={event.id}/><input name="invitationId" type="hidden" value={invitation.id}/><Button size="sm" type="submit" variant="ghost">Remove from event</Button></form>}
                    </div>
                  </div>
                );})}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
