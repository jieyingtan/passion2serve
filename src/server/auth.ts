import { roleHome, type AppRole } from "@/lib/auth/paths";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export interface CurrentProfile {
  id: string;
  fullName: string;
  role: AppRole;
  preferredLanguage: "en" | "zh" | "ms" | "ta";
}

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, preferred_language")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    fullName: data.full_name,
    role: data.role as AppRole,
    preferredLanguage: data.preferred_language as CurrentProfile["preferredLanguage"],
  };
}

export async function getAuthenticatedHome() {
  const profile = await getCurrentProfile();
  return profile ? roleHome(profile.role) : null;
}
