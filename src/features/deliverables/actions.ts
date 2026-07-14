"use server";

import * as real from "./real-actions";
import * as mock from "./mock-actions";

export async function createDeliverable(...args: Parameters<typeof real.createDeliverable>): Promise<Awaited<ReturnType<typeof real.createDeliverable>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).createDeliverable(...args);
  return (real as any).createDeliverable(...args);
}

export async function startReviewSession(...args: Parameters<typeof real.startReviewSession>): Promise<Awaited<ReturnType<typeof real.startReviewSession>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).startReviewSession(...args);
  return (real as any).startReviewSession(...args);
}

export async function approveRevision(...args: Parameters<typeof real.approveRevision>): Promise<Awaited<ReturnType<typeof real.approveRevision>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).approveRevision(...args);
  return (real as any).approveRevision(...args);
}

export async function requestRevision(...args: Parameters<typeof real.requestRevision>): Promise<Awaited<ReturnType<typeof real.requestRevision>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).requestRevision(...args);
  return (real as any).requestRevision(...args);
}

export async function generateShareLink(...args: Parameters<typeof real.generateShareLink>): Promise<Awaited<ReturnType<typeof real.generateShareLink>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).generateShareLink(...args);
  return (real as any).generateShareLink(...args);
}

