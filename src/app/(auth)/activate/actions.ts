"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { normalizeParticipantEmail } from "@/lib/participants/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { issueAndEmailMembershipPass } from "@/server/participants/wallet";

export interface ActivationState {
  error?: string;
}

const activationSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name.").max(120),
    phone: z.string().trim().min(8, "Enter a valid phone number.").max(30),
    password: z.string().min(8, "Password must contain at least 8 characters."),
    confirmPassword: z.string(),
    preferredLanguage: z.enum(["en", "zh", "ms", "ta"]),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export async function activateParticipant(
  _previousState: ActivationState,
  formData: FormData,
): Promise<ActivationState> {
  const parsed = activationSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    preferredLanguage: formData.get("preferredLanguage"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Check the submitted details." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { error: "Your invitation session has expired. Ask the Coordinator to resend it." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "participant") {
    return { error: "This activation page is only for invited Participants." };
  }

  const { error: passwordError } = await supabase.auth.updateUser({
    password: parsed.data.password,
    data: { full_name: parsed.data.fullName },
  });
  if (passwordError) {
    return { error: "Your password could not be saved. Please try again." };
  }

  const admin = createAdminClient();
  const completedAt = new Date().toISOString();
  const { error: profileError } = await admin
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      email: normalizeParticipantEmail(user.email),
      phone: parsed.data.phone,
      preferred_language: parsed.data.preferredLanguage,
      onboarding_completed_at: completedAt,
    })
    .eq("id", user.id);
  if (profileError) {
    return { error: "Your profile could not be completed. Please try again." };
  }

  let walletStatus: "sent" | "pending" | "failed" = "pending";
  let walletError: string | null = null;
  try {
    const result = await issueAndEmailMembershipPass({
      participantId: user.id,
      fullName: parsed.data.fullName,
      email: normalizeParticipantEmail(user.email),
    });
    walletStatus = result.status;
    walletError = result.status === "pending" ? result.reason : null;
  } catch (error) {
    walletStatus = "failed";
    walletError = error instanceof Error ? error.message : "Wallet delivery failed.";
  }

  await admin
    .from("participant_invitations")
    .update({
      status: "accepted",
      accepted_at: completedAt,
      wallet_delivery_status: walletStatus,
      wallet_delivery_error: walletError,
    })
    .eq("auth_user_id", user.id);

  redirect(walletStatus === "sent" ? "/participant/pass?activated=1" : "/participant/pass?activated=1&wallet=pending");
}

