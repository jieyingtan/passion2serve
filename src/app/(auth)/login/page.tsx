import Link from "next/link";
import { ArrowLeft, CalendarCheck, UsersRound } from "lucide-react";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { safeNextPath } from "@/lib/auth/paths";

import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string; next?: string; role?: string }>;
}) {
  const { email, error, next, role } = await searchParams;
  const selectedRole = role === "coordinator" || role === "participant" ? role : null;
  const nextPath = safeNextPath(next) ?? undefined;
  const invitedEventId = nextPath
    ? new URL(nextPath, "http://passion2serve.local").searchParams.get("event")
    : null;
  const signupQuery = new URLSearchParams();
  if (invitedEventId) signupQuery.set("event", invitedEventId);
  if (email) signupQuery.set("email", email);
  const participantSignupHref = signupQuery.size ? `/signup?${signupQuery.toString()}` : "/signup";
  const roleHref = (targetRole: "coordinator" | "participant") => {
    const query = new URLSearchParams({ role: targetRole });
    if (email) query.set("email", email);
    if (nextPath) query.set("next", nextPath);
    return `/login?${query.toString()}`;
  };
  const chooserQuery = new URLSearchParams();
  if (email) chooserQuery.set("email", email);
  if (nextPath) chooserQuery.set("next", nextPath);
  const chooserHref = chooserQuery.size ? `/login?${chooserQuery.toString()}` : "/login";

  return (
    <main className="min-h-screen bg-muted/40 px-5 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex justify-center">
          <Brand />
        </div>
        <div className="mx-auto mt-8 max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{selectedRole ? `Sign in as ${selectedRole === "coordinator" ? "Coordinator" : "Participant"}` : "How would you like to sign in?"}</h1>
          <p className="mt-3 text-muted-foreground">{selectedRole ? "Enter the details for your Passion2Serve account." : "Choose your account type before entering your sign-in details."}</p>
          {error === "authentication" && (
            <p className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
              We could not complete your sign-in. Please try again.
            </p>
          )}
        </div>

        {!selectedRole ? <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Card className="border-0">
            <CardHeader>
              <span className="mb-3 grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
                <CalendarCheck aria-hidden="true" className="size-6" />
              </span>
              <CardTitle className="text-2xl">Sign in as Coordinator</CardTitle>
              <CardDescription>Manage events, outreach, attendance, closure, and impact reporting.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" size="lg"><Link href={roleHref("coordinator")}>Continue as Coordinator</Link></Button>
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
              <Button asChild className="w-full" size="lg"><Link href={roleHref("participant")}>Continue as Participant</Link></Button>
            </CardContent>
          </Card>
        </div> : <Card className="mx-auto mt-10 max-w-lg border-0">
          <CardHeader>
            <span className={`mb-3 grid size-12 place-items-center rounded-xl ${selectedRole === "coordinator" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
              {selectedRole === "coordinator" ? <CalendarCheck aria-hidden="true" className="size-6" /> : <UsersRound aria-hidden="true" className="size-6" />}
            </span>
            <CardTitle className="text-2xl">{selectedRole === "coordinator" ? "Coordinator workspace" : "Participant account"}</CardTitle>
            <CardDescription>{selectedRole === "coordinator" ? "Manage events, outreach, attendance, closure, and impact reporting." : "Discover events, access your membership pass, and track your progress."}</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm defaultEmail={selectedRole === "participant" ? email : undefined} nextPath={nextPath} role={selectedRole} />
            {selectedRole === "participant" && <p className="mt-4 text-center text-sm text-muted-foreground">New participant? <Link className="font-semibold text-primary" href={participantSignupHref}>Create an account</Link></p>}
          </CardContent>
        </Card>}

        <Link className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary" href={selectedRole ? chooserHref : "/"}>
          <ArrowLeft className="size-4" /> {selectedRole ? "Choose a different account type" : "Back to home"}
        </Link>
      </div>
    </main>
  );
}
