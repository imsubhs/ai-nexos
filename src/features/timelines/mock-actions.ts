/**
 * DEMO_MODE implementation backed by the in-memory demo store.
 * Mirrors real-actions.ts: getProjectTimeline returns a timeline object with
 * ordered phases and recent versions (or undefined when none exists), writes
 * persist for the session, and progress recalculation rolls up to the project.
 */
import { revalidatePath } from "next/cache";
import {
  DEMO_ORG_ID,
  DEMO_USER_ID,
  getDemoStore,
  logDemoActivity,
  nextDemoId,
} from "@/lib/demo/store";
import { DEFAULT_PROJECT_PHASES } from "./constants";
import type { createTimelineSnapshot as real_createTimelineSnapshot } from "./snapshot";
import type {
  createTimeline as real_createTimeline,
  getProjectTimeline as real_getProjectTimeline,
  getTimelineMilestones as real_getTimelineMilestones,
  getTimelineDependencies as real_getTimelineDependencies,
  createMilestone as real_createMilestone,
  addTimelineDependency as real_addTimelineDependency,
  getTimelines as real_getTimelines,
} from "./real-actions";

function requireTimeline(timelineId: string) {
  const timeline = getDemoStore().timelines.find(
    (t) => t.timelineId === timelineId,
  );
  if (!timeline) throw new Error("Not found");
  return timeline;
}

export async function createTimelineSnapshot(
  ...args: Parameters<typeof real_createTimelineSnapshot>
): Promise<Awaited<ReturnType<typeof real_createTimelineSnapshot>>> {
  const [timelineId] = args as unknown as [string];
  const store = getDemoStore();
  const timeline = requireTimeline(timelineId);

  const version = {
    versionId: nextDemoId(store),
    timelineId,
    organizationId: DEMO_ORG_ID,
    versionNumber:
      store.timelineVersions.filter((v) => v.timelineId === timelineId).length +
      1,
    snapshot: {
      milestones: store.milestones.filter((m) => m.timelineId === timelineId),
      dependencies: store.timelineDependencies.filter(
        (d) => d.timelineId === timelineId,
      ),
    },
    createdAt: new Date(),
    createdBy: DEMO_USER_ID,
  };
  store.timelineVersions.push(version);

  revalidatePath(`/projects/${timeline.projectId}/timeline`);
  return version as any;
}

export async function createTimeline(
  ...args: Parameters<typeof real_createTimeline>
): Promise<Awaited<ReturnType<typeof real_createTimeline>>> {
  const [data] = args;
  const store = getDemoStore();

  const now = new Date();
  const timeline = {
    timelineId: nextDemoId(store),
    organizationId: DEMO_ORG_ID,
    startDate: null,
    endDate: null,
    overallProgress: 0,
    ...data,
    createdAt: now,
    updatedAt: now,
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    deletedAt: null,
    deletedBy: null,
  };
  store.timelines.push(timeline);

  DEFAULT_PROJECT_PHASES.forEach((p) => {
    store.projectPhases.push({
      phaseId: nextDemoId(store),
      timelineId: timeline.timelineId,
      organizationId: DEMO_ORG_ID,
      name: p.name,
      orderIndex: p.orderIndex,
      startDate: null,
      endDate: null,
      status: "not_started",
      createdAt: now,
      updatedAt: now,
      createdBy: DEMO_USER_ID,
      updatedBy: DEMO_USER_ID,
      deletedAt: null,
      deletedBy: null,
    });
  });

  logDemoActivity(
    store,
    "timelines",
    "created",
    "timeline",
    timeline.timelineId,
    "Created project timeline",
  );

  revalidatePath(`/projects/${data.projectId}/timeline`);
  return timeline as any;
}

