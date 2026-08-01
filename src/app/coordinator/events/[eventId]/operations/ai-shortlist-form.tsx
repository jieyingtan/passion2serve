"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

import { generateAiShortlist, type AiShortlistState } from "./actions";

export function AiShortlistForm({ eventId, hasShortlist }: { eventId: string; hasShortlist: boolean }) {
  const [state, action, pending] = useActionState<AiShortlistState, FormData>(generateAiShortlist, {});

  return (
    <form action={action} className="space-y-2">
      <input name="eventId" type="hidden" value={eventId} />
      <Button disabled={pending} type="submit">
        <Sparkles className="size-4" />
        {pending ? "Matching businesses and volunteers…" : hasShortlist ? "Refresh AI shortlist" : "Generate AI shortlist"}
      </Button>
      {state.error && <p className="max-w-sm text-sm text-destructive">{state.error}</p>}
      {state.success && <p className="max-w-sm text-sm font-medium text-emerald-700">{state.success}</p>}
    </form>
  );
}
