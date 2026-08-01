import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3, History, Pencil, UserCheck, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatEventDate, getEventStage, type EventStage } from "@/lib/events/stages";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { markParticipantNoShow, markVolunteerAttendance, recordManualAttendance } from "./actions";
import { AttendanceScanner } from "./attendance-scanner";
import { ClosureForm } from "./closure-form";
import { TransitionForm } from "./transition-form";

const nextStage: Record<Exclude<EventStage,"archived">,{status:string;label:string}> = {
  create:{status:"ongoing",label:"Start outreach"}, ongoing:{status:"upcoming",label:"Move to Upcoming"},
  upcoming:{status:"awaiting_closure",label:"Complete event"}, awaiting_closure:{status:"archived",label:"Archive event"},
};

function related<T>(value:T|T[]|null){return Array.isArray(value)?value[0]??null:value;}

export default async function LifecyclePage({params}:{params:Promise<{eventId:string}>}) {
  const {eventId}=await params; const supabase=await createClient(); const admin=createAdminClient();
  const [
    {data:event},{data:history},{data:report},{count:registrationCount},{data:attendanceRecords},
    {count:businesses},{count:confirmedVolunteers},{data:participantRoster},{data:volunteerRoster},
  ] = await Promise.all([
    supabase.from("events").select("id,name,event_type,starts_at,ends_at,venue,status,volunteer_target,business_target,participant_reviewed_at,beneficiary_organisations(name)").eq("id",eventId).maybeSingle(),
    supabase.from("event_status_history").select("id,previous_status,new_status,reason,changed_at").eq("event_id",eventId).order("changed_at",{ascending:false}),
    supabase.from("event_closure_reports").select("participant_attendance,volunteer_attendance,business_participation,beneficiary_reach,outcomes,feedback_summary,impact_summary,publicity_links").eq("event_id",eventId).maybeSingle(),
    admin.from("registrations").select("id",{count:"exact",head:true}).eq("event_id",eventId),
    admin.from("attendance").select("participant_id,scanned_at").eq("event_id",eventId),
    admin.from("event_businesses").select("id",{count:"exact",head:true}).eq("event_id",eventId).eq("status","confirmed"),
    admin.from("event_volunteers").select("id",{count:"exact",head:true}).eq("event_id",eventId).in("status",["confirmed","attended"]),
    admin.from("registrations").select("id,participant_id,status,profiles(full_name,email)").eq("event_id",eventId).order("created_at"),
    admin.from("event_volunteers").select("id,status,volunteers(full_name,email)").eq("event_id",eventId).in("status",["confirmed","attended","no_show"]).order("created_at"),
  ]);
  if(!event)notFound();
  const status=event.status as EventStage; const stage=getEventStage(status); const organisation=related(event.beneficiary_organisations);
  const attendedIds=new Set((attendanceRecords??[]).map(item=>item.participant_id));
  const participantAttendance=attendedIds.size; const volunteerAttendance=(volunteerRoster??[]).filter(item=>item.status==="attended").length;
  const eligibleParticipants=(participantRoster??[]).filter(item=>!["cancelled","ineligible"].includes(item.status)).length;
  const attendancePercent=eligibleParticipants?Math.round(participantAttendance/eligibleParticipants*100):0;

  return <div className="mx-auto max-w-6xl space-y-7">
    <div><Link className="inline-flex items-center gap-2 text-sm font-semibold text-primary" href={stage.href}><ArrowLeft className="size-4"/>Back to {stage.label}</Link><div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><Badge>{stage.label}</Badge><h1 className="mt-2 text-2xl font-bold sm:text-3xl">{event.name}</h1><p className="mt-2 text-muted-foreground">{organisation?.name} · {formatEventDate(event.starts_at)} · {event.venue}</p></div>{status==="ongoing"&&<div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap"><Button asChild className="w-full sm:w-auto" variant="outline"><Link href={`/coordinator/events/${eventId}/edit`}><Pencil className="size-4"/>Edit requirements</Link></Button><Button asChild className="w-full sm:w-auto"><Link href={`/coordinator/events/${eventId}/operations`}>Manage matching</Link></Button></div>}</div></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">{[["Registrations",registrationCount??0],["Attendance",participantAttendance],["Businesses",`${businesses??0}/${event.business_target}`],["Volunteers",`${confirmedVolunteers??0}/${event.volunteer_target}`]].map(([label,value])=><Card className="border-0" key={String(label)}><CardContent className="p-4 sm:p-5"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold sm:text-2xl">{value}</p></CardContent></Card>)}</div>

    {status==="upcoming"&&<>
      <Card className="border-0"><CardHeader><CardTitle>Wallet attendance desk</CardTitle><p className="text-sm text-muted-foreground">Scanning a wallet or profile QR confirms attendance immediately. Invited participants do not need to confirm separately.</p></CardHeader><CardContent className="space-y-5"><div><div className="mb-2 flex justify-between text-sm"><span className="font-semibold">Participant attendance</span><span>{participantAttendance}/{eligibleParticipants}</span></div><Progress label="Participant attendance progress" value={attendancePercent}/></div><AttendanceScanner eventId={eventId}/></CardContent></Card>
      <Card className="border-0"><CardHeader><CardTitle className="flex items-center gap-2"><UserCheck className="size-5 text-primary"/>Participant roster fallback</CardTitle><p className="text-sm text-muted-foreground">Use this when a participant cannot access their wallet or in-app pass.</p></CardHeader><CardContent className="space-y-3">{!participantRoster?.length?<p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">No registered participants yet.</p>:participantRoster.map(item=>{const profile=related(item.profiles);const attended=attendedIds.has(item.participant_id)||item.status==="attended";return <div className="flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center" key={item.id}><div><p className="font-semibold">{profile?.full_name??"Participant"}</p><p className="text-sm text-muted-foreground">{profile?.email} · {item.status.replaceAll("_"," ")}</p></div><div className="flex gap-2">{attended?<Badge variant="success">Attended</Badge>:item.status==="no_show"?<Badge variant="secondary">No-show</Badge>:<><form action={recordManualAttendance}><input name="eventId" type="hidden" value={eventId}/><input name="participantId" type="hidden" value={item.participant_id}/><Button disabled={!['invited','registered','confirmed'].includes(item.status)} size="sm" type="submit">Mark attended</Button></form><form action={markParticipantNoShow}><input name="eventId" type="hidden" value={eventId}/><input name="participantId" type="hidden" value={item.participant_id}/><Button size="sm" type="submit" variant="ghost">No-show</Button></form></>}</div></div>})}</CardContent></Card>
      <Card className="border-0"><CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-5 text-primary"/>Volunteer attendance</CardTitle></CardHeader><CardContent className="space-y-3">{!volunteerRoster?.length?<p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">No confirmed volunteers.</p>:volunteerRoster.map(item=>{const volunteer=related(item.volunteers);return <div className="flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center" key={item.id}><div><p className="font-semibold">{volunteer?.full_name??"Volunteer"}</p><p className="text-sm text-muted-foreground">{volunteer?.email}</p></div><div className="flex gap-2">{item.status==="attended"?<Badge variant="success">Attended</Badge>:item.status==="no_show"?<Badge variant="secondary">No-show</Badge>:[['attended','Mark attended'],['no_show','No-show']].map(([next,label])=><form action={markVolunteerAttendance} key={next}><input name="eventId" type="hidden" value={eventId}/><input name="eventVolunteerId" type="hidden" value={item.id}/><input name="status" type="hidden" value={next}/><Button size="sm" type="submit" variant={next==='attended'?'default':'ghost'}>{label}</Button></form>)}</div></div>})}</CardContent></Card>
    </>}

    {status==="awaiting_closure"&&<Card className="border-0"><CardHeader><CardTitle>Closure and impact report</CardTitle><p className="text-sm text-muted-foreground">Attendance and participation totals flow automatically from the event record.</p></CardHeader><CardContent><ClosureForm attendance={{participants:participantAttendance,volunteers:volunteerAttendance,businesses:businesses??0}} eventId={eventId} report={report}/></CardContent></Card>}
    {status!=="archived"&&<Card className="border-0"><CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="size-5 text-primary"/>Progress event</CardTitle></CardHeader><CardContent><p className="mb-4 text-sm text-muted-foreground">Requirements are validated before the event progresses. Overrides require an audited reason.</p><TransitionForm eventId={eventId} label={nextStage[status].label} targetStatus={nextStage[status].status}/></CardContent></Card>}
    <Card className="border-0"><CardHeader><CardTitle className="flex items-center gap-2"><History className="size-5 text-primary"/>Stage history</CardTitle></CardHeader><CardContent className="space-y-3">{(history??[]).map(item=><div className="flex gap-3 rounded-lg border p-3" key={item.id}><Clock3 className="mt-0.5 size-4 text-primary"/><div><p className="font-semibold">{item.previous_status?`${String(item.previous_status).replaceAll("_"," ")} → `:""}{String(item.new_status).replaceAll("_"," ")}</p><p className="text-sm text-muted-foreground">{item.reason||"Stage updated"} · {formatEventDate(item.changed_at)}</p></div></div>)}</CardContent></Card>
  </div>;
}
