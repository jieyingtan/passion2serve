"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { normalizeParticipantEmail } from "@/lib/participants/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { issueAndEmailMembershipPass } from "@/server/participants/wallet";

export interface ParticipantSignupState {
  error?: string;
}

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().min(8, "Enter a valid phone number.").max(30),
  preferredLanguage: z.enum(["en", "zh", "ms", "ta"]),
  emailConsent: z.coerce.boolean(),
  whatsappConsent: z.coerce.boolean(),
  organisationId: z.preprocess((value) => value === "" ? null : value, z.string().uuid().nullable()),
  password: z.string().min(8, "Password must contain at least 8 characters."),
  confirmPassword: z.string(),
  eventId: z.preprocess((value) => value === "" ? null : value, z.string().uuid().nullable()),
}).refine((value) => value.password === value.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match.",
});

export async function createParticipantAccount(
  _previousState: ParticipantSignupState,
  formData: FormData,
): Promise<ParticipantSignupState> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    preferredLanguage: formData.get("preferredLanguage"),
    emailConsent: formData.get("emailConsent") === "on",
    whatsappConsent: formData.get("whatsappConsent") === "on",
    organisationId: formData.get("organisationId"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    eventId: formData.get("eventId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Check your details." };

  const email = normalizeParticipantEmail(parsed.data.email);
  const admin = createAdminClient();
  const supabase = await createClient();
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id, role, onboarding_completed_at")
    .ilike("email", email)
    .maybeSingle();
  let participantId: string;
  if (existingProfile?.role === "coordinator") {
    return { error: "This email belongs to a Coordinator account." };
  }
  if (existingProfile?.onboarding_completed_at) {
    return { error: "An account already exists. Sign in instead." };
  }
  if (existingProfile) {
    const { error: recoverySignInError } = await supabase.auth.signInWithPassword({
      email,
      password: parsed.data.password,
    });
    if (recoverySignInError) {
      return { error: "An incomplete account exists. Enter its password to finish setting it up." };
    }
    participantId = existingProfile.id;
  } else {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { full_name: parsed.data.fullName },
      app_metadata: { app_role: "participant" },
    });
    if (createError || !created.user) return { error: createError?.message || "Your account could not be created." };
    participantId = created.user.id;
  }
  const { error: profileError } = await admin.from("profiles").upsert({
    id: participantId,
    role: "participant",
    full_name: parsed.data.fullName,
    email,
    phone: parsed.data.phone,
    preferred_language: parsed.data.preferredLanguage,
    email_consent: parsed.data.emailConsent,
    whatsapp_consent: parsed.data.whatsappConsent,
    organisation_id: parsed.data.organisationId,
    onboarding_completed_at: new Date().toISOString(),
  });
  if (profileError) return { error: "Your account was created, but the profile could not be completed." };

  const { data: invitations } = await admin
    .from("participant_invitations")
    .select("id, event_id")
    .ilike("email", email);
  const eventIds = new Set((invitations ?? []).map((invitation) => invitation.event_id));
  if (parsed.data.eventId) eventIds.add(parsed.data.eventId);

  if (eventIds.size) {
    await admin.from("registrations").upsert(
      [...eventIds].map((eventId) => ({ event_id: eventId, participant_id: participantId, status: "invited" })),
      { onConflict: "event_id,participant_id", ignoreDuplicates: true },
    );
  }
  if (invitations?.length) {
    await admin.from("participant_invitations").update({
      auth_user_id: participantId,
      status: "accepted",
      accepted_at: new Date().toISOString(),
    }).in("id", invitations.map((invitation) => invitation.id));
  }

  let walletPending = false;
  try {
    const wallet = await issueAndEmailMembershipPass({
      participantId,
      fullName: parsed.data.fullName,
      email,
    });
    walletPending = wallet.status === "pending";
  } catch {
    walletPending = true;
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: parsed.data.password });
  if (signInError) redirect("/login?created=1");
  redirect(walletPending ? "/participant/events?signup=1&wallet=pending" : "/participant/events?signup=1");
}
