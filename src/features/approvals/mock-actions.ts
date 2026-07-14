/* eslint-disable @typescript-eslint/no-explicit-any */
import type { createApprovalCycle as real_createApprovalCycle, submitReview as real_submitReview, delegateReview as real_delegateReview, resolveCondition as real_resolveCondition } from "./real-actions";

export async function createApprovalCycle(...args: Parameters<typeof real_createApprovalCycle>): Promise<Awaited<ReturnType<typeof real_createApprovalCycle>>> {
  return { id: "mock-id", success: true } as any;
}

export async function submitReview(...args: Parameters<typeof real_submitReview>): Promise<Awaited<ReturnType<typeof real_submitReview>>> {
  return { id: "mock-id", data: [] } as any;
}

export async function delegateReview(...args: Parameters<typeof real_delegateReview>): Promise<Awaited<ReturnType<typeof real_delegateReview>>> {
  return { id: "mock-id", data: [] } as any;
}

export async function resolveCondition(...args: Parameters<typeof real_resolveCondition>): Promise<Awaited<ReturnType<typeof real_resolveCondition>>> {
  return { id: "mock-id", data: [] } as any;
}
