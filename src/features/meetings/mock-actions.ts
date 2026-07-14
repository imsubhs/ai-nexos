/* eslint-disable @typescript-eslint/no-explicit-any */
import type { createMeeting as real_createMeeting, createDecision as real_createDecision, createActionItem as real_createActionItem, promoteActionItemToTask as real_promoteActionItemToTask } from "./real-actions";

export async function createMeeting(...args: Parameters<typeof real_createMeeting>): Promise<Awaited<ReturnType<typeof real_createMeeting>>> {
  return { id: "mock-id", success: true } as any;
}

export async function createDecision(...args: Parameters<typeof real_createDecision>): Promise<Awaited<ReturnType<typeof real_createDecision>>> {
  return { id: "mock-id", success: true } as any;
}

export async function createActionItem(...args: Parameters<typeof real_createActionItem>): Promise<Awaited<ReturnType<typeof real_createActionItem>>> {
  return { id: "mock-id", success: true } as any;
}

export async function promoteActionItemToTask(...args: Parameters<typeof real_promoteActionItemToTask>): Promise<Awaited<ReturnType<typeof real_promoteActionItemToTask>>> {
  return { id: "mock-id", data: [] } as any;
}
