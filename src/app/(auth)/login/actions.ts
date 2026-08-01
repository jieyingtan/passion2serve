"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { roleHome, safeNextPath, type AppRole } from "@/lib/auth/paths";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export interface LoginState {
  error?: string;
}

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must contain at least 8 characters."),
  next: z.string().optional(),
  role: z.enum(["coordinator", "participant"]),
});

export async function signIn(_previousState: LoginState, formData: FormData): Promise<LoginState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured yet. Use either demo workspace from the home page." };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the submitted details." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { error: "The email address or password is incorrect." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  const role = (profile?.role ?? "participant") as AppRole;
  if (role !== parsed.data.role) {
    await supabase.auth.signOut();
    return {
      error: `This account is registered as a ${role}. Please use the ${role} sign-in instead.`,
    };
  }

  const requestedPath = safeNextPath(parsed.data.next);
  const requestedRoleMatches =
    !requestedPath || requestedPath.startsWith(`/${role}`);

  redirect(requestedRoleMatches && requestedPath ? requestedPath : roleHome(role));
}
