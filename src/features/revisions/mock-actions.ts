/* eslint-disable @typescript-eslint/no-explicit-any */
import type { createRevisionRequest as real_createRevisionRequest, createRevision as real_createRevision, updateRevisionStatus as real_updateRevisionStatus, assignRevision as real_assignRevision, mergeRevision as real_mergeRevision, rollbackRevision as real_rollbackRevision } from "./real-actions";

export async function createRevisionRequest(...args: Parameters<typeof real_createRevisionRequest>): Promise<Awaited<ReturnType<typeof real_createRevisionRequest>>> {
  return { id: "mock-id", success: true } as any;
}

export async function createRevision(...args: Parameters<typeof real_createRevision>): Promise<Awaited<ReturnType<typeof real_createRevision>>> {
  return { id: "mock-id", success: true } as any;
}

export async function updateRevisionStatus(...args: Parameters<typeof real_updateRevisionStatus>): Promise<Awaited<ReturnType<typeof real_updateRevisionStatus>>> {
  return { id: "mock-id", success: true } as any;
}

export async function assignRevision(...args: Parameters<typeof real_assignRevision>): Promise<Awaited<ReturnType<typeof real_assignRevision>>> {
  return { id: "mock-id", data: [] } as any;
}

export async function mergeRevision(...args: Parameters<typeof real_mergeRevision>): Promise<Awaited<ReturnType<typeof real_mergeRevision>>> {
  return { id: "mock-id", data: [] } as any;
}

export async function rollbackRevision(...args: Parameters<typeof real_rollbackRevision>): Promise<Awaited<ReturnType<typeof real_rollbackRevision>>> {
  return { id: "mock-id", data: [] } as any;
}
