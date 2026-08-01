"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import type { AppRole } from "@/lib/auth/paths";

import { signIn, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm({ nextPath, role }: { nextPath?: string; role: AppRole }) {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const roleLabel = role === "coordinator" ? "Coordinator" : "Participant";

  return (
    <form action={formAction} className="space-y-4">
      <input name="next" type="hidden" value={nextPath ?? ""} />
      <input name="role" type="hidden" value={role} />
      <label className="block text-sm font-semibold">
        Email address
        <input
          autoComplete="email"
          className="mt-2 h-11 w-full rounded-md border bg-background px-3 font-normal outline-none ring-offset-background focus:ring-2 focus:ring-ring"
          name="email"
          placeholder="you@example.org"
          required
          type="email"
        />
      </label>
      <label className="block text-sm font-semibold">
        Password
        <input
          autoComplete="current-password"
          className="mt-2 h-11 w-full rounded-md border bg-background px-3 font-normal outline-none ring-offset-background focus:ring-2 focus:ring-ring"
          minLength={8}
          name="password"
          placeholder="Enter your password"
          required
          type="password"
        />
      </label>
      {state.error && (
        <p aria-live="polite" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <Button className="w-full" disabled={pending} type="submit">
        {pending ? "Signing in…" : `Sign in as ${roleLabel}`}
      </Button>
    </form>
  );
}
