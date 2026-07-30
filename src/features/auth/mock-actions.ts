/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { safeInternalPath } from "./redirect";
import type {
  signInWithPassword as real_signInWithPassword,
  signInWithMagicLink as real_signInWithMagicLink,
  signInWithGoogle as real_signInWithGoogle,
  signOut as real_signOut,
  AuthActionState,
} from "./real-actions";

export async function signInWithPassword(
  ...args: Parameters<typeof real_signInWithPassword>
): Promise<Awaited<ReturnType<typeof real_signInWithPassword>>> {
  const [, formData] = args;
  (await cookies()).set("demo_session", "true", { path: "/" });
  redirect(safeInternalPath(formData.get("next") as string));
}

export async function signInWithMagicLink(
  ...args: Parameters<typeof real_signInWithMagicLink>
): Promise<Awaited<ReturnType<typeof real_signInWithMagicLink>>> {
  const [, formData] = args;
  (await cookies()).set("demo_session", "true", { path: "/" });
  // The production version usually redirects if we click the magic link, but sending magic link returns success state
  // We can return success as per production action behavior:
  return {
    success:
      "If this email belongs to a team member, a sign-in link is on its way.",
  };
}

export async function signInWithGoogle(
  ...args: Parameters<typeof real_signInWithGoogle>
): Promise<Awaited<ReturnType<typeof real_signInWithGoogle>>> {
  const [formData] = args;
  (await cookies()).set("demo_session", "true", { path: "/" });
  redirect(safeInternalPath(formData.get("next") as string));
}

export async function signOut(
  ...args: Parameters<typeof real_signOut>
): Promise<Awaited<ReturnType<typeof real_signOut>>> {
  (await cookies()).delete("demo_session");
  redirect("/login");
}
