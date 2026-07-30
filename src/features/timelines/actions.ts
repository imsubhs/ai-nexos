"use server";

import * as real from "./real-actions";
import * as mock from "./mock-actions";

export async function createTimelineSnapshot(
  ...args: Parameters<typeof real.createTimelineSnapshot>
): Promise<Awaited<ReturnType<typeof real.createTimelineSnapshot>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).createTimelineSnapshot(...args);
  return (real as any).createTimelineSnapshot(...args);
}

export async function createTimeline(
  ...args: Parameters<typeof real.createTimeline>
): Promise<Awaited<ReturnType<typeof real.createTimeline>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).createTimeline(...args);
  return (real as any).createTimeline(...args);
}

export async function getProjectTimeline(
  ...args: Parameters<typeof real.getProjectTimeline>
): Promise<Awaited<ReturnType<typeof real.getProjectTimeline>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).getProjectTimeline(...args);
  return (real as any).getProjectTimeline(...args);
}

export async function getTimelines(
  ...args: Parameters<typeof real.getTimelines>
): Promise<Awaited<ReturnType<typeof real.getTimelines>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).getTimelines(...args);
  return (real as any).getTimelines(...args);
}

export async function getTimelineMilestones(
  ...args: Parameters<typeof real.getTimelineMilestones>
): Promise<Awaited<ReturnType<typeof real.getTimelineMilestones>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).getTimelineMilestones(...args);
  return (real as any).getTimelineMilestones(...args);
}

export async function getTimelineDependencies(
  ...args: Parameters<typeof real.getTimelineDependencies>
): Promise<Awaited<ReturnType<typeof real.getTimelineDependencies>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).getTimelineDependencies(...args);
  return (real as any).getTimelineDependencies(...args);
}

export async function createMilestone(
  ...args: Parameters<typeof real.createMilestone>
): Promise<Awaited<ReturnType<typeof real.createMilestone>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).createMilestone(...args);
  return (real as any).createMilestone(...args);
}

export async function addTimelineDependency(
  ...args: Parameters<typeof real.addTimelineDependency>
): Promise<Awaited<ReturnType<typeof real.addTimelineDependency>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).addTimelineDependency(...args);
  return (real as any).addTimelineDependency(...args);
}

export async function recalculateTimelineProgress(
  ...args: Parameters<typeof real.recalculateTimelineProgress>
): Promise<Awaited<ReturnType<typeof real.recalculateTimelineProgress>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).recalculateTimelineProgress(...args);
  return (real as any).recalculateTimelineProgress(...args);
}
