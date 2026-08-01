"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export interface ProfileState { error?: string; success?: string }

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(30),
  preferredLanguage: z.enum(["en", "zh", "ms", "ta"]),
  emailConsent: z.coerce.boolean(),
  whatsappConsent: z.coerce.boolean(),
  publicityConsent: z.coerce.boolean(),
});

export async function updateParticipantProfile(_state: ProfileState, formData: FormData): Promise<ProfileState> {
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"), phone: formData.get("phone"), preferredLanguage: formData.get("preferredLanguage"),
    emailConsent: formData.get("emailConsent") === "on", whatsappConsent: formData.get("whatsappConsent") === "on", publicityConsent: formData.get("publicityConsent") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Review your profile details." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in again to update your profile." };
  const { error } = await supabase.from("profiles").update({
    full_name: parsed.data.fullName, phone: parsed.data.phone, preferred_language: parsed.data.preferredLanguage,
    email_consent: parsed.data.emailConsent, whatsapp_consent: parsed.data.whatsappConsent, publicity_consent: parsed.data.publicityConsent,
  }).eq("id", user.id);
  if (error) return { error: "Your profile could not be updated." };
  revalidatePath("/participant", "layout");
  revalidatePath("/participant/profile");
  return { success: "Profile and language preferences saved." };
}
