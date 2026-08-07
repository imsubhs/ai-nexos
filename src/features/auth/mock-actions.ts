/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { safeInternalPath } from "./redirect";
// One definition of the demo cookie and its flags. These functions used to set
// it with `path` alone: no httpOnly, so any script could read or forge it, and
// no secure, so it travelled in clear over plain http.
import { clearDemoSessionCookie, setDemoSessionCookie } from "./demo-session";
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
  setDemoSessionCookie(await cookies());
  redirect(safeInternalPath(formData.get("next") as string));
}

export async function signInWithMagicLink(
  ...args: Parameters<typeof real_signInWithMagicLink>
): Promise<Awaited<ReturnType<typeof real_signInWithMagicLink>>> {
  const [, formData] = args;
  setDemoSessionCookie(await cookies());
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
  setDemoSessionCookie(await cookies());
  redirect(safeInternalPath(formData.get("next") as string));
}

export async function signOut(
  ...args: Parameters<typeof real_signOut>
): Promise<Awaited<ReturnType<typeof real_signOut>>> {
  clearDemoSessionCookie(await cookies());
  redirect("/login");
}
