"use server";

import * as real from "./real-actions";
import * as mock from "./mock-actions";

export async function createApprovalCycle(...args: Parameters<typeof real.createApprovalCycle>): Promise<Awaited<ReturnType<typeof real.createApprovalCycle>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).createApprovalCycle(...args);
  return (real as any).createApprovalCycle(...args);
}

export async function submitReview(...args: Parameters<typeof real.submitReview>): Promise<Awaited<ReturnType<typeof real.submitReview>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).submitReview(...args);
  return (real as any).submitReview(...args);
}

export async function delegateReview(...args: Parameters<typeof real.delegateReview>): Promise<Awaited<ReturnType<typeof real.delegateReview>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).delegateReview(...args);
  return (real as any).delegateReview(...args);
}

export async function resolveCondition(...args: Parameters<typeof real.resolveCondition>): Promise<Awaited<ReturnType<typeof real.resolveCondition>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).resolveCondition(...args);
  return (real as any).resolveCondition(...args);
}

