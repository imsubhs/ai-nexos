"use server";

import { db } from "@/db";
import { activityLogs, milestones, projectPhases, projects, timelineDependencies, timelineVersions, timelines } from "@/db/schema";
import { requireCurrentUser } from "@/features/auth/current-user";
import { requirePermission } from "@/features/permissions";
import { and, eq, asc, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  insertMilestoneSchema,
  insertTimelineDependencySchema,
  insertTimelineSchema
} from "./schemas";
import { DEFAULT_PROJECT_PHASES } from "./constants";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Shared activity logger for timelines.
 */
async function logActivity(
  action: string,
  entityId: string,
  userId: string,
  organizationId: string,
  metadata?: Record<string, unknown>,
  tx: typeof db | DbTransaction = db
) {
  await tx.insert(activityLogs).values({
    organizationId,
    module: "timelines",
    entityType: "timeline",
    entityId,
    action,
    description: `Timeline ${action}`,
    userId,
    metadata,
  });
}

/**
 * Create a timeline snapshot version. Called on structural changes.
 */
export async function createTimelineSnapshot(
  timelineId: string,
  changeSummary: string,
  reason: string | null = null,
  tx: DbTransaction
) {
  const user = await requireCurrentUser();

  const [currentTimeline] = await tx.select().from(timelines).where(eq(timelines.timelineId, timelineId));
  if (!currentTimeline) throw new Error("Timeline not found for versioning");

  const timelineData = await tx.query.timelines.findFirst({
    where: eq(timelines.timelineId, timelineId),
    with: {
      phases: {
        with: {
          milestones: {
            with: {
              successors: true,
            }
          }
        }
      }
    }
  });

  const nextVersion = currentTimeline.currentVersion + 1;

  await tx.insert(timelineVersions).values({
    timelineId,
    organizationId: user.organizationId,
    versionNumber: nextVersion,
    userId: user.userId,
    changeSummary,
    reason,
    snapshotData: timelineData,
  });

  await tx
    .update(timelines)
    .set({ currentVersion: nextVersion, updatedAt: new Date(), updatedBy: user.userId })
    .where(eq(timelines.timelineId, timelineId));
}

/**
 * Ensure the project belongs to the org, and the user can edit it.
 */
async function authorizeTimelineEdit(projectId: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "projects", "update");

  const [project] = await db.select().from(projects).where(and(eq(projects.projectId, projectId), eq(projects.organizationId, user.organizationId)));
  if (!project) throw new Error("Project not found or unauthorized");
  return { user, project };
}

/**
 * Creates a timeline. Exactly 1:1 per project.
 */
export async function createTimeline(data: z.infer<typeof insertTimelineSchema>) {
  const { user } = await authorizeTimelineEdit(data.projectId);

  const timeline = await db.transaction(async (tx) => {
    const [newTimeline] = await tx
      .insert(timelines)
      .values({
        ...data,
        organizationId: user.organizationId,
        createdBy: user.userId,
        updatedBy: user.userId,
      })
      .returning();

    // Setup Default Phases
    const defaultPhases = DEFAULT_PROJECT_PHASES.map((p) => ({
      timelineId: newTimeline.timelineId,
      organizationId: user.organizationId,
      name: p.name as "planning" | "pre_production" | "production" | "post_production" | "delivery",
      orderIndex: p.orderIndex,
    }));

    await tx.insert(projectPhases).values(defaultPhases.map(p => ({
      ...p,
      createdBy: user.userId,
      updatedBy: user.userId,
    })));

    await logActivity("created", newTimeline.timelineId, user.userId, user.organizationId, {}, tx);
    return newTimeline;
  });

  revalidatePath(`/projects/${data.projectId}/timeline`);
  return timeline;
}

export async function getProjectTimeline(projectId: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "projects", "read");

  return db.query.timelines.findFirst({
    where: and(eq(timelines.projectId, projectId), eq(timelines.organizationId, user.organizationId)),
    with: {
      phases: {
        orderBy: [asc(projectPhases.orderIndex)],
      },
      versions: {
        orderBy: [desc(timelineVersions.versionNumber)],
        limit: 5,
      }
    },
  });
}

export async function getTimelineMilestones(timelineId: string, limit: number = 50, cursorOffset: number = 0) {
  const user = await requireCurrentUser();
  // Ensure access
  const timeline = await db.query.timelines.findFirst({
    where: and(eq(timelines.timelineId, timelineId), eq(timelines.organizationId, user.organizationId)),
  });
  if (!timeline) throw new Error("Not found");

  const results = await db.query.milestones.findMany({
    where: eq(milestones.timelineId, timelineId),
    orderBy: [asc(milestones.startDate), asc(milestones.milestoneId)],
    limit: limit,
    offset: cursorOffset,
  });

  return results;
}

