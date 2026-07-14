"use server";

import * as real from "./real-queries";
import * as mock from "./mock-queries";

export async function getMeetingsForProject(...args: Parameters<typeof real.getMeetingsForProject>): Promise<Awaited<ReturnType<typeof real.getMeetingsForProject>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).getMeetingsForProject(...args);
  return (real as any).getMeetingsForProject(...args);
}

export async function getMeetingById(...args: Parameters<typeof real.getMeetingById>): Promise<Awaited<ReturnType<typeof real.getMeetingById>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).getMeetingById(...args);
  return (real as any).getMeetingById(...args);
}

export async function getMeetingDecisions(...args: Parameters<typeof real.getMeetingDecisions>): Promise<Awaited<ReturnType<typeof real.getMeetingDecisions>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).getMeetingDecisions(...args);
  return (real as any).getMeetingDecisions(...args);
}

export async function getMeetingActionItems(...args: Parameters<typeof real.getMeetingActionItems>): Promise<Awaited<ReturnType<typeof real.getMeetingActionItems>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).getMeetingActionItems(...args);
  return (real as any).getMeetingActionItems(...args);
}

