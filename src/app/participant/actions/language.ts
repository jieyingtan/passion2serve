"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const langSchema = z.enum(["en", "zh", "ms", "ta"]);

export async function changeLanguage(lang: string) {
  const parsed = langSchema.safeParse(lang);
  if (!parsed.success) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("profiles").update({ preferred_language: parsed.data }).eq("id", user.id);
  revalidatePath("/participant", "layout");
}
