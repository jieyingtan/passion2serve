"use client";

import { useActionState } from "react";
import { FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";

import { importVolunteers, type ImportState } from "./actions";

export function VolunteerImportForm({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState<ImportState, FormData>(importVolunteers, {});
  return <form action={action} className="flex flex-col gap-3 rounded-xl border border-dashed p-4 sm:flex-row sm:items-end">
    <input name="eventId" type="hidden" value={eventId}/>
    <label className="flex-1 text-sm font-semibold">Import Giving.sg or PTS registrations
      <input accept=".csv,.xlsx" className="mt-2 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:font-semibold" name="file" required type="file"/>
      <span className="mt-1 block text-xs font-normal text-muted-foreground">Columns: full name, email, phone, interests, skills, source.</span>
    </label>
    <Button disabled={pending} type="submit" variant="outline"><FileSpreadsheet className="size-4"/>{pending?"Importing…":"Import volunteers"}</Button>
    {(state.error||state.success)&&<p className={`text-sm sm:basis-full ${state.error?"text-destructive":"text-emerald-700"}`}>{state.error??state.success}</p>}
  </form>;
}
