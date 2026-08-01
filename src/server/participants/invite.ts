import { z } from "zod";

import { isMailjetConfigured, sendEmail } from "@/lib/mailjet/client";
import { normalizeParticipantEmail } from "@/lib/participants/email";
import { buildEventInvitationEmail } from "@/lib/participants/invitation-email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const invitationSchema = z.object({
  eventId: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().trim().min(2).max(120),
});

export interface InviteParticipantInput {
  eventId: string;
  email: string;
  fullName: string;
}

export type InviteParticipantResult = {
  kind: "existing_user" | "new_user";
  participantId?: string;
  deliveryStatus: "sent" | "pending" | "failed";
  duplicate: boolean;
};

interface InvitationContext {
  coordinatorId: string;
  event: {
    id: string;
    name: string;
    starts_at: string;
    venue: string;
    organisation_id: string;
  };
  organisationName: string;
}

async function getInvitationContext(eventId: string): Promise<InvitationContext> {
  const supabase = await createClient();
  const {
    data: { user: coordinator },
  } = await supabase.auth.getUser();
  if (!coordinator) throw new Error("Authentication required.");

  const admin = createAdminClient();
  const [{ data: coordinatorProfile }, { data: event }] = await Promise.all([
    admin.from("profiles").select("role").eq("id", coordinator.id).maybeSingle(),
    admin
      .from("events")
      .select("id, name, starts_at, venue, organisation_id")
      .eq("id", eventId)
      .maybeSingle(),
  ]);
  if (coordinatorProfile?.role !== "coordinator") throw new Error("Coordinator access required.");
  if (!event) throw new Error("Event not found.");

  const [{ data: assignment }, { data: organisation }] = await Promise.all([
    admin
      .from("coordinator_assignments")
      .select("id")
      .eq("coordinator_id", coordinator.id)
      .eq("organisation_id", event.organisation_id)
      .maybeSingle(),
    admin
      .from("beneficiary_organisations")
      .select("name")
      .eq("id", event.organisation_id)
      .maybeSingle(),
  ]);
  if (!assignment) throw new Error("You are not assigned to this event's organisation.");
  if (!organisation) throw new Error("Beneficiary organisation not found.");

  return { coordinatorId: coordinator.id, event, organisationName: organisation.name };
}

async function saveAndSendInvitation(
  context: InvitationContext,
  participant: { email: string; fullName: string },
  source: "individual" | "organisation_mailing_list",
): Promise<InviteParticipantResult> {
  const admin = createAdminClient();
  const email = normalizeParticipantEmail(participant.email);
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id, role")
    .ilike("email", email)
    .maybeSingle();
  if (existingProfile?.role === "coordinator") {
    throw new Error("A Coordinator account cannot be invited as a Participant.");
  }

  const participantId = existingProfile?.id as string | undefined;
  const kind: InviteParticipantResult["kind"] = participantId ? "existing_user" : "new_user";

  const [{ data: existingInvitation }, existingRegistrationResult] = await Promise.all([
    admin.from("participant_invitations").select("id,email_delivery_status,auth_user_id").eq("event_id", context.event.id).ilike("email", email).maybeSingle(),
    participantId
      ? admin.from("registrations").select("id").eq("event_id", context.event.id).eq("participant_id", participantId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (existingInvitation || existingRegistrationResult.data) {
    return {
      kind,
      participantId: participantId ?? existingInvitation?.auth_user_id ?? undefined,
      deliveryStatus: existingInvitation?.email_delivery_status === "sent" || existingInvitation?.email_delivery_status === "failed"
        ? existingInvitation.email_delivery_status
        : "pending",
      duplicate: true,
    };
  }

  if (participantId) {
    const { error } = await admin.from("registrations").upsert(
      { event_id: context.event.id, participant_id: participantId, status: "invited" },
      { onConflict: "event_id,participant_id", ignoreDuplicates: true },
    );
    if (error) throw new Error("The participant account was found, but the event invitation could not be saved.");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const eventPath = `/participant/events?event=${context.event.id}`;
  const signInUrl = `${appUrl}/login?next=${encodeURIComponent(eventPath)}`;
  const signUpUrl = `${appUrl}/signup?event=${context.event.id}&email=${encodeURIComponent(email)}`;
  const emailContent = buildEventInvitationEmail({
    participantName: participant.fullName,
    organisationName: context.organisationName,
    eventName: context.event.name,
    startsAt: context.event.starts_at,
    venue: context.event.venue,
    signInUrl,
    signUpUrl,
  });

  let deliveryStatus: InviteParticipantResult["deliveryStatus"] = "pending";
  let deliveryError: string | null = null;
  if (isMailjetConfigured()) {
    try {
      await sendEmail({
        toEmail: email,
        toName: participant.fullName,
        ...emailContent,
      });
      deliveryStatus = "sent";
    } catch (error) {
      deliveryStatus = "failed";
      deliveryError = error instanceof Error ? error.message : "Email delivery failed.";
    }
  } else {
    deliveryError = "Mailjet is not configured.";
  }

  const { error: invitationError } = await admin.from("participant_invitations").upsert(
    {
      event_id: context.event.id,
      email,
      full_name: participant.fullName,
      auth_user_id: participantId ?? null,
      invited_by: context.coordinatorId,
      status: kind === "existing_user" ? "existing_user" : "sent",
      invitation_source: source,
      email_delivery_status: deliveryStatus,
      email_delivery_error: deliveryError,
    },
    { onConflict: "event_id,email" },
  );
  if (invitationError) throw new Error("Invitation tracking could not be saved.");

  return { kind, participantId, deliveryStatus, duplicate: false };
}

export async function inviteParticipantToEvent(input: InviteParticipantInput) {
  const parsed = invitationSchema.parse({ ...input, email: normalizeParticipantEmail(input.email) });
  const context = await getInvitationContext(parsed.eventId);
  return saveAndSendInvitation(context, parsed, "individual");
}

export async function inviteOrganisationMailingListToEvent(eventId: string) {
  const parsedEventId = z.string().uuid().parse(eventId);
  const context = await getInvitationContext(parsedEventId);
  const admin = createAdminClient();
  const { data: members, error } = await admin
    .from("beneficiary_organisation_members")
    .select("full_name, email")
    .eq("organisation_id", context.event.organisation_id)
    .eq("active", true)
    .order("full_name");
  if (error) throw new Error("The beneficiary mailing list could not be loaded.");
  if (!members?.length) throw new Error("This beneficiary organisation has no active mailing-list members.");

  const results = [];
  for (const member of members) {
    results.push(await saveAndSendInvitation(context, {
      email: member.email,
      fullName: member.full_name,
    }, "organisation_mailing_list"));
  }

  return {
    total: results.length,
    sent: results.filter((result) => !result.duplicate && result.deliveryStatus === "sent").length,
    pending: results.filter((result) => !result.duplicate && result.deliveryStatus === "pending").length,
    failed: results.filter((result) => !result.duplicate && result.deliveryStatus === "failed").length,
    skipped: results.filter((result) => result.duplicate).length,
  };
}
