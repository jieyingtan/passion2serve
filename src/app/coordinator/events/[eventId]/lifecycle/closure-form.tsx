"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { saveClosureReport } from "./actions";

type Report = { participant_attendance:number; volunteer_attendance:number; business_participation:number; beneficiary_reach:number; outcomes:string|null; feedback_summary:string|null } | null;

export function ClosureForm({ eventId, report }: { eventId:string; report:Report }) {
  const [state, action, pending] = useActionState(saveClosureReport, {});
  const input = "mt-1 h-10 w-full rounded-md border bg-background px-3";
  return <form action={action} className="grid gap-4 sm:grid-cols-2">
    <input name="eventId" type="hidden" value={eventId} />
    <label className="text-sm font-semibold sm:col-span-2">Beneficiary reach<input className={input} defaultValue={Number(report?.beneficiary_reach ?? 0)} min="0" name="beneficiaryReach" required type="number" /></label>
    {[["outcomes","Event outcomes",report?.outcomes],["feedbackSummary","Participant feedback summary",report?.feedback_summary]].map(([name,label,value]) => <label className="text-sm font-semibold sm:col-span-2" key={String(name)}>{label}<textarea className="mt-1 min-h-24 w-full rounded-md border bg-background p-3" defaultValue={String(value ?? "")} name={String(name)} required /></label>)}
    {state.error && <p className="text-sm font-semibold text-destructive sm:col-span-2" role="alert">{state.error}</p>}
    {state.success && <p className="text-sm font-semibold text-emerald-700 sm:col-span-2" role="status">{state.success}</p>}
    <Button className="sm:col-span-2 sm:w-fit" disabled={pending} type="submit">{pending ? "Saving…" : "Save closure report"}</Button>
  </form>;
}
