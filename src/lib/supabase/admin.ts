import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getRequiredEnv } from "@/lib/config";

export function createAdminClient() {
  return createSupabaseClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
