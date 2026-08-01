"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { cancelRegistration, registerForEvent, type EventRegistrationState } from "./actions";

const initialState: EventRegistrationState = {};

export function EventRegistrationButton({ eventId, status, eligible=true }: { eventId: string; status?: string; eligible?:boolean }) {
  const [state, formAction, pending] = useActionState(registerForEvent, initialState);
  const [cancelState, cancelAction, cancelling] = useActionState(cancelRegistration, initialState);
  const active = ["registered", "confirmed", "waitlisted"].includes(status ?? "");
  const attended=status==="attended";

  return (
    <div className="mt-6 space-y-2">
      <form action={formAction}><input name="eventId" type="hidden" value={eventId}/><Button className="w-full" disabled={pending||active||attended||!eligible} type="submit">{(active||attended)&&<CheckCircle2 className="size-4"/>}{pending?"Saving…":attended?"Attended":active?status==="waitlisted"?"Waitlisted":status==="confirmed"?"Attendance confirmed":"Registered":!eligible?"Prerequisites required":status==="invited"?"Confirm attendance":"Register for event"}</Button></form>
      {active&&<form action={cancelAction}><input name="eventId" type="hidden" value={eventId}/><Button className="w-full" disabled={cancelling} type="submit" variant="ghost">{cancelling?"Cancelling…":"Cancel registration"}</Button></form>}
      {(state.error||cancelState.error)&&<p className="text-sm text-destructive" role="alert">{state.error??cancelState.error}</p>}
      {(state.success||cancelState.success)&&<p className="text-sm font-semibold text-emerald-700" role="status">{state.success??cancelState.success}</p>}
    </div>
  );
}
