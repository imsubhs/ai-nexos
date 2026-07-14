/* eslint-disable @typescript-eslint/no-explicit-any */
import type { signInWithPassword as real_signInWithPassword, signInWithMagicLink as real_signInWithMagicLink, signInWithGoogle as real_signInWithGoogle, signOut as real_signOut } from "./real-actions";

export async function signInWithPassword(...args: Parameters<typeof real_signInWithPassword>): Promise<Awaited<ReturnType<typeof real_signInWithPassword>>> {
  return { id: "mock-id", data: [] } as any;
}

export async function signInWithMagicLink(...args: Parameters<typeof real_signInWithMagicLink>): Promise<Awaited<ReturnType<typeof real_signInWithMagicLink>>> {
  return { id: "mock-id", data: [] } as any;
}

export async function signInWithGoogle(...args: Parameters<typeof real_signInWithGoogle>): Promise<Awaited<ReturnType<typeof real_signInWithGoogle>>> {
  return { id: "mock-id", data: [] } as any;
}

export async function signOut(...args: Parameters<typeof real_signOut>): Promise<Awaited<ReturnType<typeof real_signOut>>> {
  return { id: "mock-id", data: [] } as any;
}
