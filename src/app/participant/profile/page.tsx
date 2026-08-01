import Link from "next/link";
import { CalendarCheck, CheckCircle2, Download, QrCode, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import { ProfileForm } from "./profile-form";

export default async function ParticipantProfilePage() {
  const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
  if(!user) return null;
  const [{data:profile},{count:upcomingCount},{count:attendanceCount},{data:recentAttendance},{data:certificates}]=await Promise.all([
    supabase.from("profiles").select("full_name,email,phone,preferred_language,email_consent,whatsapp_consent,publicity_consent,beneficiary_organisations(name)").eq("id",user.id).single(),
    supabase.from("registrations").select("id",{count:"exact",head:true}).eq("participant_id",user.id).in("status",["registered","confirmed","waitlisted"]),
    supabase.from("attendance").select("id",{count:"exact",head:true}).eq("participant_id",user.id),
    supabase.from("attendance").select("id,scanned_at,events(name,starts_at)").eq("participant_id",user.id).order("scanned_at",{ascending:false}).limit(5),
    supabase.from("certificates").select("id,certificate_number,storage_path,issued_at,events(name)").eq("participant_id",user.id).order("issued_at",{ascending:false}),
  ]);
  if(!profile)return null; const organisation=Array.isArray(profile.beneficiary_organisations)?profile.beneficiary_organisations[0]:profile.beneficiary_organisations;
  const admin=createAdminClient(); const certificateLinks=await Promise.all((certificates??[]).map(async certificate=>{const {data}=await admin.storage.from("certificates-private").createSignedUrl(certificate.storage_path,600);return{...certificate,url:data?.signedUrl??null};}));
  return <div className="mx-auto max-w-6xl space-y-8"><div><span className="inline-grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground"><UserRound className="size-5"/></span><h1 className="mt-4 text-3xl font-bold">Profile</h1><p className="mt-2 text-muted-foreground">Manage your details, language, communication choices, and participation record.</p></div>
    <div className="grid gap-4 sm:grid-cols-3">{[{Icon:CalendarCheck,label:"Upcoming registrations",value:upcomingCount??0},{Icon:CheckCircle2,label:"Events attended",value:attendanceCount??0},{Icon:QrCode,label:"Membership pass",value:"Active"}].map(({Icon,label,value})=><Card className="border-0" key={label}><CardContent className="p-5"><Icon className="size-5 text-primary"/><p className="mt-3 text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></CardContent></Card>)}</div>
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]"><Card className="border-0"><CardHeader><CardTitle>Personal details and preferences</CardTitle></CardHeader><CardContent><ProfileForm profile={{fullName:profile.full_name,email:profile.email,phone:profile.phone??"",preferredLanguage:profile.preferred_language,emailConsent:profile.email_consent,whatsappConsent:profile.whatsapp_consent,publicityConsent:profile.publicity_consent}}/></CardContent></Card>
      <Card className="h-fit border-0 bg-accent"><CardContent className="p-6"><h2 className="font-bold">Your organisation</h2><p className="mt-2 text-sm text-muted-foreground">{organisation?.name??"Not linked to a beneficiary organisation"}</p><Button asChild className="mt-5" variant="outline"><Link href="/participant/pass">Open membership QR</Link></Button></CardContent></Card>
    </div>
    <Card className="border-0"><CardHeader><CardTitle>Attendance confirmations</CardTitle></CardHeader><CardContent>{recentAttendance?.length?<div className="space-y-3">{recentAttendance.map((record)=>{const event=Array.isArray(record.events)?record.events[0]:record.events;return <div className="flex flex-col justify-between gap-2 rounded-xl border p-4 sm:flex-row sm:items-center" key={record.id}><div><strong>{event?.name??"Completed event"}</strong><p className="mt-1 text-sm text-muted-foreground">Attendance recorded {new Intl.DateTimeFormat("en-SG",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Singapore"}).format(new Date(record.scanned_at))}</p></div><span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><CheckCircle2 className="size-4"/>Confirmed</span></div>})}</div>:<p className="text-sm text-muted-foreground">Your recorded attendance will appear here immediately after your membership QR is scanned.</p>}</CardContent></Card>
    <Card className="border-0"><CardHeader><CardTitle>Named certificates</CardTitle></CardHeader><CardContent>{certificateLinks.length?<div className="space-y-3">{certificateLinks.map(certificate=>{const event=Array.isArray(certificate.events)?certificate.events[0]:certificate.events;return <div className="flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center" key={certificate.id}><div><strong>{event?.name??"Completed event"}</strong><p className="text-sm text-muted-foreground">{certificate.certificate_number}</p></div>{certificate.url&&<Button asChild size="sm" variant="outline"><a href={certificate.url}><Download className="size-4"/>Download certificate</a></Button>}</div>})}</div>:<p className="text-sm text-muted-foreground">Certificates are generated automatically after attendance is recorded.</p>}</CardContent></Card>
  </div>;
}
