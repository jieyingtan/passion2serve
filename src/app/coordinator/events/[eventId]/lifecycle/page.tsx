import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3, History, Pencil, UserCheck, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, WorkflowStepHeader } from "@/components/page-header";
import { Progress } from "@/components/ui/progress";
import { isSupabaseConfigured } from "@/lib/config";
import { formatEventDate, getEventStage, type EventStage } from "@/lib/events/stages";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { markParticipantNoShow, markVolunteerAttendance, recordManualAttendance } from "./actions";
import { AttendanceScanner } from "./attendance-scanner";
import { ClosureForm } from "./closure-form";
import { PublicityGenerator } from "./publicity-generator";
import { TransitionForm } from "./transition-form";

const nextStage: Record<Exclude<EventStage,"archived">,{status:string;label:string}> = {
  create:{status:"ongoing",label:"Start outreach"}, ongoing:{status:"upcoming",label:"Move to Upcoming"},
  upcoming:{status:"awaiting_closure",label:"Complete event"}, awaiting_closure:{status:"archived",label:"Archive event"},
};

function related<T>(value:T|T[]|null){return Array.isArray(value)?value[0]??null:value;}

function AttendanceSummary({participants,volunteers,businesses}:{participants:number;volunteers:number;businesses:number}) {
  return <div className="grid gap-3 sm:grid-cols-3">{[["Participant attendance",participants],["Volunteer attendance",volunteers],["Business participation",businesses]].map(([label,value])=><div className="rounded-xl border border-primary/10 bg-accent/60 p-4" key={String(label)}><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-black">{value}</p><p className="mt-1 text-xs text-muted-foreground">Automatically recorded</p></div>)}</div>;
}

function getDemoData(eventId: string) {
  return {
    event: {
      id: eventId,
      name: "Community Skills Workshop — Digital Literacy",
      event_type: "skills_training",
      starts_at: "2026-07-28T09:00:00+08:00",
      ends_at: "2026-07-28T13:00:00+08:00",
      venue: "Migrant Community Learning Hub, 12 Geylang Lorong",
      status: "awaiting_closure" as EventStage,
      volunteer_target: 15,
      business_target: 3,
      participant_reviewed_at: "2026-07-27T14:00:00+08:00",
    },
    organisation: { name: "Migrant Community Learning Hub" },
    history: [
      { id: "h4", previous_status: "upcoming", new_status: "awaiting_closure", reason: "Event completed successfully", changed_at: "2026-07-28T13:15:00+08:00" },
      { id: "h3", previous_status: "ongoing", new_status: "upcoming", reason: "All readiness requirements met", changed_at: "2026-07-20T10:00:00+08:00" },
      { id: "h2", previous_status: "create", new_status: "ongoing", reason: "Outreach started", changed_at: "2026-07-10T09:00:00+08:00" },
      { id: "h1", previous_status: null, new_status: "create", reason: "Event created", changed_at: "2026-07-08T14:30:00+08:00" },
    ],
    report: {
      participant_attendance: 45,
      volunteer_attendance: 12,
      business_participation: 3,
      beneficiary_reach: 45,
      outcomes: "45 migrant workers completed digital literacy modules covering email, messaging apps, and online banking.",
      feedback_summary: "Participants rated the session 4.7/5. Multiple requests for follow-up advanced workshop.",
    },
    registrationCount: 52,
    participantAttendance: 45,
    volunteerAttendance: 12,
    businesses: 3,
    confirmedVolunteers: 12,
    participantRoster: [],
    volunteerRoster: [],
    attendanceRecords: [],
  };
}

export default async function LifecyclePage({params}:{params:Promise<{eventId:string}>}) {
  const {eventId}=await params;

  if (!isSupabaseConfigured()) {
    const demo = getDemoData(eventId);
    const status = demo.event.status;
    const stage = getEventStage(status);

    return <div className="mx-auto max-w-6xl space-y-7">
      <div><Link className="inline-flex items-center gap-2 text-sm font-semibold text-primary" href={stage.href}><ArrowLeft className="size-4"/>Back to {stage.label}</Link><div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><Badge>{stage.label}</Badge><Badge className="ml-2" variant="warning">Demo Mode</Badge><h1 className="mt-2 text-3xl font-bold">{demo.event.name}</h1><p className="mt-2 text-muted-foreground">{demo.organisation.name} · {formatEventDate(demo.event.starts_at)} · {demo.event.venue}</p></div></div></div>
      <div className="grid gap-4 sm:grid-cols-4">{[["Registrations",demo.registrationCount],["Attendance",demo.participantAttendance],["Businesses",`${demo.businesses}/${demo.event.business_target}`],["Volunteers",`${demo.confirmedVolunteers}/${demo.event.volunteer_target}`]].map(([label,value])=><Card className="border-0" key={String(label)}><CardContent className="p-5"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></CardContent></Card>)}</div>

      <Card className="border-0"><CardHeader><WorkflowStepHeader step={1} title="Verify attendance totals" description="Confirm the automatically recorded delivery totals before reporting outcomes." /></CardHeader><CardContent><AttendanceSummary participants={demo.participantAttendance} volunteers={demo.volunteerAttendance} businesses={demo.businesses}/></CardContent></Card>
      <Card className="border-0"><CardHeader><WorkflowStepHeader step={2} title="Complete the closure report" description="Record beneficiary reach, event outcomes, and participant feedback." /></CardHeader><CardContent><ClosureForm eventId={eventId} report={demo.report}/></CardContent></Card>
      <Card className="border-0"><CardHeader><WorkflowStepHeader step={3} title="Prepare publicity content" description="Generate a poster and social copy from the verified event outcomes." /></CardHeader><CardContent><PublicityGenerator eventId={eventId}/></CardContent></Card>
      <Card className="border-0"><CardHeader><WorkflowStepHeader step={4} icon={<CheckCircle2 className="size-5 text-primary"/>} title="Archive event" description="Complete closure and move the event into the permanent audit archive." /></CardHeader><CardContent><TransitionForm eventId={eventId} label="Archive event" targetStatus="archived"/></CardContent></Card>

      <Card className="border-0"><CardHeader><CardTitle className="flex items-center gap-2"><History className="size-5 text-primary"/>Stage history</CardTitle></CardHeader><CardContent className="space-y-3">{demo.history.map(item=><div className="flex gap-3 rounded-lg border p-3" key={item.id}><Clock3 className="mt-0.5 size-4 text-primary"/><div><p className="font-semibold">{item.previous_status?`${String(item.previous_status).replaceAll("_"," ")} → `:""}{String(item.new_status).replaceAll("_"," ")}</p><p className="text-sm text-muted-foreground">{item.reason} · {formatEventDate(item.changed_at)}</p></div></div>)}</CardContent></Card>
    </div>;
  }

  const supabase=await createClient(); const admin=createAdminClient();
  const [
    {data:event},{data:history},{data:report},{count:registrationCount},{data:attendanceRecords},
    {count:businesses},{count:confirmedVolunteers},{data:participantRoster},{data:volunteerRoster},
  ] = await Promise.all([
    supabase.from("events").select("id,name,event_type,starts_at,ends_at,venue,status,volunteer_target,business_target,participant_reviewed_at,beneficiary_organisations(name)").eq("id",eventId).maybeSingle(),
    supabase.from("event_status_history").select("id,previous_status,new_status,reason,changed_at").eq("event_id",eventId).order("changed_at",{ascending:false}),
    supabase.from("event_closure_reports").select("participant_attendance,volunteer_attendance,business_participation,beneficiary_reach,outcomes,feedback_summary").eq("event_id",eventId).maybeSingle(),
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
    <div className="space-y-4"><Link className="inline-flex items-center gap-2 text-sm font-semibold text-primary" href={stage.href}><ArrowLeft className="size-4"/>Back to {stage.label}</Link><PageHeader eyebrow={stage.label} title={event.name} description={`${organisation?.name} · ${formatEventDate(event.starts_at)} · ${event.venue}`} actions={status==="ongoing"?<div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap"><Button asChild className="w-full sm:w-auto" variant="outline"><Link href={`/coordinator/events/${eventId}/edit`}><Pencil className="size-4"/>Edit requirements</Link></Button><Button asChild className="w-full sm:w-auto"><Link href={`/coordinator/events/${eventId}/operations`}>Manage matching</Link></Button></div>:undefined}/></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">{[["Registrations",registrationCount??0],["Attendance",participantAttendance],["Businesses",`${businesses??0}/${event.business_target}`],["Volunteers",`${confirmedVolunteers??0}/${event.volunteer_target}`]].map(([label,value])=><Card className="border-0" key={String(label)}><CardContent className="p-4 sm:p-5"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold sm:text-2xl">{value}</p></CardContent></Card>)}</div>

    {status==="upcoming"&&<>
      <Card className="border-0"><CardHeader><WorkflowStepHeader step={1} title="Scan membership passes" description="Scanning a wallet or profile QR confirms attendance immediately. Invited participants do not need to confirm separately." /></CardHeader><CardContent className="space-y-5"><div><div className="mb-2 flex justify-between text-sm"><span className="font-semibold">Participant attendance</span><span>{participantAttendance}/{eligibleParticipants}</span></div><Progress label="Participant attendance progress" value={attendancePercent}/></div><AttendanceScanner eventId={eventId}/></CardContent></Card>
      <Card className="border-0"><CardHeader><WorkflowStepHeader step={2} icon={<UserCheck className="size-5 text-primary"/>} title="Participant attendance" description="Use this roster only when a participant cannot access their wallet or in-app pass." /></CardHeader><CardContent className="space-y-3">{!participantRoster?.length?<p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">No registered participants yet.</p>:participantRoster.map(item=>{const profile=related(item.profiles);const attended=attendedIds.has(item.participant_id)||item.status==="attended";return <div className="flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center" key={item.id}><div><p className="font-semibold">{profile?.full_name??"Participant"}</p><p className="text-sm text-muted-foreground">{profile?.email} · {item.status.replaceAll("_"," ")}</p></div><div className="flex gap-2">{attended?<Badge variant="success">Attended</Badge>:item.status==="no_show"?<Badge variant="secondary">No-show</Badge>:<><form action={recordManualAttendance}><input name="eventId" type="hidden" value={eventId}/><input name="participantId" type="hidden" value={item.participant_id}/><Button disabled={!['invited','registered','confirmed'].includes(item.status)} size="sm" type="submit">Mark attended</Button></form><form action={markParticipantNoShow}><input name="eventId" type="hidden" value={eventId}/><input name="participantId" type="hidden" value={item.participant_id}/><Button size="sm" type="submit" variant="ghost">No-show</Button></form></>}</div></div>})}</CardContent></Card>
      <Card className="border-0"><CardHeader><WorkflowStepHeader step={3} icon={<Users className="size-5 text-primary"/>} title="Volunteer attendance" description="Record attendance for the confirmed volunteer roster." /></CardHeader><CardContent className="space-y-3">{!volunteerRoster?.length?<p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">No confirmed volunteers.</p>:volunteerRoster.map(item=>{const volunteer=related(item.volunteers);return <div className="flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center" key={item.id}><div><p className="font-semibold">{volunteer?.full_name??"Volunteer"}</p><p className="text-sm text-muted-foreground">{volunteer?.email}</p></div><div className="flex gap-2">{item.status==="attended"?<Badge variant="success">Attended</Badge>:item.status==="no_show"?<Badge variant="secondary">No-show</Badge>:[['attended','Mark attended'],['no_show','No-show']].map(([next,label])=><form action={markVolunteerAttendance} key={next}><input name="eventId" type="hidden" value={eventId}/><input name="eventVolunteerId" type="hidden" value={item.id}/><input name="status" type="hidden" value={next}/><Button size="sm" type="submit" variant={next==='attended'?'default':'ghost'}>{label}</Button></form>)}</div></div>})}</CardContent></Card>
    </>}

    {status==="awaiting_closure"&&<><Card className="border-0"><CardHeader><WorkflowStepHeader step={1} title="Verify attendance totals" description="Confirm the automatically recorded delivery totals before reporting outcomes." /></CardHeader><CardContent><AttendanceSummary participants={participantAttendance} volunteers={volunteerAttendance} businesses={businesses??0}/></CardContent></Card><Card className="border-0"><CardHeader><WorkflowStepHeader step={2} title="Complete the closure report" description="Record beneficiary reach, event outcomes, and participant feedback." /></CardHeader><CardContent><ClosureForm eventId={eventId} report={report}/></CardContent></Card><Card className="border-0"><CardHeader><WorkflowStepHeader step={3} title="Prepare publicity content" description="Generate a poster and social copy from the verified event outcomes." /></CardHeader><CardContent><PublicityGenerator eventId={eventId}/></CardContent></Card></>}
    {status==="archived"&&<Card className="overflow-hidden border-0"><CardHeader className="bg-primary text-primary-foreground"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-foreground/70">Audit record</p><CardTitle className="text-2xl">Event outcomes and feedback</CardTitle><p className="text-sm text-primary-foreground/75">A permanent summary of delivery results for reporting and review.</p></CardHeader><CardContent className="grid gap-5 p-6 md:grid-cols-2"><div className="rounded-xl bg-muted p-5"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Event outcomes</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{report?.outcomes||"No outcomes were recorded."}</p></div><div className="rounded-xl bg-muted p-5"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Participant feedback</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{report?.feedback_summary||"No feedback summary was recorded."}</p></div><div className="grid grid-cols-2 gap-3 md:col-span-2 md:grid-cols-4">{[["Participants",participantAttendance],["Volunteers",volunteerAttendance],["Businesses",businesses??0],["Beneficiary reach",report?.beneficiary_reach??0]].map(([label,value])=><div className="rounded-xl border p-4" key={String(label)}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}</div></CardContent></Card>}
    {status!=="archived"&&<Card className="border-0"><CardHeader>{status==="upcoming"?<WorkflowStepHeader step={4} icon={<CheckCircle2 className="size-5 text-primary"/>} title="Progress event" description="Validate attendance and move the completed event to Awaiting Closure." />:status==="awaiting_closure"?<WorkflowStepHeader step={4} icon={<CheckCircle2 className="size-5 text-primary"/>} title="Archive event" description="Complete closure and move the event into the permanent audit archive." />:<WorkflowStepHeader step={3} icon={<CheckCircle2 className="size-5 text-primary"/>} title="Progress event" description="Requirements are validated before the event progresses. Overrides require an audited reason." />}</CardHeader><CardContent><TransitionForm eventId={eventId} label={nextStage[status].label} targetStatus={nextStage[status].status}/></CardContent></Card>}
    <Card className="border-0"><CardHeader><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Lifecycle audit trail</p><CardTitle className="flex items-center gap-2 text-2xl"><History className="size-5 text-primary"/>Stage history</CardTitle></CardHeader><CardContent>{!(history??[]).length?<p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No stage changes recorded.</p>:<ol className="relative ml-3 border-l-2 border-primary/20">{[...(history??[])].reverse().map((item,index)=><li className="relative pb-7 pl-7 last:pb-0" key={item.id}><span className="absolute -left-[9px] top-0 grid size-4 place-items-center rounded-full bg-primary ring-4 ring-background"/><div className="rounded-xl border bg-card p-4"><div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center"><p className="font-bold capitalize">{String(item.new_status).replaceAll("_"," ")}</p><Badge variant={index===(history??[]).length-1?"success":"outline"}>{index===(history??[]).length-1?"Current stage":`Stage ${index+1}`}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{item.reason||"Stage updated"}</p><p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Clock3 className="size-3.5"/>{formatEventDate(item.changed_at)}</p></div></li>)}</ol>}</CardContent></Card>
  </div>;
}
