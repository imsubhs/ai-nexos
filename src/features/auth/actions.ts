"use server";

import { redirect } from "next/navigation";
import { APP_URL } from "@/config/app";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, magicLinkSchema } from "./schemas";

export type AuthActionState = {
  error?: string;
  success?: string;
};

/** Only same-site relative paths may be used as post-login destinations. */
function safeInternalPath(path: FormDataEntryValue | null): string {
  if (typeof path !== "string") return "/dashboard";
  if (!path.startsWith("/") || path.startsWith("//")) return "/dashboard";
  if (path.startsWith("/portal") || path.startsWith("/auth")) {
    return "/dashboard";
  }
  return path;
}

/**
 * Internal users only (PRD §9): authentication never creates accounts.
 * Users are provisioned by an admin; unknown emails simply fail to sign in.
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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Do not leak whether the account exists.
    return { error: "Invalid email or password." };
  }

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