export async function getProjectTimeline(
  ...args: Parameters<typeof real_getProjectTimeline>
): Promise<Awaited<ReturnType<typeof real_getProjectTimeline>>> {
  const [projectId] = args;
  const store = getDemoStore();

  const timeline = store.timelines.find((t) => t.projectId === projectId);
  if (!timeline) return undefined as any;

  return {
    ...timeline,
    phases: store.projectPhases
      .filter((p) => p.timelineId === timeline.timelineId)
      .sort((a, b) => a.orderIndex - b.orderIndex),
    versions: store.timelineVersions
      .filter((v) => v.timelineId === timeline.timelineId)
      .sort((a, b) => b.versionNumber - a.versionNumber)
      .slice(0, 5),
  } as any;
}

export async function getTimelines(
  ...args: Parameters<typeof real_getTimelines>
): Promise<Awaited<ReturnType<typeof real_getTimelines>>> {
  const [cursorOffset = 0, limit = 50] = args;
  const store = getDemoStore();

  return store.timelines
    .slice()
    .sort((a: any, b: any) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(cursorOffset, cursorOffset + limit)
    .map((t: any) => ({
      ...t,
      phases: store.projectPhases
        .filter((p: any) => p.timelineId === t.timelineId)
        .sort((a: any, b: any) => a.orderIndex - b.orderIndex),
    })) as any;
}

export async function getTimelineMilestones(
  ...args: Parameters<typeof real_getTimelineMilestones>
): Promise<Awaited<ReturnType<typeof real_getTimelineMilestones>>> {
  const [timelineId, limit = 50, cursorOffset = 0] = args;
  const store = getDemoStore();
  requireTimeline(timelineId);

  return store.milestones
    .filter((m) => m.timelineId === timelineId)
    .sort((a, b) => {
      const aTime = a.startDate ? a.startDate.getTime() : 0;
      const bTime = b.startDate ? b.startDate.getTime() : 0;
      if (aTime !== bTime) return aTime - bTime;
      return a.milestoneId.localeCompare(b.milestoneId);
    })
    .slice(cursorOffset, cursorOffset + limit) as any;
}

export async function getTimelineDependencies(
  ...args: Parameters<typeof real_getTimelineDependencies>
): Promise<Awaited<ReturnType<typeof real_getTimelineDependencies>>> {
  const [timelineId] = args;
  const store = getDemoStore();
  requireTimeline(timelineId);

  return store.timelineDependencies.filter(
    (d) => d.timelineId === timelineId,
  ) as any;
}

export async function createMilestone(
  ...args: Parameters<typeof real_createMilestone>
): Promise<Awaited<ReturnType<typeof real_createMilestone>>> {
  const [data] = args;
  const store = getDemoStore();
  const timeline = requireTimeline(data.timelineId);

  const now = new Date();
  const milestone = {
    milestoneId: nextDemoId(store),
    organizationId: DEMO_ORG_ID,
    description: null,
    startDate: null,
    endDate: null,
    progress: 0,
    status: "not_started",
    ...data,
    createdAt: now,
    updatedAt: now,
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    deletedAt: null,
    deletedBy: null,
  };
  store.milestones.push(milestone);

  logDemoActivity(
    store,
    "timelines",
    "milestone_created",
    "milestone",
    milestone.milestoneId,
    `Created milestone ${milestone.name}`,
  );

  revalidatePath(`/projects/${timeline.projectId}/timeline`);
  return milestone as any;
}

export async function addTimelineDependency(
  ...args: Parameters<typeof real_addTimelineDependency>
): Promise<Awaited<ReturnType<typeof real_addTimelineDependency>>> {
  const [data] = args;
  const store = getDemoStore();
  const timeline = requireTimeline(data.timelineId);

  const duplicate = store.timelineDependencies.some(
    (d) =>
      d.timelineId === data.timelineId &&
      d.predecessorId === data.predecessorId &&
      d.successorId === data.successorId,
  );
  if (duplicate) throw new Error("Dependency already exists");

  const dependency = {
    dependencyId: nextDemoId(store),
    organizationId: DEMO_ORG_ID,
    ...data,
    createdAt: new Date(),
    createdBy: DEMO_USER_ID,
  };
  store.timelineDependencies.push(dependency);

  revalidatePath(`/projects/${timeline.projectId}/timeline`);
  return dependency as any;
}
