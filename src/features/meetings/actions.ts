"use server";

import * as real from "./real-actions";
import * as mock from "./mock-actions";

export async function createMeeting(...args: Parameters<typeof real.createMeeting>): Promise<Awaited<ReturnType<typeof real.createMeeting>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).createMeeting(...args);
  return (real as any).createMeeting(...args);
}

export async function createDecision(...args: Parameters<typeof real.createDecision>): Promise<Awaited<ReturnType<typeof real.createDecision>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).createDecision(...args);
  return (real as any).createDecision(...args);
}

export async function createActionItem(...args: Parameters<typeof real.createActionItem>): Promise<Awaited<ReturnType<typeof real.createActionItem>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).createActionItem(...args);
  return (real as any).createActionItem(...args);
}

export async function promoteActionItemToTask(...args: Parameters<typeof real.promoteActionItemToTask>): Promise<Awaited<ReturnType<typeof real.promoteActionItemToTask>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).promoteActionItemToTask(...args);
  return (real as any).promoteActionItemToTask(...args);
}

