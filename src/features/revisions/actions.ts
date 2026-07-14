"use server";

import * as real from "./real-actions";
import * as mock from "./mock-actions";

export async function createRevisionRequest(...args: Parameters<typeof real.createRevisionRequest>): Promise<Awaited<ReturnType<typeof real.createRevisionRequest>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).createRevisionRequest(...args);
  return (real as any).createRevisionRequest(...args);
}

export async function createRevision(...args: Parameters<typeof real.createRevision>): Promise<Awaited<ReturnType<typeof real.createRevision>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).createRevision(...args);
  return (real as any).createRevision(...args);
}

export async function updateRevisionStatus(...args: Parameters<typeof real.updateRevisionStatus>): Promise<Awaited<ReturnType<typeof real.updateRevisionStatus>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).updateRevisionStatus(...args);
  return (real as any).updateRevisionStatus(...args);
}

export async function assignRevision(...args: Parameters<typeof real.assignRevision>): Promise<Awaited<ReturnType<typeof real.assignRevision>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).assignRevision(...args);
  return (real as any).assignRevision(...args);
}

export async function mergeRevision(...args: Parameters<typeof real.mergeRevision>): Promise<Awaited<ReturnType<typeof real.mergeRevision>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).mergeRevision(...args);
  return (real as any).mergeRevision(...args);
}

export async function rollbackRevision(...args: Parameters<typeof real.rollbackRevision>): Promise<Awaited<ReturnType<typeof real.rollbackRevision>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).rollbackRevision(...args);
  return (real as any).rollbackRevision(...args);
}

