"use server";

import * as real from "./real-actions";
import * as mock from "./mock-actions";
import { isDemoMode } from "@/lib/env.server";

export type * from "./types";

export async function getExecutiveIntelligence(
  ...args: Parameters<typeof real.getExecutiveIntelligence>
): Promise<Awaited<ReturnType<typeof real.getExecutiveIntelligence>>> {
  if (isDemoMode()) return (mock as any).getExecutiveIntelligence(...args);
  return (real as any).getExecutiveIntelligence(...args);
}

export async function getExecutiveRisks(
  ...args: Parameters<typeof real.getExecutiveRisks>
): Promise<Awaited<ReturnType<typeof real.getExecutiveRisks>>> {
  if (isDemoMode()) return (mock as any).getExecutiveRisks(...args);
  return (real as any).getExecutiveRisks(...args);
}

export async function getExecutiveAttentionQueue(
  ...args: Parameters<typeof real.getExecutiveAttentionQueue>
): Promise<Awaited<ReturnType<typeof real.getExecutiveAttentionQueue>>> {
  if (isDemoMode()) return (mock as any).getExecutiveAttentionQueue(...args);
  return (real as any).getExecutiveAttentionQueue(...args);
}

export async function getExecutivePulse(
  ...args: Parameters<typeof real.getExecutivePulse>
): Promise<Awaited<ReturnType<typeof real.getExecutivePulse>>> {
  if (isDemoMode()) return (mock as any).getExecutivePulse(...args);
  return (real as any).getExecutivePulse(...args);
}