export async function getTimelineDependencies(timelineId: string) {
  const user = await requireCurrentUser();
  const timeline = await db.query.timelines.findFirst({
    where: and(eq(timelines.timelineId, timelineId), eq(timelines.organizationId, user.organizationId)),
  });
  if (!timeline) throw new Error("Not found");

  return db.query.timelineDependencies.findMany({
    where: eq(timelineDependencies.timelineId, timelineId),
  });
}

function checkTimelineCycle(edges: { predecessorId: string, successorId: string }[]): boolean {
  const adj: Record<string, string[]> = {};
  for (const { predecessorId, successorId } of edges) {
    if (!adj[predecessorId]) adj[predecessorId] = [];
    adj[predecessorId].push(successorId);
  }

  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(node: string): boolean {
    if (recStack.has(node)) return true;
    if (visited.has(node)) return false;

    visited.add(node);
    recStack.add(node);

    const neighbors = adj[node] || [];
    for (const neighbor of neighbors) {
      if (dfs(neighbor)) return true;
    }

    recStack.delete(node);
    return false;
  }

  for (const node of Object.keys(adj)) {
    if (dfs(node)) return true;
  }

  return false;
}

/**
 * Adds a milestone. Since this is a structural change, we create a snapshot.
 */
export async function createMilestone(data: z.infer<typeof insertMilestoneSchema>) {
  // First lookup timeline to authorize against its project
  const [timeline] = await db.select().from(timelines).where(eq(timelines.timelineId, data.timelineId));
  if (!timeline) throw new Error("Timeline not found");
  
  const { user } = await authorizeTimelineEdit(timeline.projectId);

  const milestone = await db.transaction(async (tx) => {
    const [newMilestone] = await tx
      .insert(milestones)
      .values({
        ...data,
        organizationId: user.organizationId,
        createdBy: user.userId,
        updatedBy: user.userId,
      })
      .returning();

    await createTimelineSnapshot(data.timelineId, `Added milestone: ${data.name}`, null, tx);
    await logActivity("milestone_created", data.timelineId, user.userId, user.organizationId, { milestoneId: newMilestone.milestoneId }, tx);
    
    return newMilestone;
  });

  revalidatePath(`/projects/${timeline.projectId}/timeline`);
  return milestone;
}

export async function addTimelineDependency(data: z.infer<typeof insertTimelineDependencySchema>) {
  const [timeline] = await db.select().from(timelines).where(eq(timelines.timelineId, data.timelineId));
  if (!timeline) throw new Error("Timeline not found");
  
  const { user } = await authorizeTimelineEdit(timeline.projectId);

  // Check for circular dependency
  const existingDeps = await db.query.timelineDependencies.findMany({
    where: eq(timelineDependencies.timelineId, data.timelineId),
    columns: {
      predecessorId: true,
      successorId: true,
    }
  });

  const testEdges = [...existingDeps, { predecessorId: data.predecessorId, successorId: data.successorId }];
  if (checkTimelineCycle(testEdges)) {
    throw new Error("Cannot add dependency: this would create a circular reference.");
  }
  
  const dependency = await db.transaction(async (tx) => {
    const [newDep] = await tx
      .insert(timelineDependencies)
      .values({
        ...data,
        organizationId: user.organizationId,
        createdBy: user.userId,
      })
      .returning();

    await createTimelineSnapshot(data.timelineId, `Added dependency from ${data.predecessorId} to ${data.successorId}`, null, tx);
    await logActivity("dependency_added", data.timelineId, user.userId, user.organizationId, { dependencyId: newDep.dependencyId }, tx);
    
    return newDep;
  });

  revalidatePath(`/projects/${timeline.projectId}/timeline`);
  return dependency;
}

/**
 * Recalculate progress for a timeline based on its milestones.
 * Updates project.completionPercentage as well.
 */
export async function recalculateTimelineProgress(timelineId: string, tx: DbTransaction) {
  const [timeline] = await tx.select().from(timelines).where(eq(timelines.timelineId, timelineId));
  if (!timeline) return;

  const allMilestones = await tx.select().from(milestones).where(eq(milestones.timelineId, timelineId));
  
  let overallProgress = 0;
  if (allMilestones.length > 0) {
    const totalProgress = allMilestones.reduce((acc, m) => acc + m.progress, 0);
    overallProgress = Math.round(totalProgress / allMilestones.length);
  }

  await tx.update(timelines)
    .set({ overallProgress })
    .where(eq(timelines.timelineId, timelineId));

  await tx.update(projects)
    .set({ completionPercentage: overallProgress })
    .where(eq(projects.projectId, timeline.projectId));
}
