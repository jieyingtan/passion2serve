"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { deleteEvent } from "./actions";

interface DeleteState {
  error?: string;
  success?: boolean;
}

export function DeleteEventButton({ eventId, eventName }: { eventId: string; eventName: string }) {
  const [state, action, pending] = useActionState<DeleteState, FormData>(
    async () => deleteEvent(eventId),
    {},
  );
  const [confirming, setConfirming] = useState(false);

  if (state.success) {
    return null;
  }

  if (!confirming) {
    return (
      <Button onClick={() => setConfirming(true)} size="sm" variant="ghost" className="text-destructive hover:text-destructive">
        <Trash2 className="size-4" />
        Delete
      </Button>
    );
  }

  return (
    <form action={action} className="inline-flex items-center gap-2">
      <span className="text-sm text-destructive">Delete {eventName}?</span>
      <Button disabled={pending} size="sm" type="submit" variant="ghost" className="text-destructive hover:text-destructive">
        {pending ? "Deleting…" : "Yes, delete"}
      </Button>
      <Button disabled={pending} onClick={() => setConfirming(false)} size="sm" variant="ghost" type="button">
        Cancel
      </Button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
