"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { createParticipantAccount, type ParticipantSignupState } from "./actions";

const initialState: ParticipantSignupState = {};
const inputClassName = "mt-2 h-11 w-full rounded-md border bg-background px-3 font-normal outline-none ring-offset-background focus:ring-2 focus:ring-ring";

interface OrganisationOption { id: string; name: string }

export function ParticipantSignupForm({
  organisations,
  defaultEmail = "",
  eventId = "",
}: {
  organisations: OrganisationOption[];
  defaultEmail?: string;
  eventId?: string;
}) {
  const [state, formAction, pending] = useActionState(createParticipantAccount, initialState);
  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <input name="eventId" type="hidden" value={eventId} />
      <label className="block text-sm font-semibold">Full name<input className={inputClassName} name="fullName" required /></label>
      <label className="block text-sm font-semibold">Email address<input autoComplete="email" className={inputClassName} defaultValue={defaultEmail} name="email" required type="email" /></label>
      <label className="block text-sm font-semibold">Phone number<input autoComplete="tel" className={inputClassName} name="phone" placeholder="+65 9123 4567" required type="tel" /></label>
      <label className="block text-sm font-semibold">Organisation, if applicable
        <select className={inputClassName} defaultValue="" name="organisationId">
          <option value="">Not applicable</option>
          {organisations.map((organisation) => <option key={organisation.id} value={organisation.id}>{organisation.name}</option>)}
        </select>
      </label>
      <label className="block text-sm font-semibold sm:col-span-2">Preferred language
        <select className={inputClassName} defaultValue="en" name="preferredLanguage"><option value="en">English</option><option value="zh">中文</option><option value="ms">Bahasa Melayu</option><option value="ta">தமிழ்</option></select>
      </label>
      <label className="block text-sm font-semibold">Create password<input autoComplete="new-password" className={inputClassName} minLength={8} name="password" required type="password" /></label>
      <label className="block text-sm font-semibold">Confirm password<input autoComplete="new-password" className={inputClassName} minLength={8} name="confirmPassword" required type="password" /></label>
      <div className="space-y-3 rounded-xl bg-muted p-4 sm:col-span-2"><label className="flex gap-3 text-sm"><input className="mt-1 size-4" defaultChecked name="emailConsent" type="checkbox"/><span>Email me registration updates and event reminders.</span></label><label className="flex gap-3 text-sm"><input className="mt-1 size-4" name="whatsappConsent" type="checkbox"/><span>Send WhatsApp reminders and post-event acknowledgements.</span></label></div>
      {state.error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2" role="alert">{state.error}</p>}
      <Button className="sm:col-span-2" disabled={pending} type="submit">{pending ? "Creating account…" : "Create participant account"}</Button>
    </form>
  );
}
