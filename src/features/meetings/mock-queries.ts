/* eslint-disable @typescript-eslint/no-explicit-any */
import type { getMeetingsForProject as real_getMeetingsForProject, getMeetingById as real_getMeetingById, getMeetingDecisions as real_getMeetingDecisions, getMeetingActionItems as real_getMeetingActionItems } from "./real-queries";

export async function getMeetingsForProject(...args: Parameters<typeof real_getMeetingsForProject>): Promise<Awaited<ReturnType<typeof real_getMeetingsForProject>>> {
  return [] as any;
}

export async function getMeetingById(...args: Parameters<typeof real_getMeetingById>): Promise<Awaited<ReturnType<typeof real_getMeetingById>>> {
  return { id: "mock-id", status: "active", priority: "high", createdAt: new Date() } as any;
}

export async function getMeetingDecisions(...args: Parameters<typeof real_getMeetingDecisions>): Promise<Awaited<ReturnType<typeof real_getMeetingDecisions>>> {
  return [] as any;
}

export async function getMeetingActionItems(...args: Parameters<typeof real_getMeetingActionItems>): Promise<Awaited<ReturnType<typeof real_getMeetingActionItems>>> {
  return [] as any;
}
