"use server";

import * as real from "./real-actions";
import * as mock from "./mock-actions";
import { isDemoMode } from "@/lib/env.server";

export async function createTimelineSnapshot(
  ...args: Parameters<typeof real.createTimelineSnapshot>
): Promise<Awaited<ReturnType<typeof real.createTimelineSnapshot>>> {
  if (isDemoMode()) return (mock as any).createTimelineSnapshot(...args);
  return (real as any).createTimelineSnapshot(...args);
}

export async function createTimeline(
  ...args: Parameters<typeof real.createTimeline>
): Promise<Awaited<ReturnType<typeof real.createTimeline>>> {
  if (isDemoMode()) return (mock as any).createTimeline(...args);
  return (real as any).createTimeline(...args);
}

export async function getProjectTimeline(
  ...args: Parameters<typeof real.getProjectTimeline>
): Promise<Awaited<ReturnType<typeof real.getProjectTimeline>>> {
  if (isDemoMode()) return (mock as any).getProjectTimeline(...args);
  return (real as any).getProjectTimeline(...args);
}

export async function getTimelines(
  ...args: Parameters<typeof real.getTimelines>
): Promise<Awaited<ReturnType<typeof real.getTimelines>>> {
  if (isDemoMode()) return (mock as any).getTimelines(...args);
  return (real as any).getTimelines(...args);
}

export async function getTimelineMilestones(
  ...args: Parameters<typeof real.getTimelineMilestones>
): Promise<Awaited<ReturnType<typeof real.getTimelineMilestones>>> {
  if (isDemoMode()) return (mock as any).getTimelineMilestones(...args);
  return (real as any).getTimelineMilestones(...args);
}

export async function getTimelineDependencies(
  ...args: Parameters<typeof real.getTimelineDependencies>
): Promise<Awaited<ReturnType<typeof real.getTimelineDependencies>>> {
  if (isDemoMode()) return (mock as any).getTimelineDependencies(...args);
  return (real as any).getTimelineDependencies(...args);
}

export async function createMilestone(
  ...args: Parameters<typeof real.createMilestone>
): Promise<Awaited<ReturnType<typeof real.createMilestone>>> {
  if (isDemoMode()) return (mock as any).createMilestone(...args);
  return (real as any).createMilestone(...args);
}

export async function addTimelineDependency(
  ...args: Parameters<typeof real.addTimelineDependency>
): Promise<Awaited<ReturnType<typeof real.addTimelineDependency>>> {
  if (isDemoMode()) return (mock as any).addTimelineDependency(...args);
  return (real as any).addTimelineDependency(...args);
}
