"use server";

import * as real from "./real-actions";
import * as mock from "./mock-actions";

export type { AuthActionState } from "./real-actions";

export async function signInWithPassword(
  ...args: Parameters<typeof real.signInWithPassword>
): Promise<Awaited<ReturnType<typeof real.signInWithPassword>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).signInWithPassword(...args);
  return (real as any).signInWithPassword(...args);
}

export async function signInWithMagicLink(
  ...args: Parameters<typeof real.signInWithMagicLink>
): Promise<Awaited<ReturnType<typeof real.signInWithMagicLink>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).signInWithMagicLink(...args);
  return (real as any).signInWithMagicLink(...args);
}

export async function signInWithGoogle(
  ...args: Parameters<typeof real.signInWithGoogle>
): Promise<Awaited<ReturnType<typeof real.signInWithGoogle>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).signInWithGoogle(...args);
  return (real as any).signInWithGoogle(...args);
}

export async function signOut(
  ...args: Parameters<typeof real.signOut>
): Promise<Awaited<ReturnType<typeof real.signOut>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).signOut(...args);
  return (real as any).signOut(...args);
}
