"use server";

import * as real from "./real-actions";
import * as mock from "./mock-actions";

export async function createAgentAction(...args: Parameters<typeof real.createAgentAction>): Promise<Awaited<ReturnType<typeof real.createAgentAction>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).createAgentAction(...args);
  return (real as any).createAgentAction(...args);
}

export async function startAgentRunAction(...args: Parameters<typeof real.startAgentRunAction>): Promise<Awaited<ReturnType<typeof real.startAgentRunAction>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).startAgentRunAction(...args);
  return (real as any).startAgentRunAction(...args);
}

export async function pauseAgentRunAction(...args: Parameters<typeof real.pauseAgentRunAction>): Promise<Awaited<ReturnType<typeof real.pauseAgentRunAction>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).pauseAgentRunAction(...args);
  return (real as any).pauseAgentRunAction(...args);
}

export async function resumeAgentRunAction(...args: Parameters<typeof real.resumeAgentRunAction>): Promise<Awaited<ReturnType<typeof real.resumeAgentRunAction>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).resumeAgentRunAction(...args);
  return (real as any).resumeAgentRunAction(...args);
}

export async function cancelAgentRunAction(...args: Parameters<typeof real.cancelAgentRunAction>): Promise<Awaited<ReturnType<typeof real.cancelAgentRunAction>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).cancelAgentRunAction(...args);
  return (real as any).cancelAgentRunAction(...args);
}

