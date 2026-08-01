import { z } from "zod";
import { headers } from "next/headers";

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
  appUrl: string;
  event: {
    id: string;
    name: string;
    starts_at: string;
    venue: string;
    organisation_id: string;
    course_id: string | null;
  };
  organisationName: string;
}

function buildInvitationContent(
  context: InvitationContext,
  participant: { email: string; fullName: string },
) {
  const eventPath = `/participant/events?event=${context.event.id}`;
  return buildEventInvitationEmail({
    participantName: participant.fullName,
    organisationName: context.organisationName,
    eventName: context.event.name,
    startsAt: context.event.starts_at,
    venue: context.event.venue,
    signInUrl: `${context.appUrl}/login?next=${encodeURIComponent(eventPath)}&email=${encodeURIComponent(participant.email)}`,
    signUpUrl: `${context.appUrl}/signup?event=${context.event.id}&email=${encodeURIComponent(participant.email)}`,
  });
}

async function getRequestAppUrl() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (host) {
    const forwardedProtocol = requestHeaders.get("x-forwarded-proto");
    const protocol = forwardedProtocol ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
    return `${protocol}://${host}`;
  }
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
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
      .select("id, name, starts_at, venue, organisation_id, course_id")
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

  return { coordinatorId: coordinator.id, appUrl: await getRequestAppUrl(), event, organisationName: organisation.name };
}

class InvitationEligibilityError extends Error {}

async function assertInvitationEligibility(context: InvitationContext, participantId?: string) {
  if (!context.event.course_id) return;
  const admin = createAdminClient();
  const { data: prerequisites } = await admin.from("course_prerequisites")
    .select("prerequisite_course_id,courses!course_prerequisites_prerequisite_course_id_fkey(name)")
    .eq("course_id", context.event.course_id);
  if (!prerequisites?.length) return;
  const names = prerequisites.map((item) => (Array.isArray(item.courses) ? item.courses[0] : item.courses)?.name ?? "required course");
  if (!participantId) throw new InvitationEligibilityError(`This event requires ${names.join(", ")}. A new user without completion records cannot be invited yet.`);
  const { data: attendance } = await admin.from("attendance").select("events(course_id)").eq("participant_id", participantId);
  const completed = new Set((attendance ?? []).map((row) => {
    const completedEvent = Array.isArray(row.events) ? row.events[0] : row.events;
    return completedEvent?.course_id;
  }).filter(Boolean));
  const unmet = prerequisites.filter((item) => !completed.has(item.prerequisite_course_id));
  if (unmet.length) {
    const unmetNames = unmet.map((item) => (Array.isArray(item.courses) ? item.courses[0] : item.courses)?.name ?? "required course");
    throw new InvitationEligibilityError(`Participant is not eligible. Complete ${unmetNames.join(", ")} first.`);
  }
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

  await assertInvitationEligibility(context, participantId);

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

  const emailContent = buildInvitationContent(context, { email, fullName: participant.fullName });

  const invitationId = crypto.randomUUID();
  const { error: invitationInsertError } = await admin.from("participant_invitations").insert({
    id: invitationId,
    event_id: context.event.id,
    email,
    full_name: participant.fullName,
    auth_user_id: participantId ?? null,
    invited_by: context.coordinatorId,
    status: kind === "existing_user" ? "existing_user" : "sent",
    invitation_source: source,
    email_delivery_status: "pending",
  });
  if (invitationInsertError) throw new Error("Invitation tracking could not be saved.");

  let deliveryStatus: InviteParticipantResult["deliveryStatus"] = "pending";
  let deliveryError: string | null = null;
  if (isMailjetConfigured()) {
    try {
      await sendEmail({
        toEmail: email,
        toName: participant.fullName,
        ...emailContent,
        customId: invitationId,
        eventPayload: invitationId,
      });
      deliveryStatus = "sent";
    } catch (error) {
      deliveryStatus = "failed";
      deliveryError = error instanceof Error ? error.message : "Email delivery failed.";
    }
  } else {
    deliveryError = "Mailjet is not configured.";
  }

  const { error: invitationError } = await admin.from("participant_invitations").update({
    email_delivery_status: deliveryStatus,
    email_delivery_error: deliveryError,
  }).eq("id", invitationId);
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

  const results: InviteParticipantResult[] = [];
  let ineligible = 0;
  for (const member of members) {
    try {
      results.push(await saveAndSendInvitation(context, {
        email: member.email,
        fullName: member.full_name,
      }, "organisation_mailing_list"));
    } catch (error) {
      if (error instanceof InvitationEligibilityError) ineligible += 1;
      else throw error;
    }
  }

  return {
    total: members.length,
    sent: results.filter((result) => !result.duplicate && result.deliveryStatus === "sent").length,
    pending: results.filter((result) => !result.duplicate && result.deliveryStatus === "pending").length,
    failed: results.filter((result) => !result.duplicate && result.deliveryStatus === "failed").length,
    skipped: results.filter((result) => result.duplicate).length,
    ineligible,
  };
}

export async function resendParticipantInvitation(input: { eventId: string; invitationId: string }) {
  const parsed = z.object({ eventId: z.string().uuid(), invitationId: z.string().uuid() }).parse(input);
  const context = await getInvitationContext(parsed.eventId);
  const admin = createAdminClient();
  const { data: invitation } = await admin
    .from("participant_invitations")
    .select("id,email,full_name")
    .eq("id", parsed.invitationId)
    .eq("event_id", parsed.eventId)
    .maybeSingle();
  if (!invitation) throw new Error("Invitation not found.");
  if (!isMailjetConfigured()) throw new Error("Mailjet is not configured.");

  await admin.from("participant_invitations").update({
    email_delivery_status: "pending",
    email_delivery_error: null,
  }).eq("id", invitation.id);

  try {
    const result = await sendEmail({
      toEmail: invitation.email,
      toName: invitation.full_name,
      ...buildInvitationContent(context, { email: invitation.email, fullName: invitation.full_name }),
      customId: invitation.id,
      eventPayload: invitation.id,
    });
    await admin.from("participant_invitations").update({
      email_delivery_status: "sent",
      email_delivery_error: null,
    }).eq("id", invitation.id);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email delivery failed.";
    await admin.from("participant_invitations").update({
      email_delivery_status: "failed",
      email_delivery_error: message,
    }).eq("id", invitation.id);
    throw new Error(message);
  }
}
