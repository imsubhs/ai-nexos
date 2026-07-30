"use server";

import * as real from "./real-actions";
import * as mock from "./mock-actions";

export async function getMyProfile(
  ...args: Parameters<typeof real.getMyProfile>
): Promise<Awaited<ReturnType<typeof real.getMyProfile>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).getMyProfile(...args);
  return (real as any).getMyProfile(...args);
}

export async function updateMyProfile(
  ...args: Parameters<typeof real.updateMyProfile>
): Promise<Awaited<ReturnType<typeof real.updateMyProfile>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).updateMyProfile(...args);
  return (real as any).updateMyProfile(...args);
}
