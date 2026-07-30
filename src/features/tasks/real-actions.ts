"use server";

import { db } from "@/db";
import {
  tasks,
  taskActivity,
  taskComments,
  taskTimeEntries,
  taskDependencies,
  taskAssignees,
} from "@/db/schema/tasks";
import { users } from "@/db/schema/users";
import { organizationSequences } from "@/db/schema/organizations";
import { CurrentUser, requireCurrentUser } from "@/features/auth/current-user";
import { requirePermission } from "@/features/permissions";
import {
  and,
  desc,
  eq,
  ilike,
  isNull,
  sql,
  count,
  not,
  inArray,
} from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { insertTaskSchema, updateTaskSchema } from "./schemas";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Automatically log structured activity events for a task.
 */
async function logTaskActivity(
  eventType:
    | "created"
    | "updated"
    | "status_changed"
    | "assigned"
    | "unassigned"
    | "comment_added"
    | "attachment_added"
    | "checklist_added"
    | "time_logged"
    | "deleted",
  taskId: string,
  projectId: string,
  organizationId: string,
  metadata?: Record<string, unknown>,
  tx: typeof db | DbTransaction = db,
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
async function generateTaskCode(
  organizationId: string,
  tx: typeof db | DbTransaction = db,
): Promise<string> {
  const currentYear = new Date().getFullYear().toString();

  const [sequence] = await tx
    .insert(organizationSequences)
    .values({
      organizationId,
      entityType: "task_code",
      nextValue: 1,
    })
    .onConflictDoUpdate({
      target: [
        organizationSequences.organizationId,
        organizationSequences.entityType,
      ],
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
async function validateTaskAccess(
  taskId: string,
  user: CurrentUser,
  tx: typeof db | DbTransaction = db,
) {
  const task = await tx.query.tasks.findFirst({
    where: and(
      eq(tasks.taskId, taskId),
      eq(tasks.organizationId, user.organizationId),
      isNull(tasks.deletedAt),
    ),
    with: {
      assignees: true,
    },
  });

  if (!task) throw new Error("Task not found or access denied.");

  // If private, only admins, project managers, creators, and assignees can view
  if (task.isPrivate && user.roleKey !== "admin" && user.roleKey !== "owner") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isAssigned = (task as any).assignees?.some(
      (a: any) => a.userId === user.userId,
    ); // Drizzle implicit relation typing workaround
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

    await logTaskActivity(
      "created",
      newTask.taskId,
      newTask.projectId,
      user.organizationId,
      {
        taskCode,
        name: newTask.name,
      },
      tx,
    );

    return newTask;
  });

  revalidatePath(`/projects/${data.projectId}/timeline`);
  return task;
}

export async function updateTask(
  taskId: string,
  data: z.infer<typeof updateTaskSchema>,
) {
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
      await logTaskActivity(
        "status_changed",
        taskId,
        task.projectId,
        user.organizationId,
        { from: existing.status, to: task.status },
        tx,
      );
    } else {
      await logTaskActivity(
        "updated",
        taskId,
        task.projectId,
        user.organizationId,
        { fields: Object.keys(data) },
        tx,
      );
    }

    return task;
  });

  revalidatePath(`/projects/${updatedTask.projectId}/timeline`);
  return updatedTask;
}

/**
 * Sprint 12B — soft delete.
 *
 * `deletedAt` and the "deleted" task-activity event have been in the schema
 * since Sprint 11 and every read already filters on `isNull(deletedAt)`; the
 * action to set it was the only missing piece. Sprint 12A offered `cancelled` /
 * `archived` statuses instead, which are lifecycle states, not removal.
 */
export async function deleteTask(taskId: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "tasks", "delete");

  return await db.transaction(async (tx) => {
    const task = await validateTaskAccess(taskId, user, tx);

    await tx
      .update(tasks)
      .set({
        deletedAt: new Date(),
        deletedBy: user.userId,
        updatedAt: new Date(),
        updatedBy: user.userId,
      })
      .where(eq(tasks.taskId, taskId));

    await logTaskActivity(
      "deleted",
      taskId,
      task.projectId,
      user.organizationId,
      {
        name: task.name,
      },
      tx,
    );

    return { success: true };
  });
}

/**
 * ASSIGNMENT (Sprint 12B)
 *
 * `task_assignees` is a plain join table with a unique (taskId, userId)
 * constraint — the write is an upsert-or-nothing, not a new concept.
 */
export async function assignTask(taskId: string, assigneeUserId: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "tasks", "update");

  return await db.transaction(async (tx) => {
    const task = await validateTaskAccess(taskId, user, tx);

    const [assignee] = await tx
      .insert(taskAssignees)
      .values({
        organizationId: user.organizationId,
        projectId: task.projectId,
        taskId,
        userId: assigneeUserId,
        createdBy: user.userId,
        updatedBy: user.userId,
      })
      .onConflictDoNothing()
      .returning();

    if (assignee) {
      await logTaskActivity(
        "assigned",
        taskId,
        task.projectId,
        user.organizationId,
        {
          userId: assigneeUserId,
        },
        tx,
      );
    }

    return { success: true, alreadyAssigned: !assignee };
  });
}

