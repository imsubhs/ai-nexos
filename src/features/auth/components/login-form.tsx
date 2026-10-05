"use client";

import * as React from "react";
import { useActionState } from "react";
import { Loader2, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  signInWithGoogle,
  signInWithMagicLink,
  signInWithPassword,
  type AuthActionState,
} from "../actions";

const initialState: AuthActionState = {};

export function LoginForm({ next }: Readonly<{ next?: string }>) {
  const [mode, setMode] = React.useState<"password" | "magic-link">("password");
  const [passwordState, passwordAction, passwordPending] = useActionState(
    signInWithPassword,
    initialState,
  );
  const [magicState, magicAction, magicPending] = useActionState(
    signInWithMagicLink,
    initialState,
  );

  const state = mode === "password" ? passwordState : magicState;
  const pending = mode === "password" ? passwordPending : magicPending;

  return (
    <div className="flex flex-col gap-6">
      <form action={signInWithGoogle}>
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <Button type="submit" variant="outline" className="w-full">
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
            <path
              fill="currentColor"
              d="M21.35 11.1H12v2.9h5.35c-.5 2.5-2.6 3.9-5.35 3.9a6 6 0 1 1 0-12c1.5 0 2.9.55 3.95 1.45l2.2-2.2A9 9 0 1 0 12 21c5.2 0 8.65-3.65 8.65-8.8 0-.37-.04-.74-.1-1.1Z"
            />
          </svg>
          Continue with Google
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs">or</span>
        <Separator className="flex-1" />
      </div>

      {mode === "password" ? (
        <form action={passwordAction} className="flex flex-col gap-4">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@youragency.com"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Sign in
          </Button>
        </form>
      ) : (
        <form action={magicAction} className="flex flex-col gap-4">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="magic-email">Work email</Label>
            <Input
              id="magic-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@youragency.com"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Email me a magic link
          </Button>
        </form>
      )}

      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p
          role="status"
          className="text-sm text-emerald-600 dark:text-emerald-400"
        >
          {state.success}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => setMode(mode === "password" ? "magic-link" : "password")}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring mx-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors outline-none focus-visible:ring-2"
      >
        <Mail className="size-3.5" />
        {mode === "password"
          ? "Sign in with a magic link instead"
          : "Sign in with a password instead"}
      </button>
    </div>
  );
}
