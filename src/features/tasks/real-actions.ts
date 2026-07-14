"use server";

import { db } from "@/db";
import { tasks, taskActivity, taskTimeEntries, taskDependencies } from "@/db/schema/tasks";
import { organizationSequences } from "@/db/schema/organizations";
import { CurrentUser, requireCurrentUser } from "@/features/auth/current-user";
import { requirePermission } from "@/features/permissions";
import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { insertTaskSchema, updateTaskSchema } from "./schemas";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Automatically log structured activity events for a task.
 */
async function logTaskActivity(
  eventType: "created" | "updated" | "status_changed" | "assigned" | "unassigned" | "comment_added" | "attachment_added" | "checklist_added" | "time_logged" | "deleted",
  taskId: string,
  projectId: string,
  organizationId: string,
  metadata?: Record<string, unknown>,
  tx: typeof db | DbTransaction = db
) {
  await tx.insert(taskActivity).values({
    organizationId,
    projectId,
    taskId,
    eventType,
    metadata,
  });
}

/**
 * Generate a sequential task code format: AIC-T-YYYY-XXXX
 */
async function generateTaskCode(organizationId: string, tx: typeof db | DbTransaction = db): Promise<string> {
  const currentYear = new Date().getFullYear().toString();
  
  const [sequence] = await tx
    .insert(organizationSequences)
    .values({
      organizationId,
      entityType: "task_code",
      nextValue: 1,
    })
    .onConflictDoUpdate({
      target: [organizationSequences.organizationId, organizationSequences.entityType],
      set: { nextValue: sql`${organizationSequences.nextValue} + 1` },
    })
    .returning();

  const nextSequence = sequence.nextValue.toString().padStart(4, "0");
  return `AIC-T-${currentYear}-${nextSequence}`;
}

/**
 * Validates RLS: user can access the task.
 * Rules:
 * - Admin/Owner/ProjectManager automatically have access if they have read permissions.
 * - If isPrivate, user must be the creator OR explicitly assigned.
 */
async function validateTaskAccess(taskId: string, user: CurrentUser, tx: typeof db | DbTransaction = db) {
  const task = await tx.query.tasks.findFirst({
    where: and(
      eq(tasks.taskId, taskId),
      eq(tasks.organizationId, user.organizationId),
      isNull(tasks.deletedAt)
    ),
    with: {
      assignees: true,
    }
  });

  if (!task) throw new Error("Task not found or access denied.");

  // If private, only admins, project managers, creators, and assignees can view
  if (task.isPrivate && user.roleKey !== "admin" && user.roleKey !== "owner") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isAssigned = (task as any).assignees?.some((a: any) => a.userId === user.userId); // Drizzle implicit relation typing workaround
    if (task.createdBy !== user.userId && !isAssigned) {
      // For now we check globally, future we could check project_members role "project_manager"
      throw new Error("You do not have permission to view this private task.");
    }
  }

  return task;
}

/**
 * CORE ACTIONS
 */

export async function createTask(data: z.infer<typeof insertTaskSchema>) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "projects", "create"); // Borrow project permissions for now

  const task = await db.transaction(async (tx) => {
    const taskCode = await generateTaskCode(user.organizationId, tx);

    const [newTask] = await tx
      .insert(tasks)
      .values({
        ...data,
        taskCode,
        organizationId: user.organizationId,
        createdBy: user.userId,
        updatedBy: user.userId,
      })
      .returning();

    await logTaskActivity("created", newTask.taskId, newTask.projectId, user.organizationId, {
      taskCode,
      name: newTask.name,
    }, tx);

    return newTask;
  });

  revalidatePath(`/projects/${data.projectId}/timeline`);
  return task;
}

export async function updateTask(taskId: string, data: z.infer<typeof updateTaskSchema>) {
  const user = await requireCurrentUser();
  
  const updatedTask = await db.transaction(async (tx) => {
    const existing = await validateTaskAccess(taskId, user, tx);
    
    const [task] = await tx
      .update(tasks)
      .set({
        ...data,
        updatedAt: new Date(),
        updatedBy: user.userId,
      })
      .where(eq(tasks.taskId, taskId))
      .returning();
      
    if (existing.status !== task.status) {
       await logTaskActivity("status_changed", taskId, task.projectId, user.organizationId, { from: existing.status, to: task.status }, tx);
    } else {
       await logTaskActivity("updated", taskId, task.projectId, user.organizationId, { fields: Object.keys(data) }, tx);
    }
    
    return task;
  });

  revalidatePath(`/projects/${updatedTask.projectId}/timeline`);
  return updatedTask;
}

