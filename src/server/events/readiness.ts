import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function advanceEventIfReady(eventId: string) {
  const admin = createAdminClient();
  const supabase = await createClient();
  const [{ data: event }, { count: confirmedBusinesses }, { count: confirmedVolunteers }] = await Promise.all([
    admin.from("events").select("business_target, volunteer_target, status, participant_reviewed_at").eq("id", eventId).single(),
    admin.from("event_businesses").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "confirmed"),
    admin.from("event_volunteers").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "confirmed"),
  ]);

  const ready = event?.status === "ongoing"
    && Boolean(event.participant_reviewed_at)
    && (confirmedBusinesses ?? 0) >= event.business_target
    && (confirmedVolunteers ?? 0) >= event.volunteer_target;

  if (!ready) return false;

  const { error } = await supabase.rpc("transition_event", {
    target_event_id: eventId,
    target_status: "upcoming",
    transition_reason: "Business, volunteer, and participant readiness completed",
    override_requirements: false,
  });
  if (error) throw new Error("Targets were met, but the event could not move to Upcoming.");

  revalidatePath("/coordinator/dashboard");
  revalidatePath("/coordinator/events/ongoing");
  revalidatePath("/coordinator/events/upcoming");
  revalidatePath(`/coordinator/events/${eventId}/lifecycle`);
  return true;
}
