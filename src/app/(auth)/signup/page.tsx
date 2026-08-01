import Link from "next/link";
import { BadgeCheck } from "lucide-react";

import { Brand } from "@/components/brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";

import { ParticipantSignupForm } from "./signup-form";

export default async function ParticipantSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; event?: string }>;
}) {
  const query = await searchParams;
  const admin = createAdminClient();
  const { data: organisations } = await admin.from("beneficiary_organisations").select("id, name").eq("active", true).order("name");
  const { data: event } = query.event
    ? await admin.from("events").select("name").eq("id", query.event).maybeSingle()
    : { data: null };

  return (
    <main className="min-h-screen bg-muted/40 px-5 py-10">
      <div className="mx-auto max-w-2xl">
        <Brand />
        <Card className="mt-8 border-0">
          <CardHeader>
            <span className="mb-3 grid size-12 place-items-center rounded-xl bg-secondary text-secondary-foreground"><BadgeCheck className="size-6" /></span>
            <CardTitle className="text-2xl">Create your participant account</CardTitle>
            <CardDescription>
              {event ? `Create an account to respond to your invitation for ${event.name}.` : "Register for events, keep your membership QR, and track your progress."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ParticipantSignupForm defaultEmail={query.email} eventId={query.event} organisations={organisations ?? []} />
            <p className="mt-5 text-center text-sm text-muted-foreground">Already have an account? <Link className="font-semibold text-primary" href="/login">Sign in as a Participant</Link></p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
