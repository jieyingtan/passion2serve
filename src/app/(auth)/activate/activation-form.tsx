"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { activateParticipant, type ActivationState } from "./actions";

const initialState: ActivationState = {};
const inputClassName =
  "mt-2 h-11 w-full rounded-md border bg-background px-3 font-normal outline-none ring-offset-background focus:ring-2 focus:ring-ring";

export function ActivationForm({ defaultName = "" }: { defaultName?: string }) {
  const [state, formAction, pending] = useActionState(activateParticipant, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block text-sm font-semibold">
        Full name
        <input className={inputClassName} defaultValue={defaultName} name="fullName" required />
      </label>
      <label className="block text-sm font-semibold">
        Phone number
        <input autoComplete="tel" className={inputClassName} name="phone" placeholder="+65 9123 4567" required type="tel" />
      </label>
      <label className="block text-sm font-semibold">
        Preferred language
        <select className={inputClassName} defaultValue="en" name="preferredLanguage">
          <option value="en">English</option>
          <option value="zh">中文</option>
          <option value="ms">Bahasa Melayu</option>
          <option value="ta">தமிழ்</option>
        </select>
      </label>
      <label className="block text-sm font-semibold">
        Create password
        <input autoComplete="new-password" className={inputClassName} minLength={8} name="password" required type="password" />
      </label>
      <label className="block text-sm font-semibold">
        Confirm password
        <input autoComplete="new-password" className={inputClassName} minLength={8} name="confirmPassword" required type="password" />
      </label>
      {state.error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{state.error}</p>}
      <Button className="w-full" disabled={pending} type="submit">
        {pending ? "Creating account…" : "Create participant account"}
      </Button>
    </form>
  );
}

