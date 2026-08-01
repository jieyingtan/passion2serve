"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function deleteEvent(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired. Sign in and try again." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "coordinator") return { error: "Only coordinators can delete events." };

  const admin = createAdminClient();

  const { data: event } = await admin
    .from("events")
    .select("id, status")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) return { error: "Event not found." };
  if (event.status !== "ongoing") return { error: "Only Ongoing events can be deleted." };

  const { error } = await admin.from("events").delete().eq("id", eventId);

  if (error) return { error: "The event could not be deleted. It may have active registrations or attendance records that prevent deletion." };

  revalidatePath("/coordinator/dashboard");
  revalidatePath("/coordinator/events/ongoing");

  return { success: true };
}
