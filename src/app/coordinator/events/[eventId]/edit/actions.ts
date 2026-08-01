"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { singaporeLocalToIso } from "@/lib/events/datetime";
import { eventTypes } from "@/lib/events/matching";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface EditEventState {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
}

const editEventSchema = z.object({
  eventId: z.string().uuid(),
  name: z.string().trim().min(3, "Event name must contain at least 3 characters.").max(120),
  eventType: z.enum(eventTypes, { message: "Select an event type." }),
  startsAt: z.string().min(1, "Select a date and time."),
  venue: z.string().trim().min(3, "Enter a venue.").max(200),
  organisationId: z.string().uuid("Select a beneficiary organisation."),
  courseId: z.string().uuid("Select a course or programme."),
  volunteerTarget: z.coerce.number().int().min(0).max(10000),
  businessTarget: z.coerce.number().int().min(0).max(1000),
  participantCapacity: z.preprocess(
    (value) => value === "" || value === null ? null : value,
    z.union([z.coerce.number().int().positive().max(100000), z.null()]),
  ),
  description: z.string().trim().max(3000).optional(),
});

export async function updateEvent(
  _state: EditEventState,
  formData: FormData,
): Promise<EditEventState> {
  const parsed = editEventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Review the highlighted event details.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let startsAt: string;
  try { startsAt = singaporeLocalToIso(parsed.data.startsAt); }
  catch { return { error: "Review the highlighted event details.", fieldErrors: { startsAt: ["Enter a valid Singapore date and time."] } }; }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Sign in and try again." };

  const admin = createAdminClient();
  const { data: current } = await admin.from("events").select("*").eq("id", parsed.data.eventId).maybeSingle();
  if (!current) return { error: "Event not found." };
  if (current.status !== "ongoing") return { error: "Only Ongoing events can be edited." };

  const { data: assignments } = await admin.from("coordinator_assignments").select("organisation_id").eq("coordinator_id", user.id).in("organisation_id", [current.organisation_id, parsed.data.organisationId]);
  const assignedIds = new Set((assignments ?? []).map((item) => item.organisation_id));
  if (!assignedIds.has(current.organisation_id) || !assignedIds.has(parsed.data.organisationId)) {
    return { error: "You are not authorised to manage the selected beneficiary organisation." };
  }
  const {data:course}=await admin.from("courses").select("id,event_type").eq("id",parsed.data.courseId).maybeSingle();
  if(!course||course.event_type!==parsed.data.eventType)return{error:"Select a course that belongs to this event type."};

  const changes = {
    name: parsed.data.name,
    event_type: parsed.data.eventType,
    description: parsed.data.description || null,
    starts_at: startsAt,
    venue: parsed.data.venue,
    organisation_id: parsed.data.organisationId,
    course_id: parsed.data.courseId,
    volunteer_target: parsed.data.volunteerTarget,
    business_target: parsed.data.businessTarget,
    participant_capacity: parsed.data.participantCapacity,
    participant_reviewed_at: null,
  };
  const { error } = await admin.from("events").update(changes).eq("id", current.id).eq("status", "ongoing");
  if (error) return { error: "The event requirements could not be updated." };

  await admin.from("audit_logs").insert({
    actor_id: user.id,
    action: "event.requirements_updated",
    entity_type: "event",
    entity_id: current.id,
    before_value: current,
    after_value: changes,
  });
  revalidatePath("/coordinator/dashboard");
  revalidatePath("/coordinator/events/ongoing");
  revalidatePath(`/coordinator/events/${current.id}/operations`);
  revalidatePath(`/coordinator/events/${current.id}/lifecycle`);
  revalidatePath(`/coordinator/events/${current.id}/edit`);
  return { success: "Event requirements updated. Participant readiness has been reset for review." };
}
