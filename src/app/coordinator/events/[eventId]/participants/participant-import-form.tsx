"use client";

import { useActionState } from "react";
import { FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";

import { importParticipants, type ImportParticipantState } from "./actions";

export function ParticipantImportForm({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState<ImportParticipantState, FormData>(importParticipants, {});
  return <form action={action} className="space-y-3">
    <input name="eventId" type="hidden" value={eventId}/>
    <label className="block text-sm font-semibold">Participant spreadsheet
      <input accept=".csv,.xlsx" className="mt-2 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:font-semibold" name="file" required type="file"/>
      <span className="mt-1 block text-xs font-normal text-muted-foreground">Columns: full name, email, phone. Imports are checked against prerequisites when the participant confirms.</span>
    </label>
    <Button disabled={pending} type="submit" variant="outline"><FileSpreadsheet className="size-4"/>{pending?"Importing…":"Import and invite"}</Button>
    {state.error&&<p className="text-sm text-destructive">{state.error}</p>}
    {state.success&&<p className="text-sm text-emerald-700">{state.success}</p>}
  </form>;
}
