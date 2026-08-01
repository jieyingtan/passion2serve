"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import type { TranslationDict } from "@/lib/i18n";

import { updateParticipantProfile, type ProfileState } from "./actions";

type Profile = { fullName: string; email: string; phone: string; preferredLanguage: string; emailConsent: boolean; whatsappConsent: boolean; publicityConsent: boolean };
const input = "mt-2 h-11 w-full rounded-md border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring";

export function ProfileForm({ profile, t }: { profile: Profile; t: TranslationDict }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateParticipantProfile, {});
  return <form action={action} className="grid gap-5 sm:grid-cols-2">
    <label className="text-sm font-semibold">{t.profile.fullName}<input className={input} defaultValue={profile.fullName} name="fullName" required /></label>
    <label className="text-sm font-semibold">{t.profile.email}<input className={`${input} bg-muted`} defaultValue={profile.email} disabled type="email" /></label>
    <label className="text-sm font-semibold">{t.profile.phone}<input className={input} defaultValue={profile.phone} name="phone" required type="tel" /></label>
    <label className="text-sm font-semibold">{t.profile.preferredLanguage}<select className={input} defaultValue={profile.preferredLanguage} name="preferredLanguage"><option value="en">{t.profile.languageEnglish}</option><option value="zh">{t.profile.languageChinese}</option><option value="ms">{t.profile.languageMalay}</option><option value="ta">{t.profile.languageTamil}</option></select></label>
    <fieldset className="space-y-3 rounded-xl bg-muted p-4 sm:col-span-2"><legend className="px-1 text-sm font-bold">{t.profile.commsPrefs}</legend>
      {[["emailConsent", t.profile.emailUpdates, profile.emailConsent], ["whatsappConsent", t.profile.whatsappReminders, profile.whatsappConsent], ["publicityConsent", t.profile.publicityConsent, profile.publicityConsent]].map(([name, label, checked]) => <label className="flex items-start gap-3 text-sm" key={String(name)}><input className="mt-1 size-4" defaultChecked={Boolean(checked)} name={String(name)} type="checkbox" /><span>{String(label)}</span></label>)}
    </fieldset>
    {state.error && <p className="text-sm text-destructive sm:col-span-2">{state.error}</p>}{state.success && <p className="text-sm font-semibold text-emerald-700 sm:col-span-2">{state.success}</p>}
    <Button className="sm:col-span-2" disabled={pending} type="submit">{pending ? t.profile.saving : t.profile.save}</Button>
  </form>;
}
