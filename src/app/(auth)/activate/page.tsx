import { redirect } from "next/navigation";
import { MailCheck } from "lucide-react";

import { Brand } from "@/components/brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

import { ActivationForm } from "./activation-form";

export default async function ActivatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?error=authentication");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "participant") {
    redirect("/login");
  }
  if (profile.onboarding_completed_at) {
    redirect("/participant/events");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-5 py-12">
      <div className="w-full max-w-lg">
        <Brand />
        <Card className="mt-8 border-0">
          <CardHeader>
            <span className="mb-3 grid size-12 place-items-center rounded-xl bg-secondary text-secondary-foreground">
              <MailCheck className="size-6" />
            </span>
            <CardTitle className="text-2xl">Complete your participant account</CardTitle>
            <CardDescription>
              Your event invitation has been accepted. Set up your profile and password to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivationForm defaultName={profile.full_name} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

