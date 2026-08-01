"use client";

import { useActionState } from "react";
import { MailPlus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { inviteMailingList, type InviteMailingListState } from "./actions";

const initialState: InviteMailingListState = {};

export function MailingListForm({ eventId, memberCount }: { eventId: string; memberCount: number }) {
  const [state, formAction, pending] = useActionState(inviteMailingList, initialState);

  return (
    <form action={formAction} className="mt-5 space-y-4">
      <input name="eventId" type="hidden" value={eventId} />
      <div className="rounded-xl bg-muted px-4 py-3 text-sm">
        <strong>{memberCount}</strong> active {memberCount === 1 ? "member" : "members"} in this mailing list
      </div>
      {state.error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{state.error}</p>}
      {state.success && <p className="rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-800" role="status">{state.success}</p>}
      <Button disabled={pending || memberCount === 0} type="submit">
        <MailPlus className="size-4" /> {pending ? "Preparing invitations…" : "Invite entire mailing list"}
      </Button>
    </form>
  );
}
