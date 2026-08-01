"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { advanceEventIfReady } from "@/server/events/readiness";
import { processAttendanceFollowUp } from "@/server/follow-up/attendance";

export interface LifecycleActionState { error?: string; success?: string }

const transitionSchema = z.object({
  eventId: z.string().uuid(),
  targetStatus: z.enum(["ongoing", "upcoming", "awaiting_closure", "archived"]),
  override: z.enum(["true", "false"]),
  reason: z.string().trim().max(500).optional(),
});

async function coordinatorEvent(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Your session has expired. Sign in again.");
  const admin = createAdminClient();
  const { data: event } = await admin.from("events").select("id, organisation_id").eq("id", eventId).maybeSingle();
  if (!event) throw new Error("Event not found.");
  const { data: assignment } = await admin.from("coordinator_assignments").select("id").eq("coordinator_id", user.id).eq("organisation_id", event.organisation_id).maybeSingle();
  if (!assignment) throw new Error("You are not authorised to manage this event.");
  return { admin, supabase, user };
}

export async function transitionEvent(_state: LifecycleActionState, formData: FormData): Promise<LifecycleActionState> {
  const parsed = transitionSchema.safeParse({
    eventId: formData.get("eventId"), targetStatus: formData.get("targetStatus"),
    override: formData.get("override") ?? "false", reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) return { error: "Review the transition details." };
  const override = parsed.data.override === "true";
  if (override && (parsed.data.reason?.length ?? 0) < 5) return { error: "Enter an override reason of at least 5 characters." };
  try {
    const { supabase } = await coordinatorEvent(parsed.data.eventId);
    const { error } = await supabase.rpc("transition_event", {
      target_event_id: parsed.data.eventId,
      target_status: parsed.data.targetStatus,
      transition_reason: parsed.data.reason || null,
      override_requirements: override,
    });
    if (error) return { error: error.message };
    revalidatePath("/coordinator/dashboard");
    revalidatePath("/coordinator/events", "layout");
    revalidatePath(`/coordinator/events/${parsed.data.eventId}/lifecycle`);
    return { success: `Event moved to ${parsed.data.targetStatus.replaceAll("_", " ")}.` };
  } catch (error) { return { error: error instanceof Error ? error.message : "The event could not be progressed." }; }
}

export async function markParticipantListReviewed(formData: FormData) {
  const eventId = z.string().uuid().parse(formData.get("eventId"));
  const { admin } = await coordinatorEvent(eventId);
  const { error } = await admin.from("events").update({ participant_reviewed_at: new Date().toISOString() }).eq("id", eventId);
  if (error) throw new Error("The participant review could not be saved.");
  revalidatePath(`/coordinator/events/${eventId}/operations`);
  revalidatePath(`/coordinator/events/${eventId}/lifecycle`);
  revalidatePath(`/coordinator/events/${eventId}/participants`);
}

export async function moveReadyEventToUpcoming(formData: FormData) {
  const eventId = z.string().uuid().parse(formData.get("eventId"));
  await coordinatorEvent(eventId);
  const movedToUpcoming = await advanceEventIfReady(eventId);
  if (!movedToUpcoming) throw new Error("Complete the business, volunteer, and participant readiness checks first.");
  redirect("/coordinator/events/upcoming");
}

const attendancePersonSchema = z.object({ eventId: z.string().uuid(), personId: z.string().uuid() });

export async function recordManualAttendance(formData: FormData) {
  const parsed = attendancePersonSchema.parse({ eventId: formData.get("eventId"), personId: formData.get("participantId") });
  const { supabase, admin } = await coordinatorEvent(parsed.eventId);
  const { error } = await supabase.rpc("record_attendance", {
    target_event_id: parsed.eventId,
    target_participant_id: parsed.personId,
    attendance_source: "manual_roster",
  });
  if (error) throw new Error(error.message || "Attendance could not be recorded.");
  try {
    await processAttendanceFollowUp({ eventId: parsed.eventId, participantId: parsed.personId });
  } catch (error) {
    await admin.from("audit_logs").insert({ action: "attendance.follow_up_failed", entity_type: "event", entity_id: parsed.eventId, after_value: { participantId: parsed.personId, error: error instanceof Error ? error.message : "Unknown follow-up error" } });
  }
  revalidatePath(`/coordinator/events/${parsed.eventId}/lifecycle`);
}

export async function markParticipantNoShow(formData: FormData) {
  const parsed = attendancePersonSchema.parse({ eventId: formData.get("eventId"), personId: formData.get("participantId") });
  const { admin } = await coordinatorEvent(parsed.eventId);
  const { error } = await admin.from("registrations").update({ status: "no_show" }).eq("event_id", parsed.eventId).eq("participant_id", parsed.personId).neq("status", "attended");
  if (error) throw new Error("The participant status could not be updated.");
  revalidatePath(`/coordinator/events/${parsed.eventId}/lifecycle`);
}

export async function markVolunteerAttendance(formData: FormData) {
  const parsed = attendancePersonSchema.parse({ eventId: formData.get("eventId"), personId: formData.get("eventVolunteerId") });
  const status = z.enum(["attended", "no_show"]).parse(formData.get("status"));
  const { admin } = await coordinatorEvent(parsed.eventId);
  const { error } = await admin.from("event_volunteers").update({ status }).eq("event_id", parsed.eventId).eq("id", parsed.personId);
  if (error) throw new Error("Volunteer attendance could not be updated.");
  revalidatePath(`/coordinator/events/${parsed.eventId}/lifecycle`);
}

const closureSchema = z.object({
  eventId: z.string().uuid(), beneficiaryReach: z.coerce.number().int().min(0), outcomes: z.string().trim().min(3),
  feedbackSummary: z.string().trim().min(3), impactSummary: z.string().trim().min(3), publicityLinks: z.string().trim().optional(),
});

export async function saveClosureReport(_state: LifecycleActionState, formData: FormData): Promise<LifecycleActionState> {
  const parsed = closureSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Complete all required closure figures and summaries." };
  try {
    const { admin, user } = await coordinatorEvent(parsed.data.eventId);
    const [{ count: participantAttendance }, { count: volunteerAttendance }, { count: businessParticipation }] = await Promise.all([
      admin.from("attendance").select("id", { count: "exact", head: true }).eq("event_id", parsed.data.eventId),
      admin.from("event_volunteers").select("id", { count: "exact", head: true }).eq("event_id", parsed.data.eventId).eq("status", "attended"),
      admin.from("event_businesses").select("id", { count: "exact", head: true }).eq("event_id", parsed.data.eventId).eq("status", "confirmed"),
    ]);
    const { error } = await admin.from("event_closure_reports").upsert({
      event_id: parsed.data.eventId, participant_attendance: participantAttendance ?? 0,
      volunteer_attendance: volunteerAttendance ?? 0, business_participation: businessParticipation ?? 0,
      beneficiary_reach: parsed.data.beneficiaryReach, outcomes: parsed.data.outcomes,
      feedback_summary: parsed.data.feedbackSummary, impact_summary: parsed.data.impactSummary,
      publicity_links: parsed.data.publicityLinks || null, submitted_by: user.id, submitted_at: new Date().toISOString(),
    });
    if (error) return { error: "The closure report could not be saved." };
    revalidatePath(`/coordinator/events/${parsed.data.eventId}/lifecycle`);
    return { success: "Closure report saved. The event is ready to archive." };
  } catch (error) { return { error: error instanceof Error ? error.message : "The closure report could not be saved." }; }
}