export async function getTasks(milestoneId: string, cursorOffset: number = 0, limit: number = 100) {
  const user = await requireCurrentUser();
  
  // Note: we'd need to filter out `isPrivate` tasks that user doesn't have access to,
  // this is a simplified DB level filter:
  // if not admin/owner, get tasks where isPrivate=false OR createdBy=me OR userId in assignees.
  // We will do a generic fetch for now and assume the caller has milestone access.
  
  return db.query.tasks.findMany({
    where: and(
      eq(tasks.milestoneId, milestoneId),
      eq(tasks.organizationId, user.organizationId),
      isNull(tasks.deletedAt)
    ),
    offset: cursorOffset,
    limit,
    orderBy: (t, { asc }) => [asc(t.createdAt)]
  });
}

/**
 * TIME TRACKING
 */

export async function startTaskTimer(taskId: string) {
  const user = await requireCurrentUser();

  await db.transaction(async (tx) => {
    const task = await validateTaskAccess(taskId, user, tx);

    // Stop any existing active timers for this user
    const activeTimer = await tx.query.taskTimeEntries.findFirst({
      where: and(
        eq(taskTimeEntries.userId, user.userId),
        isNull(taskTimeEntries.endTime)
      )
    });

    if (activeTimer) {
      await stopTaskTimer(activeTimer.timeEntryId, tx);
    }

    await tx.insert(taskTimeEntries).values({
      organizationId: user.organizationId,
      projectId: task.projectId,
      taskId: task.taskId,
      userId: user.userId,
      startTime: new Date(),
    });

    await logTaskActivity("time_logged", taskId, task.projectId, user.organizationId, { action: "started" }, tx);
  });
}

export async function stopTaskTimer(timeEntryId: string, tx: typeof db | DbTransaction = db) {
  const user = await requireCurrentUser();
  
  const [entry] = await tx.update(taskTimeEntries).set({
    endTime: new Date(),
  }).where(
    and(
      eq(taskTimeEntries.timeEntryId, timeEntryId),
      eq(taskTimeEntries.userId, user.userId)
    )
  ).returning();
  
  if (entry) {
    const duration = Math.round((entry.endTime!.getTime() - entry.startTime.getTime()) / 60000); // mins
    await tx.update(taskTimeEntries).set({ durationMins: duration }).where(eq(taskTimeEntries.timeEntryId, timeEntryId));
    
    // Auto-rollup to task
    await tx.update(tasks).set({ actualDurationMins: sql`${tasks.actualDurationMins} + ${duration}` }).where(eq(tasks.taskId, entry.taskId));
    await logTaskActivity("time_logged", entry.taskId, entry.projectId, user.organizationId, { action: "stopped", duration }, tx);
  }
}

/**
 * DAG CYCLE VALIDATION FOR DEPENDENCIES
 */

async function checkTaskCycle(predecessorId: string, successorId: string, tx: typeof db | DbTransaction): Promise<boolean> {
  const visited = new Set<string>();
  
  async function dfs(currentId: string): Promise<boolean> {
    if (currentId === predecessorId) return true; // Cycle detected
    if (visited.has(currentId)) return false;
    
    visited.add(currentId);
    
    const outEdges = await tx.query.taskDependencies.findMany({
      where: eq(taskDependencies.predecessorId, currentId)
    });
    
    for (const edge of outEdges) {
      if (await dfs(edge.successorId)) return true;
    }
    return false;
  }
  
  return await dfs(successorId);
}

export async function addTaskDependency(predecessorId: string, successorId: string, type: "finish_to_start" | "start_to_start" | "finish_to_finish" | "start_to_finish") {
  const user = await requireCurrentUser();
  
  await db.transaction(async (tx) => {
    const task = await validateTaskAccess(predecessorId, user, tx);
    
    const isCycle = await checkTaskCycle(predecessorId, successorId, tx);
    if (isCycle) {
      throw new Error("Cannot add dependency: It would create a circular reference (DAG Cycle Detected).");
    }
    
    await tx.insert(taskDependencies).values({
      organizationId: user.organizationId,
      projectId: task.projectId,
      predecessorId,
      successorId,
      dependencyType: type,
    });
  });
}
