"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { saveClosureReport } from "./actions";

type Report = { participant_attendance:number; volunteer_attendance:number; business_participation:number; beneficiary_reach:number; outcomes:string|null; feedback_summary:string|null; impact_summary:string|null; publicity_links:string|null } | null;

export function ClosureForm({ eventId, report, attendance }: { eventId:string; report:Report; attendance:{participants:number;volunteers:number;businesses:number} }) {
  const [state, action, pending] = useActionState(saveClosureReport, {});
  const input = "mt-1 h-10 w-full rounded-md border bg-background px-3";
  return <form action={action} className="grid gap-4 sm:grid-cols-2">
    <input name="eventId" type="hidden" value={eventId} />
    <div className="grid gap-3 sm:col-span-2 sm:grid-cols-3">{[["Participant attendance",attendance.participants],["Volunteer attendance",attendance.volunteers],["Business participation",attendance.businesses]].map(([label,value])=><div className="rounded-xl bg-muted p-4" key={String(label)}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">Automatically recorded</p></div>)}</div>
    <label className="text-sm font-semibold sm:col-span-2">Beneficiary reach<input className={input} defaultValue={Number(report?.beneficiary_reach ?? 0)} min="0" name="beneficiaryReach" required type="number" /></label>
    {[["outcomes","Event outcomes",report?.outcomes],["feedbackSummary","Feedback summary",report?.feedback_summary],["impactSummary","Impact summary",report?.impact_summary],["publicityLinks","Publicity links or post IDs",report?.publicity_links]].map(([name,label,value]) => <label className="text-sm font-semibold sm:col-span-2" key={String(name)}>{label}<textarea className="mt-1 min-h-20 w-full rounded-md border bg-background p-3" defaultValue={String(value ?? "")} name={String(name)} required={name !== "publicityLinks"} /></label>)}
    {state.error && <p className="text-sm font-semibold text-destructive sm:col-span-2" role="alert">{state.error}</p>}
    {state.success && <p className="text-sm font-semibold text-emerald-700 sm:col-span-2" role="status">{state.success}</p>}
    <Button className="sm:col-span-2 sm:w-fit" disabled={pending} type="submit">{pending ? "Saving…" : "Save closure report"}</Button>
  </form>;
}
