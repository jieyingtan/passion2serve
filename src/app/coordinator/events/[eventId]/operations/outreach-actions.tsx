"use client";

import { Check, Clock3, X } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { updateBusinessStatus, updateVolunteerStatus } from "./actions";
import { OutreachSendForm } from "./outreach-send-form";

const responseStatuses = [
  { value: "awaiting_response", label: "Awaiting", icon: Clock3, active: "bg-amber-500 text-white hover:bg-amber-600", idle: "bg-amber-50 text-amber-800 hover:bg-amber-100" },
  { value: "confirmed", label: "Confirmed", icon: Check, active: "bg-emerald-600 text-white hover:bg-emerald-700", idle: "bg-emerald-50 text-emerald-800 hover:bg-emerald-100" },
  { value: "declined", label: "Declined", icon: X, active: "bg-rose-600 text-white hover:bg-rose-700", idle: "bg-rose-50 text-rose-800 hover:bg-rose-100" },
] as const;

export function OutreachActions({
  currentStatus,
  eventId,
  kind,
  selectionId,
  whatsappUrl,
}: {
  currentStatus: string;
  eventId: string;
  kind: "business" | "volunteer";
  selectionId: string;
  whatsappUrl: string | null;
}) {
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(currentStatus);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateStatus(status: (typeof responseStatuses)[number]["value"]) {
    if (pending || optimisticStatus === status) return;
    setError(null);
    startTransition(async () => {
      setOptimisticStatus(status);
      const formData = new FormData();
      formData.set("eventId", eventId);
      formData.set(kind === "business" ? "eventBusinessId" : "eventVolunteerId", selectionId);
      formData.set("status", status);
      try {
        await (kind === "business" ? updateBusinessStatus(formData) : updateVolunteerStatus(formData));
      } catch (updateError) {
        setOptimisticStatus(currentStatus);
        setError(updateError instanceof Error ? updateError.message : "Status could not be updated.");
      }
    });
  }

  return (
    <div className="flex w-full flex-col gap-2.5 md:w-[390px]">
      <OutreachSendForm href={whatsappUrl} />
      <div aria-label="Update outreach status" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
        {responseStatuses.map(({ value, label, icon: Icon, active, idle }) => {
          const selected = optimisticStatus === value;
          return (
            <Button
              aria-pressed={selected}
              className={`w-full ${selected ? `${active} shadow-sm` : idle}`}
              disabled={pending && !selected}
              key={value}
              onClick={() => updateStatus(value)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Icon className="size-3.5" />
              <span className="max-[420px]:sr-only">{label}</span>
            </Button>
          );
        })}
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}
