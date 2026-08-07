"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APP_URL } from "@/config/app";
import { createClient } from "@/lib/supabase/server";
import { consumeRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/request";
import { logSecurityEvent } from "@/lib/security/logger";
import { safeInternalPath } from "./redirect";
import { loginSchema, magicLinkSchema } from "./schemas";

export type AuthActionState = {
  error?: string;
  success?: string;
};

/**
 * Shown whenever a limit is hit, for any reason.
 *
 * Deliberately identical regardless of which budget ran out. Saying "too many
 * attempts for this account" confirms the account exists, which is the same
 * disclosure the generic sign-in error below exists to prevent.
 */
const THROTTLED = "Too many attempts. Please wait a few minutes and try again.";

/**
 * Address of the caller, for per-IP budgets.
 *
 * Server Actions are POSTs like any other, so the same X-Forwarded-For
 * reasoning applies — see `getClientIp`.
 */
async function callerIp(): Promise<string> {
  return getClientIp(await headers());
}

/**
 * Normalises an email for use as a rate-limit key.
 *
 * Without this, `Victim@example.com` and `victim@example.com` are two budgets
 * against one account, and the per-account limit is only as strong as the
 * number of casings an attacker bothers to try.
 */
function accountKey(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Internal users only (PRD §9): authentication never creates accounts.
 * Users are provisioned by an admin; unknown emails simply fail to sign in.
 *
 * Two budgets are spent per attempt, and both matter. The per-IP limit stops
 * one host working through a password list. The per-account limit is the one
 * that survives a distributed attack: without it, a botnet gets a fresh budget
 * per source address and the target account sees unlimited attempts.
 *
 * The trade-off is that an attacker can spend a victim's per-account budget
 * deliberately and lock them out for the window. That is preferred to leaving
 * the account guessable, and the window is short by design — see
 * docs/THREAT-MODEL.md.
 */
export async function signInWithPassword(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const ip = await callerIp();
  const account = accountKey(parsed.data.email);

  const byIp = await consumeRateLimit(RATE_LIMITS.loginByIp, ip);
  if (!byIp.allowed) {
    logSecurityEvent("login.throttled", "throttled", { scope: "ip", ip });
    return { error: THROTTLED };
  }

  const byAccount = await consumeRateLimit(RATE_LIMITS.loginByAccount, account);
  if (!byAccount.allowed) {
    logSecurityEvent("login.throttled", "throttled", { scope: "account", ip });
    return { error: THROTTLED };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    logSecurityEvent("login.failed", "denied", { ip });
    // Do not leak whether the account exists.
    return { error: "Invalid email or password." };
  }

  logSecurityEvent("login.succeeded", "allowed", { ip });
  redirect(safeInternalPath(formData.get("next")));
}

export async function signInWithMagicLink(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = magicLinkSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const ip = await callerIp();
  const account = accountKey(parsed.data.email);

  // This endpoint sends mail on request. Unthrottled it is both a login oracle
  // and a way to have this platform deliver someone else's inbox spam, which
  // costs the sending domain its reputation.
  const byIp = await consumeRateLimit(RATE_LIMITS.magicLinkByIp, ip);
  const byAccount = await consumeRateLimit(
    RATE_LIMITS.magicLinkByAccount,
    account,
  );

  if (!byIp.allowed || !byAccount.allowed) {
    logSecurityEvent("magiclink.throttled", "throttled", {
      scope: byIp.allowed ? "account" : "ip",
      ip,
    });
    // The same non-committal success text as below: a distinct throttle message
    // would confirm that this address has been requested recently, and so that
    // it exists.
    return {
      success:
        "If this email belongs to a team member, a sign-in link is on its way.",
    };
  }

  const next = safeInternalPath(formData.get("next"));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      // Never auto-provision accounts — internal team only.
      shouldCreateUser: false,
      emailRedirectTo: `${APP_URL}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return { error: "Could not send the magic link. Try again shortly." };
  }
  return {
    success:
      "If this email belongs to a team member, a sign-in link is on its way.",
  };
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const next = safeInternalPath(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${APP_URL}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error || !data.url) {
    redirect("/login?error=oauth");
  }
  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
