"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { updateParticipantProfile, type ProfileState } from "./actions";

type Profile = { fullName:string; email:string; phone:string; preferredLanguage:string; emailConsent:boolean; whatsappConsent:boolean; publicityConsent:boolean };
const input="mt-2 h-11 w-full rounded-md border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring";

export function ProfileForm({ profile }: { profile:Profile }) {
  const [state,action,pending]=useActionState<ProfileState,FormData>(updateParticipantProfile,{});
  return <form action={action} className="grid gap-5 sm:grid-cols-2">
    <label className="text-sm font-semibold">Full name<input className={input} defaultValue={profile.fullName} name="fullName" required/></label>
    <label className="text-sm font-semibold">Email address<input className={`${input} bg-muted`} defaultValue={profile.email} disabled type="email"/></label>
    <label className="text-sm font-semibold">Phone number<input className={input} defaultValue={profile.phone} name="phone" required type="tel"/></label>
    <label className="text-sm font-semibold">Preferred language<select className={input} defaultValue={profile.preferredLanguage} name="preferredLanguage"><option value="en">English</option><option value="zh">中文</option><option value="ms">Bahasa Melayu</option><option value="ta">தமிழ்</option></select></label>
    <fieldset className="space-y-3 rounded-xl bg-muted p-4 sm:col-span-2"><legend className="px-1 text-sm font-bold">Communication preferences</legend>
      {[['emailConsent','Email updates',profile.emailConsent],['whatsappConsent','WhatsApp reminders and acknowledgements',profile.whatsappConsent],['publicityConsent','Allow approved photos and stories for publicity',profile.publicityConsent]].map(([name,label,checked])=><label className="flex items-start gap-3 text-sm" key={String(name)}><input className="mt-1 size-4" defaultChecked={Boolean(checked)} name={String(name)} type="checkbox"/><span>{String(label)}</span></label>)}
    </fieldset>
    {state.error&&<p className="text-sm text-destructive sm:col-span-2">{state.error}</p>}{state.success&&<p className="text-sm font-semibold text-emerald-700 sm:col-span-2">{state.success}</p>}
    <Button className="sm:col-span-2" disabled={pending} type="submit">{pending?"Saving…":"Save profile"}</Button>
  </form>;
}
