"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export interface RetentionState { error?: string; success?: string }

export async function redeemReward(_state: RetentionState, formData: FormData): Promise<RetentionState> {
  const rewardId = z.string().uuid().safeParse(formData.get("rewardId"));
  if (!rewardId.success) return { error: "Invalid reward." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("redeem_reward", { target_reward_id: rewardId.data });
  if (error) return { error: error.message || "Reward redemption failed." };
  revalidatePath("/participant/progress");
  return { success: "Reward requested. The organisation will contact you with fulfilment details." };
}

export async function saveFeedback(_state: RetentionState, formData: FormData): Promise<RetentionState> {
  const parsed = z.object({ eventId: z.string().uuid(), rating: z.coerce.number().int().min(1).max(5), feedback: z.string().trim().min(3).max(1000), personalStory: z.string().trim().max(2000).optional(), storyConsent: z.enum(["on"]).optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Add a rating and feedback before submitting." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to share feedback." };
  const { data: awarded, error } = await supabase.rpc("submit_participant_feedback", { target_event_id: parsed.data.eventId, target_rating: parsed.data.rating, target_feedback: parsed.data.feedback, target_personal_story: parsed.data.personalStory || null, target_story_consent: parsed.data.storyConsent === "on" });
  if (error) return { error: "Feedback could not be saved." };
  revalidatePath("/participant/progress");
  revalidatePath("/");
  return { success: awarded ? "Thank you. Your feedback has been saved and 10 points were added." : "Your feedback has been updated." };
}
