/* eslint-disable @typescript-eslint/no-explicit-any */
import type { createAgentAction as real_createAgentAction, startAgentRunAction as real_startAgentRunAction, pauseAgentRunAction as real_pauseAgentRunAction, resumeAgentRunAction as real_resumeAgentRunAction, cancelAgentRunAction as real_cancelAgentRunAction } from "./real-actions";

export async function createAgentAction(...args: Parameters<typeof real_createAgentAction>): Promise<Awaited<ReturnType<typeof real_createAgentAction>>> {
  return { id: "mock-id", success: true } as any;
}

export async function startAgentRunAction(...args: Parameters<typeof real_startAgentRunAction>): Promise<Awaited<ReturnType<typeof real_startAgentRunAction>>> {
  return { id: "mock-id", data: [] } as any;
}

export async function pauseAgentRunAction(...args: Parameters<typeof real_pauseAgentRunAction>): Promise<Awaited<ReturnType<typeof real_pauseAgentRunAction>>> {
  return { id: "mock-id", data: [] } as any;
}

export async function resumeAgentRunAction(...args: Parameters<typeof real_resumeAgentRunAction>): Promise<Awaited<ReturnType<typeof real_resumeAgentRunAction>>> {
  return { id: "mock-id", data: [] } as any;
}

export async function cancelAgentRunAction(...args: Parameters<typeof real_cancelAgentRunAction>): Promise<Awaited<ReturnType<typeof real_cancelAgentRunAction>>> {
  return { id: "mock-id", data: [] } as any;
}
