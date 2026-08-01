import { NextResponse, type NextRequest } from "next/server";

import { roleHome, safeNextPath, type AppRole } from "@/lib/auth/paths";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const requestedPath = safeNextPath(request.nextUrl.searchParams.get("next"));

  if (!isSupabaseConfigured() || !code) {
    return NextResponse.redirect(new URL("/login?error=authentication", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=authentication", request.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  const role = (profile?.role ?? "participant") as AppRole;
  const destination = requestedPath?.startsWith(`/${role}`) ? requestedPath : roleHome(role);

  return NextResponse.redirect(new URL(destination, request.url));
}
