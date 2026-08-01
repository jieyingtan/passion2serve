"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";

import { inviteParticipant, type InviteParticipantState } from "./actions";

const initialState: InviteParticipantState = {};
const inputClassName =
  "mt-2 h-11 w-full rounded-md border bg-background px-3 font-normal outline-none ring-offset-background focus:ring-2 focus:ring-ring";

export function InviteParticipantForm({ eventId }: { eventId: string }) {
  const [state, formAction, pending] = useActionState(inviteParticipant, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input name="eventId" type="hidden" value={eventId} />
      <label className="block text-sm font-semibold">
        Participant name
        <input className={inputClassName} name="fullName" placeholder="Full name" required />
      </label>
      <label className="block text-sm font-semibold">
        Email address
        <input autoComplete="email" className={inputClassName} name="email" placeholder="participant@example.org" required type="email" />
      </label>
      {state.error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{state.error}</p>}
      {state.success && <p className="rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-800" role="status">{state.success}</p>}
      <Button disabled={pending} type="submit">
        <Send className="size-4" /> {pending ? "Sending invitation…" : "Invite participant"}
      </Button>
    </form>
  );
}

