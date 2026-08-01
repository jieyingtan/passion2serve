"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";

import { saveEventTranslations } from "@/lib/ai/translate";
import { isSupabaseConfigured } from "@/lib/config";
import { singaporeLocalToIso } from "@/lib/events/datetime";
import { eventTypes } from "@/lib/events/matching";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CreateEventState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

const eventSchema = z.object({
  name: z.string().trim().min(3, "Event name must contain at least 3 characters.").max(120),
  eventType: z.enum(eventTypes, { message: "Select an event type." }),
  startsAt: z.string().min(1, "Select a date and time."),
  venue: z.string().trim().min(3, "Enter a venue.").max(200),
  organisationId: z.string().uuid("Select a beneficiary organisation."),
  courseId: z.string().uuid("Select a course or programme."),
  volunteerTarget: z.coerce.number().int().min(0).max(10000),
  businessTarget: z.coerce.number().int().min(0).max(1000),
  participantCapacity: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().int().positive().max(100000).optional(),
  ),
  description: z.string().trim().max(3000).optional(),
  intent: z.enum(["draft", "start"]),
});

export async function createEvent(
  _previousState: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  if (!isSupabaseConfigured()) {
    return { error: "Demo mode does not save data. Configure Supabase to create events." };
  }

  const parsed = eventSchema.safeParse({
    name: formData.get("name"),
    eventType: formData.get("eventType"),
    startsAt: formData.get("startsAt"),
    venue: formData.get("venue"),
    organisationId: formData.get("organisationId"),
    courseId: formData.get("courseId"),
    volunteerTarget: formData.get("volunteerTarget"),
    businessTarget: formData.get("businessTarget"),
    participantCapacity: formData.get("participantCapacity"),
    description: formData.get("description"),
    intent: formData.get("intent"),
  });

  if (!parsed.success) {
    return {
      error: "Review the highlighted event details.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  let startsAtIso: string;
  try {
    startsAtIso = singaporeLocalToIso(parsed.data.startsAt);
  } catch {
    return {
      error: "Review the highlighted event details.",
      fieldErrors: { startsAt: ["Enter a valid Singapore date and time."] },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Your session has expired. Sign in and try again." };
  }

  const admin = createAdminClient();
  const { data: course } = await admin.from("courses").select("id,event_type").eq("id", parsed.data.courseId).maybeSingle();
  if (!course || course.event_type !== parsed.data.eventType) {
    return { error: "Select a course that belongs to this event type." };
  }

  const { data: eventId, error } = await supabase.rpc("create_event", {
    target_organisation_id: parsed.data.organisationId,
    event_name: parsed.data.name,
    target_event_type: parsed.data.eventType,
    event_description: parsed.data.description || null,
    event_starts_at: startsAtIso,
    event_venue: parsed.data.venue,
    target_volunteer_count: parsed.data.volunteerTarget,
    target_business_count: parsed.data.businessTarget,
    target_participant_capacity: parsed.data.participantCapacity ?? null,
    initial_status: parsed.data.intent === "draft" ? "create" : "ongoing",
  });

  if (error) {
    return { error: error.message || "The event could not be created." };
  }

  if (eventId) {
    const { error: courseError } = await admin.from("events").update({ course_id: course.id }).eq("id", eventId).eq("created_by", user.id);
    if (courseError) return { error: "The event was created, but its course prerequisites could not be saved." };

    after(async () => {
      await saveEventTranslations(eventId, parsed.data.name, parsed.data.description ?? null, parsed.data.venue);
    });
  }

  redirect(
    parsed.data.intent === "start" && eventId
      ? `/coordinator/events/${eventId}/operations?created=1`
      : "/coordinator/dashboard?created=1",
  );
}
