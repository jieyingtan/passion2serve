import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/auth/paths";
import { createClient } from "@/lib/supabase/server";

const supportedTypes: EmailOtpType[] = ["invite", "email", "signup", "recovery", "magiclink"];

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const nextPath = safeNextPath(request.nextUrl.searchParams.get("next")) || "/activate";

  if (!tokenHash || !type || !supportedTypes.includes(type)) {
    return NextResponse.redirect(new URL("/login?error=authentication", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) {
    return NextResponse.redirect(new URL("/login?error=authentication", request.url));
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}

