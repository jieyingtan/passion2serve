"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseSpreadsheet } from "@/lib/imports/spreadsheet";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import {
  inviteOrganisationMailingListToEvent,
  inviteParticipantToEvent,
} from "@/server/participants/invite";

export interface InviteParticipantState {
  error?: string;
  success?: string;
}

export interface InviteMailingListState {
  error?: string;
  success?: string;
}
export interface ImportParticipantState { error?: string; success?: string }

export async function importParticipants(_state: ImportParticipantState, formData: FormData): Promise<ImportParticipantState> {
  const eventId = z.string().uuid().safeParse(formData.get("eventId"));
  const file = formData.get("file");
  if (!eventId.success || !(file instanceof File)) return { error: "Choose a valid participant spreadsheet." };
  try {
    const rows = await parseSpreadsheet(file);
    if (rows.length > 200) return { error: "Import up to 200 participants at a time." };
    let saved = 0;
    let failed = 0;
    let skipped = 0;
    for (const [index, row] of rows.entries()) {
      const parsed = z.object({ fullName: z.string().trim().min(2), email: z.string().email() }).safeParse({ fullName: row.full_name || row.name, email: row.email?.toLowerCase() });
      if (!parsed.success) throw new Error(`Check the name and email in spreadsheet row ${index + 2}.`);
      try { const result=await inviteParticipantToEvent({ eventId: eventId.data, ...parsed.data }); if(result.duplicate)skipped+=1;else saved += 1; }
      catch { failed += 1; }
    }
    revalidatePath(`/coordinator/events/${eventId.data}/participants`);
    return { success: `${saved} new participant${saved === 1 ? "" : "s"} imported and invited.${skipped ? ` ${skipped} already on this event were skipped.` : ""}${failed ? ` ${failed} could not be imported.` : ""}` };
  } catch (error) { return { error: error instanceof Error ? error.message : "The spreadsheet could not be imported." }; }
}

const formSchema = z.object({
  eventId: z.string().uuid(),
  fullName: z.string().trim().min(2, "Enter the participant's name.").max(120),
  email: z.string().trim().email("Enter a valid email address."),
});

export async function inviteParticipant(
  _previousState: InviteParticipantState,
  formData: FormData,
): Promise<InviteParticipantState> {
  const parsed = formSchema.safeParse({
    eventId: formData.get("eventId"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Check the participant details." };
  }

  try {
    const result = await inviteParticipantToEvent(parsed.data);
    revalidatePath(`/coordinator/events/${parsed.data.eventId}/participants`);
    if (result.duplicate) return { success: "This participant is already on the event list. No duplicate invitation was sent." };
    return {
      success:
        result.deliveryStatus === "sent"
          ? result.kind === "new_user"
            ? "Detailed invitation sent with sign-in and account-creation links."
            : "Existing participant added and emailed a confirmation link."
          : "Invitation saved. Email delivery is pending until Mailjet is configured.",
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "The participant could not be invited." };
  }
}

export async function inviteMailingList(
  _previousState: InviteMailingListState,
  formData: FormData,
): Promise<InviteMailingListState> {
  const eventId = z.string().uuid().safeParse(formData.get("eventId"));
  if (!eventId.success) return { error: "Invalid event." };

  try {
    const result = await inviteOrganisationMailingListToEvent(eventId.data);
    revalidatePath(`/coordinator/events/${eventId.data}/participants`);
    return {
      success: result.sent
        ? `${result.sent} new detailed invitations sent.${result.skipped ? ` ${result.skipped} existing event invitations skipped.` : ""} ${result.pending ? `${result.pending} pending.` : ""}`
        : result.skipped === result.total
          ? `All ${result.total} members are already on this event. No duplicate invitations were sent.`
          : `${result.total - result.skipped} new invitations prepared.${result.skipped ? ` ${result.skipped} duplicates skipped.` : ""} Email delivery is pending until Mailjet is configured.`,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "The mailing list could not be invited." };
  }
}

const removeSchema = z.object({ eventId: z.string().uuid(), invitationId: z.string().uuid() });

export async function removeIneligibleParticipant(formData: FormData) {
  const parsed = removeSchema.parse({ eventId: formData.get("eventId"), invitationId: formData.get("invitationId") });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required.");
  const admin = createAdminClient();
  const [{ data: profile }, { data: event }, { data: invitation }] = await Promise.all([
    admin.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    admin.from("events").select("id,organisation_id,course_id").eq("id", parsed.eventId).maybeSingle(),
    admin.from("participant_invitations").select("id,auth_user_id,email").eq("id", parsed.invitationId).eq("event_id", parsed.eventId).maybeSingle(),
  ]);
  if (profile?.role !== "coordinator" || !event || !invitation) throw new Error("You are not authorised to remove this participant.");
  const { data: assignment } = await admin.from("coordinator_assignments").select("id").eq("coordinator_id", user.id).eq("organisation_id", event.organisation_id).maybeSingle();
  if (!assignment) throw new Error("You are not authorised to manage this event.");
  if (!invitation.auth_user_id) throw new Error("Eligibility cannot be confirmed until the participant creates an account.");
  const [{ data: registration }, { data: eligibility, error: eligibilityError }] = await Promise.all([
    admin.from("registrations").select("status").eq("event_id", parsed.eventId).eq("participant_id", invitation.auth_user_id).maybeSingle(),
    supabase.rpc("evaluate_event_eligibility", { target_event_id: parsed.eventId, target_participant_id: invitation.auth_user_id }),
  ]);
  if (registration?.status === "attended") throw new Error("Recorded attendance cannot be removed from the participant list.");
  if (eligibilityError) throw new Error("The participant's course eligibility could not be verified.");
  if ((eligibility as { eligible?: boolean } | null)?.eligible !== false) throw new Error("This participant currently meets the course prerequisites.");
  const { error: registrationError } = await admin.from("registrations").delete().eq("event_id", parsed.eventId).eq("participant_id", invitation.auth_user_id);
  if (registrationError) throw new Error("The participant registration could not be removed.");
  const { error } = await admin.from("participant_invitations").delete().eq("id", invitation.id).eq("event_id", parsed.eventId);
  if (error) throw new Error("The participant invitation could not be removed.");
  await admin.from("audit_logs").insert({ actor_id: user.id, action: "event.participant_removed", entity_type: "event", entity_id: parsed.eventId, before_value: { invitationId: invitation.id, participantId: invitation.auth_user_id, email: invitation.email, reason: "course_prerequisites_not_met" } });
  revalidatePath(`/coordinator/events/${parsed.eventId}/participants`);
}
