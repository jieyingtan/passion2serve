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
      <Button onClick={() => setConfirming(true)} size="sm" variant="ghost" className="w-full text-destructive hover:text-destructive min-[520px]:w-auto">
        <Trash2 className="size-4" />
        Delete
      </Button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2 rounded-lg bg-destructive/5 p-2 min-[520px]:flex-row min-[520px]:items-center">
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
