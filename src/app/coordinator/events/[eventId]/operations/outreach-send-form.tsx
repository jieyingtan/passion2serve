"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";

import { sendOutreachWhatsApp, type OutreachSendState } from "./actions";

export function OutreachSendForm({ eventId, selectionId, recipientType }: { eventId: string; selectionId: string; recipientType: "business" | "volunteer" }) {
  const [state, action, pending] = useActionState<OutreachSendState, FormData>(sendOutreachWhatsApp, {});
  return (
    <form action={action} className="space-y-1.5">
      <input name="eventId" type="hidden" value={eventId} />
      <input name="selectionId" type="hidden" value={selectionId} />
      <input name="recipientType" type="hidden" value={recipientType} />
      <Button className="w-full" disabled={pending} size="sm" type="submit" variant="outline">
        <Send className="size-3.5" />{pending ? "Sending…" : "Send WhatsApp"}
      </Button>
      {state.success && <p className="text-xs font-medium text-emerald-700" role="status">{state.success}</p>}
      {state.error && <p className="text-xs font-medium text-destructive" role="alert">{state.error}</p>}
    </form>
  );
}
