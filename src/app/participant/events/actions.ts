"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { sendEventNotice } from "@/server/follow-up/delivery";

export interface EventRegistrationState {
  error?: string;
  success?: string;
}

export async function registerForEvent(
  _previousState: EventRegistrationState,
  formData: FormData,
): Promise<EventRegistrationState> {
  const eventId = z.string().uuid().safeParse(formData.get("eventId"));
  if (!eventId.success) return { error: "Invalid event." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to register." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "participant") return { error: "Participant access required." };

  const { data, error } = await supabase.rpc("register_for_event", { target_event_id: eventId.data });
  if (error) return { error: error.message || "Your registration could not be saved." };
  const nextStatus = (data as { status?: string } | null)?.status ?? "registered";

  if (["registered", "confirmed", "waitlisted"].includes(nextStatus)) {
    after(async () => {
      try {
        await sendEventNotice({ participantId: user.id, eventId: eventId.data, type: "registration_receipt" });
      } catch (noticeError) {
        console.error("Registration saved but receipt delivery failed.", noticeError);
      }
    });
  }

  revalidatePath("/participant/events");
  revalidatePath("/participant/calendar");
  revalidatePath(`/coordinator/events/${eventId.data}/participants`);
  revalidatePath(`/coordinator/events/${eventId.data}/lifecycle`);
  return { success: nextStatus === "confirmed" ? "Registration confirmed." : nextStatus === "waitlisted" ? "The event is full. You have joined the waitlist." : nextStatus === "ineligible" ? "Complete the listed prerequisites before registering." : "Registration complete." };
}

export async function cancelRegistration(_previousState: EventRegistrationState, formData: FormData): Promise<EventRegistrationState> {
  const eventId=z.string().uuid().safeParse(formData.get("eventId")); if(!eventId.success)return{error:"Invalid event."};
  const supabase=await createClient(); const {error}=await supabase.rpc("cancel_event_registration",{target_event_id:eventId.data});
  if(error)return{error:error.message||"The registration could not be cancelled."};
  revalidatePath("/participant/events"); revalidatePath("/participant/calendar");
  return{success:"Registration cancelled."};
}