export async function unassignTask(taskId: string, assigneeUserId: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "tasks", "update");

  return await db.transaction(async (tx) => {
    const task = await validateTaskAccess(taskId, user, tx);

    await tx
      .delete(taskAssignees)
      .where(
        and(
          eq(taskAssignees.taskId, taskId),
          eq(taskAssignees.userId, assigneeUserId),
        ),
      );

    await logTaskActivity(
      "unassigned",
      taskId,
      task.projectId,
      user.organizationId,
      {
        userId: assigneeUserId,
      },
      tx,
    );

    return { success: true };
  });
}

export async function getTaskAssignees(taskId: string) {
  const user = await requireCurrentUser();

  return db
    .select({
      assigneeId: taskAssignees.assigneeId,
      userId: taskAssignees.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    })
    .from(taskAssignees)
    .innerJoin(users, eq(taskAssignees.userId, users.userId))
    .where(
      and(
        eq(taskAssignees.taskId, taskId),
        eq(taskAssignees.organizationId, user.organizationId),
      ),
    );
}

/**
 * COMMENTS (Sprint 12B)
 *
 * `insertTaskCommentSchema` types `content` as JSONB. This stores `{ text }`,
 * the same envelope tasks already use for `description`, so a future rich-text
 * editor can extend the object without a migration.
 */
export async function addTaskComment(taskId: string, text: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "comments", "create");

  const body = text.trim();
  if (!body) throw new Error("A comment cannot be empty.");

  return await db.transaction(async (tx) => {
    const task = await validateTaskAccess(taskId, user, tx);

    const [comment] = await tx
      .insert(taskComments)
      .values({
        organizationId: user.organizationId,
        projectId: task.projectId,
        taskId,
        content: { text: body },
        createdBy: user.userId,
        updatedBy: user.userId,
      })
      .returning();

    await logTaskActivity(
      "comment_added",
      taskId,
      task.projectId,
      user.organizationId,
      {
        commentId: comment.commentId,
      },
      tx,
    );

    return comment;
  });
}

export async function getTaskComments(taskId: string, limit: number = 50) {
  const user = await requireCurrentUser();

  return db
    .select({
      commentId: taskComments.commentId,
      content: taskComments.content,
      createdAt: taskComments.createdAt,
      createdBy: taskComments.createdBy,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(taskComments)
    .leftJoin(users, eq(taskComments.createdBy, users.userId))
    .where(
      and(
        eq(taskComments.taskId, taskId),
        eq(taskComments.organizationId, user.organizationId),
        isNull(taskComments.deletedAt),
      ),
    )
    .orderBy(desc(taskComments.createdAt))
    .limit(limit);
}

/** Sprint 12B — the task's own history, from the table every write above feeds. */
export async function getTaskActivity(taskId: string, limit: number = 25) {
  const user = await requireCurrentUser();

  return db.query.taskActivity.findMany({
    where: and(
      eq(taskActivity.taskId, taskId),
      eq(taskActivity.organizationId, user.organizationId),
    ),
    orderBy: [desc(taskActivity.createdAt)],
    limit,
  });
}

/**
 * Sprint 12B — global task search (technical-debt item 14).
 *
 * `getTasks` is milestone-scoped, which kept tasks out of header search
 * entirely. This is the org-wide title read the other four search sources
 * already had.
 */
export async function searchTasks(
  searchTerm: string,
  cursorOffset: number = 0,
  limit: number = 50,
) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "tasks", "read");

  return db.query.tasks.findMany({
    where: and(
      eq(tasks.organizationId, user.organizationId),
      isNull(tasks.deletedAt),
      ilike(tasks.name, `%${searchTerm}%`),
    ),
    offset: cursorOffset,
    limit,
    orderBy: [desc(tasks.createdAt)],
  });
}

export async function getTasks(
  milestoneId: string,
  cursorOffset: number = 0,
  limit: number = 100,
) {
  const user = await requireCurrentUser();

  // Note: we'd need to filter out `isPrivate` tasks that user doesn't have access to,
  // this is a simplified DB level filter:
  // if not admin/owner, get tasks where isPrivate=false OR createdBy=me OR userId in assignees.
  // We will do a generic fetch for now and assume the caller has milestone access.

  return db.query.tasks.findMany({
    where: and(
      eq(tasks.milestoneId, milestoneId),
      eq(tasks.organizationId, user.organizationId),
      isNull(tasks.deletedAt),
    ),
    offset: cursorOffset,
    limit,
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });
}

/**
 * TIME TRACKING
 */

