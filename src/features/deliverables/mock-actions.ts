/* eslint-disable @typescript-eslint/no-explicit-any */
import type { createDeliverable as real_createDeliverable, startReviewSession as real_startReviewSession, approveRevision as real_approveRevision, requestRevision as real_requestRevision, generateShareLink as real_generateShareLink } from "./real-actions";

export async function createDeliverable(...args: Parameters<typeof real_createDeliverable>): Promise<Awaited<ReturnType<typeof real_createDeliverable>>> {
  return { id: "mock-id", success: true } as any;
}

export async function startReviewSession(...args: Parameters<typeof real_startReviewSession>): Promise<Awaited<ReturnType<typeof real_startReviewSession>>> {
  return { id: "mock-id", data: [] } as any;
}

export async function approveRevision(...args: Parameters<typeof real_approveRevision>): Promise<Awaited<ReturnType<typeof real_approveRevision>>> {
  return { id: "mock-id", data: [] } as any;
}

export async function requestRevision(...args: Parameters<typeof real_requestRevision>): Promise<Awaited<ReturnType<typeof real_requestRevision>>> {
  return { id: "mock-id", data: [] } as any;
}

export async function generateShareLink(...args: Parameters<typeof real_generateShareLink>): Promise<Awaited<ReturnType<typeof real_generateShareLink>>> {
  return { id: "mock-id", data: [] } as any;
}
