"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { transitionEvent } from "./actions";

export function TransitionForm({ eventId, label, targetStatus }: { eventId: string; label: string; targetStatus: string }) {
  const [state, action, pending] = useActionState(transitionEvent, {});
  return <div className="space-y-3">
    <form action={action} className="space-y-3">
      <input name="eventId" type="hidden" value={eventId} /><input name="targetStatus" type="hidden" value={targetStatus} />
      <input name="override" type="hidden" value="false" />
      <Button disabled={pending} type="submit">{pending ? "Progressing…" : label}</Button>
    </form>
    <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-semibold">Override unmet requirements</summary>
      <form action={action} className="mt-3 space-y-3"><input name="eventId" type="hidden" value={eventId} /><input name="targetStatus" type="hidden" value={targetStatus} /><input name="override" type="hidden" value="true" />
        <textarea className="min-h-20 w-full rounded-md border bg-background p-3 text-sm" name="reason" placeholder="Explain why this event should progress" required />
        <Button disabled={pending} type="submit" variant="outline">Progress with override</Button>
      </form>
    </details>
    {state.error && <p className="text-sm font-semibold text-destructive" role="alert">{state.error}</p>}
    {state.success && <p className="text-sm font-semibold text-emerald-700" role="status">{state.success}</p>}
  </div>;
}