/**
 * Sprint 12B: this used to return `void`, so a caller could start a timer and
 * had no id with which to stop it — the reason Sprint 12A removed the Start
 * control rather than wiring it. It now returns the entry, and
 * `getActiveTaskTimer` below finds one that outlived the page it was started on.
 */
export async function startTaskTimer(taskId: string) {
  const user = await requireCurrentUser();

  return await db.transaction(async (tx) => {
    const task = await validateTaskAccess(taskId, user, tx);

    // Stop any existing active timers for this user
    const activeTimer = await tx.query.taskTimeEntries.findFirst({
      where: and(
        eq(taskTimeEntries.userId, user.userId),
        isNull(taskTimeEntries.endTime),
      ),
    });

    if (activeTimer) {
      await stopTaskTimer(activeTimer.timeEntryId, tx);
    }

    const [entry] = await tx
      .insert(taskTimeEntries)
      .values({
        organizationId: user.organizationId,
        projectId: task.projectId,
        taskId: task.taskId,
        userId: user.userId,
        startTime: new Date(),
      })
      .returning();

    await logTaskActivity(
      "time_logged",
      taskId,
      task.projectId,
      user.organizationId,
      { action: "started" },
      tx,
    );

    return entry;
  });
}

/**
 * Sprint 12B — the running timer for the current user, optionally narrowed to
 * one task. Only one can be open at a time (startTaskTimer closes any other),
 * so this returns a single row or undefined.
 */
export async function getActiveTaskTimer(taskId?: string) {
  const user = await requireCurrentUser();

  return db.query.taskTimeEntries.findFirst({
    where: and(
      eq(taskTimeEntries.userId, user.userId),
      eq(taskTimeEntries.organizationId, user.organizationId),
      isNull(taskTimeEntries.endTime),
      taskId ? eq(taskTimeEntries.taskId, taskId) : undefined,
    ),
  });
}

export async function stopTaskTimer(
  timeEntryId: string,
  tx: typeof db | DbTransaction = db,
) {
  const user = await requireCurrentUser();

  const [entry] = await tx
    .update(taskTimeEntries)
    .set({
      endTime: new Date(),
    })
    .where(
      and(
        eq(taskTimeEntries.timeEntryId, timeEntryId),
        eq(taskTimeEntries.userId, user.userId),
      ),
    )
    .returning();

  if (entry) {
    const duration = Math.round(
      (entry.endTime!.getTime() - entry.startTime.getTime()) / 60000,
    ); // mins
    await tx
      .update(taskTimeEntries)
      .set({ durationMins: duration })
      .where(eq(taskTimeEntries.timeEntryId, timeEntryId));

    // Auto-rollup to task
    await tx
      .update(tasks)
      .set({
        actualDurationMins: sql`${tasks.actualDurationMins} + ${duration}`,
      })
      .where(eq(tasks.taskId, entry.taskId));
    await logTaskActivity(
      "time_logged",
      entry.taskId,
      entry.projectId,
      user.organizationId,
      { action: "stopped", duration },
      tx,
    );
  }
}

/**
 * DAG CYCLE VALIDATION FOR DEPENDENCIES
 */

async function checkTaskCycle(
  predecessorId: string,
  successorId: string,
  tx: typeof db | DbTransaction,
): Promise<boolean> {
  const visited = new Set<string>();

  async function dfs(currentId: string): Promise<boolean> {
    if (currentId === predecessorId) return true; // Cycle detected
    if (visited.has(currentId)) return false;

    visited.add(currentId);

    const outEdges = await tx.query.taskDependencies.findMany({
      where: eq(taskDependencies.predecessorId, currentId),
    });

    for (const edge of outEdges) {
      if (await dfs(edge.successorId)) return true;
    }
    return false;
  }

  return await dfs(successorId);
}

export async function addTaskDependency(
  predecessorId: string,
  successorId: string,
  type:
    | "finish_to_start"
    | "start_to_start"
    | "finish_to_finish"
    | "start_to_finish",
) {
  const user = await requireCurrentUser();

  await db.transaction(async (tx) => {
    const task = await validateTaskAccess(predecessorId, user, tx);

    const isCycle = await checkTaskCycle(predecessorId, successorId, tx);
    if (isCycle) {
      throw new Error(
        "Cannot add dependency: It would create a circular reference (DAG Cycle Detected).",
      );
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

export async function getMyOpenTasksCount() {
  const user = await requireCurrentUser();

  const [result] = await db
    .select({ value: count(tasks.taskId) })
    .from(tasks)
    .innerJoin(taskAssignees, eq(tasks.taskId, taskAssignees.taskId))
    .where(
      and(
        eq(taskAssignees.userId, user.userId),
        eq(tasks.organizationId, user.organizationId),
        isNull(tasks.deletedAt),
        not(inArray(tasks.status, ["completed", "cancelled"])),
      ),
    );

  return result?.value ?? 0;
}
