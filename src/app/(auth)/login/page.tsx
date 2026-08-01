import Link from "next/link";
import { ArrowLeft, CalendarCheck, UsersRound } from "lucide-react";

import { Brand } from "@/components/brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { safeNextPath } from "@/lib/auth/paths";

import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string; next?: string }>;
}) {
  const { email, error, next } = await searchParams;
  const nextPath = safeNextPath(next) ?? undefined;
  const invitedEventId = nextPath
    ? new URL(nextPath, "http://passion2serve.local").searchParams.get("event")
    : null;
  const signupQuery = new URLSearchParams();
  if (invitedEventId) signupQuery.set("event", invitedEventId);
  if (email) signupQuery.set("email", email);
  const participantSignupHref = signupQuery.size ? `/signup?${signupQuery.toString()}` : "/signup";

  return (
    <main className="min-h-screen bg-muted/40 px-5 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex justify-center">
          <Brand />
        </div>
        <div className="mx-auto mt-8 max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Welcome back</h1>
          <p className="mt-3 text-muted-foreground">Choose the workspace associated with your account.</p>
          {error === "authentication" && (
            <p className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
              We could not complete your sign-in. Please try again.
            </p>
          )}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Card className="border-0">
            <CardHeader>
              <span className="mb-3 grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
                <CalendarCheck aria-hidden="true" className="size-6" />
              </span>
              <CardTitle className="text-2xl">Sign in as Coordinator</CardTitle>
              <CardDescription>Manage events, outreach, attendance, closure, and impact reporting.</CardDescription>
            </CardHeader>
            <CardContent>
              <LoginForm nextPath={nextPath} role="coordinator" />
            </CardContent>
          </Card>

          <Card className="border-0">
            <CardHeader>
              <span className="mb-3 grid size-12 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <UsersRound aria-hidden="true" className="size-6" />
              </span>
              <CardTitle className="text-2xl">Sign in as Participant</CardTitle>
              <CardDescription>Discover events, access your membership pass, and track your progress.</CardDescription>
            </CardHeader>
            <CardContent>
              <LoginForm defaultEmail={email} nextPath={nextPath} role="participant" />
              <p className="mt-4 text-center text-sm text-muted-foreground">
                New participant? <Link className="font-semibold text-primary" href={participantSignupHref}>Create an account</Link>
              </p>
            </CardContent>
          </Card>
        </div>

        <Link className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary" href="/">
          <ArrowLeft className="size-4" /> Back to role selection
        </Link>
      </div>
    </main>
  );
}
