/**
 * DEMO_MODE implementation backed by the in-memory demo store.
 * Mirrors real-actions.ts row shapes (tasks expose `name`, not `title`) so the
 * task board/list render demo data correctly and writes persist per session.
 */
import { revalidatePath } from "next/cache";
import {
  DEMO_ORG_ID,
  DEMO_USER_ID,
  getDemoStore,
  nextDemoCode,
  nextDemoId,
} from "@/lib/demo/store";
import type {
  createTask as real_createTask,
  updateTask as real_updateTask,
  getTasks as real_getTasks,
  startTaskTimer as real_startTaskTimer,
  stopTaskTimer as real_stopTaskTimer,
  addTaskDependency as real_addTaskDependency,
  getMyOpenTasksCount as real_getMyOpenTasksCount,
  deleteTask as real_deleteTask,
  assignTask as real_assignTask,
  unassignTask as real_unassignTask,
  getTaskAssignees as real_getTaskAssignees,
  addTaskComment as real_addTaskComment,
  getTaskComments as real_getTaskComments,
  getTaskActivity as real_getTaskActivity,
  searchTasks as real_searchTasks,
  getActiveTaskTimer as real_getActiveTaskTimer,
  getTasksByProject as real_getTasksByProject,
} from "./real-actions";

function auditFields() {
  return {
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    deletedAt: null,
    deletedBy: null,
    isArchived: false,
  };
}

function requireTask(store: ReturnType<typeof getDemoStore>, taskId: string) {
  const task = store.tasks.find(
    (t: any) => t.taskId === taskId && t.deletedAt === null,
  );
  if (!task) throw new Error("Task not found or access denied.");
  return task;
}

function logTaskActivity(
  store: ReturnType<typeof getDemoStore>,
  task: any,
  eventType: string,
  metadata: Record<string, unknown>,
) {
  store.taskActivity.push({
    activityId: nextDemoId(store),
    organizationId: DEMO_ORG_ID,
    projectId: task.projectId,
    taskId: task.taskId,
    eventType,
    metadata,
    ...auditFields(),
  });
}

export async function createTask(
  ...args: Parameters<typeof real_createTask>
): Promise<Awaited<ReturnType<typeof real_createTask>>> {
  const [data] = args;
  const store = getDemoStore();

  const now = new Date();
  const org = store.organizations.find(
    (o: { organizationId: string }) => o.organizationId === DEMO_ORG_ID,
  );
  const codePrefix = org?.codePrefix ?? "NEX";

  const task = {
    taskId: nextDemoId(store),
    taskCode: nextDemoCode(store, `${codePrefix}-T-${now.getFullYear()}`),
    organizationId: DEMO_ORG_ID,
    description: null,
    assignees: [],
    ...data,
    createdAt: now,
    updatedAt: now,
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    deletedAt: null,
    deletedBy: null,
  };
  store.tasks.push(task);

  revalidatePath(`/projects/${(data as any).projectId}/timeline`);
  return task as any;
}

export async function updateTask(
  ...args: Parameters<typeof real_updateTask>
): Promise<Awaited<ReturnType<typeof real_updateTask>>> {
  const [taskId, data] = args;
  const store = getDemoStore();

  const task = store.tasks.find(
    (t) => t.taskId === taskId && t.deletedAt === null,
  );
  if (!task) throw new Error("Task not found or access denied.");

  Object.assign(task, data, { updatedAt: new Date(), updatedBy: DEMO_USER_ID });

  revalidatePath(`/projects/${task.projectId}/timeline`);
  return task as any;
}

export async function getTasks(
  ...args: Parameters<typeof real_getTasks>
): Promise<Awaited<ReturnType<typeof real_getTasks>>> {
  const [milestoneId, cursorOffset = 0, limit = 100] = args;
  const store = getDemoStore();

  return store.tasks
    .filter((t) => t.milestoneId === milestoneId && t.deletedAt === null)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .slice(cursorOffset, cursorOffset + limit) as any;
}

export async function getTasksByProject(
  ...args: Parameters<typeof real_getTasksByProject>
): Promise<Awaited<ReturnType<typeof real_getTasksByProject>>> {
  const [projectId, cursorOffset = 0, limit = 200] = args;
  const store = getDemoStore();

  return store.tasks
    .filter((t) => t.projectId === projectId && t.deletedAt === null)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .slice(cursorOffset, cursorOffset + limit) as any;
}

export async function startTaskTimer(
  ...args: Parameters<typeof real_startTaskTimer>
): Promise<Awaited<ReturnType<typeof real_startTaskTimer>>> {
  const [taskId] = args;
  const store = getDemoStore();

  const task = store.tasks.find(
    (t) => t.taskId === taskId && t.deletedAt === null,
  );
  if (!task) throw new Error("Task not found or access denied.");

  // Stop any running timer first, mirroring the real single-active-timer rule.
  const active = store.taskTimeEntries.find(
    (e) => e.userId === DEMO_USER_ID && e.endTime === null,
  );
  if (active) {
    await stopTaskTimer(active.timeEntryId);
  }

  const entry = {
    timeEntryId: nextDemoId(store),
    taskId,
    organizationId: DEMO_ORG_ID,
    projectId: task.projectId,
    userId: DEMO_USER_ID,
    startTime: new Date(),
    endTime: null,
  };
  store.taskTimeEntries.push(entry);

  // Sprint 12B: the real adapter logs a "time_logged" activity event on both
  // start and stop; the mock logged neither, so the task history diverged
  // between modes. Verified by the Phase 7 sweep (W2.7).
  logTaskActivity(store, task, "time_logged", { action: "started" });

  return entry as any;
}

export async function stopTaskTimer(
  ...args: Parameters<typeof real_stopTaskTimer>
): Promise<Awaited<ReturnType<typeof real_stopTaskTimer>>> {
  const [timeEntryId] = args;
  const store = getDemoStore();

  const entry = store.taskTimeEntries.find(
    (e) => e.timeEntryId === timeEntryId && e.endTime === null,
  );
  if (!entry) throw new Error("Time entry not found");

  entry.endTime = new Date();

  const task = store.tasks.find((t) => t.taskId === entry.taskId);
  if (task) {
    const elapsedMins = Math.max(
      1,
      Math.round((entry.endTime.getTime() - entry.startTime.getTime()) / 60000),
    );
    task.actualDurationMins = (task.actualDurationMins ?? 0) + elapsedMins;
    task.updatedAt = new Date();
    entry.durationMins = elapsedMins;
    logTaskActivity(store, task, "time_logged", {
      action: "stopped",
      duration: elapsedMins,
    });
  }

  return entry as any;
}

export async function addTaskDependency(
  ...args: Parameters<typeof real_addTaskDependency>
): Promise<Awaited<ReturnType<typeof real_addTaskDependency>>> {
  const [data] = args as unknown as [
    { taskId: string; dependsOnTaskId: string },
  ];
  const store = getDemoStore();

  const dependency = {
    dependencyId: nextDemoId(store),
    organizationId: DEMO_ORG_ID,
    ...data,
    createdAt: new Date(),
    createdBy: DEMO_USER_ID,
  };
  store.taskDependencies.push(dependency);

  return dependency as any;
}

export async function getMyOpenTasksCount(
  ...args: Parameters<typeof real_getMyOpenTasksCount>
): Promise<Awaited<ReturnType<typeof real_getMyOpenTasksCount>>> {
  const store = getDemoStore();
  // In demo data, assignees is mostly empty, so we just return total open tasks for demo purposes
  // or checking assignees array.
  return store.tasks.filter(
    (t) =>
      t.deletedAt === null && !["completed", "cancelled"].includes(t.status),
  ).length as any;
}

/**
 * SPRINT 12B — delete, assignment, comments, history, search, active timer.
 * Every one of these mirrors a real-actions counterpart added this sprint.
 */
export async function deleteTask(
  ...args: Parameters<typeof real_deleteTask>
): Promise<Awaited<ReturnType<typeof real_deleteTask>>> {
  const [taskId] = args;
  const store = getDemoStore();
  const task = requireTask(store, taskId);

  task.deletedAt = new Date();
  task.deletedBy = DEMO_USER_ID;
  task.updatedAt = new Date();
  task.updatedBy = DEMO_USER_ID;

  logTaskActivity(store, task, "deleted", { name: task.name });
  revalidatePath(`/projects/${task.projectId}/timeline`);

  return { success: true } as any;
}

export async function assignTask(
  ...args: Parameters<typeof real_assignTask>
): Promise<Awaited<ReturnType<typeof real_assignTask>>> {
  const [taskId, assigneeUserId] = args;
  const store = getDemoStore();
  const task = requireTask(store, taskId);

  const existing = store.taskAssignees.find(
    (a: any) => a.taskId === taskId && a.userId === assigneeUserId,
  );
  if (existing) return { success: true, alreadyAssigned: true } as any;

  store.taskAssignees.push({
    assigneeId: nextDemoId(store),
    organizationId: DEMO_ORG_ID,
    projectId: task.projectId,
    taskId,
    userId: assigneeUserId,
    ...auditFields(),
  });

  logTaskActivity(store, task, "assigned", { userId: assigneeUserId });

  return { success: true, alreadyAssigned: false } as any;
}

export async function unassignTask(
  ...args: Parameters<typeof real_unassignTask>
): Promise<Awaited<ReturnType<typeof real_unassignTask>>> {
  const [taskId, assigneeUserId] = args;
  const store = getDemoStore();
  const task = requireTask(store, taskId);

  const index = store.taskAssignees.findIndex(
    (a: any) => a.taskId === taskId && a.userId === assigneeUserId,
  );
  if (index !== -1) store.taskAssignees.splice(index, 1);

  logTaskActivity(store, task, "unassigned", { userId: assigneeUserId });

  return { success: true } as any;
}

export async function getTaskAssignees(
  ...args: Parameters<typeof real_getTaskAssignees>
): Promise<Awaited<ReturnType<typeof real_getTaskAssignees>>> {
  const [taskId] = args;
  const store = getDemoStore();

  return store.taskAssignees
    .filter((a: any) => a.taskId === taskId)
    .map((assignee: any) => {
      const user = store.users.find((u: any) => u.userId === assignee.userId);
      return {
        assigneeId: assignee.assigneeId,
        userId: assignee.userId,
        firstName: user?.firstName ?? "Unknown",
        lastName: user?.lastName ?? null,
        email: user?.email ?? "",
      };
    }) as any;
}

export async function addTaskComment(
  ...args: Parameters<typeof real_addTaskComment>
): Promise<Awaited<ReturnType<typeof real_addTaskComment>>> {
  const [taskId, text] = args;
  const store = getDemoStore();
  const task = requireTask(store, taskId);

  const body = text.trim();
  if (!body) throw new Error("A comment cannot be empty.");

  const comment = {
    commentId: nextDemoId(store),
    organizationId: DEMO_ORG_ID,
    projectId: task.projectId,
    taskId,
    content: { text: body },
    ...auditFields(),
  };
  store.taskComments.push(comment);

  logTaskActivity(store, task, "comment_added", {
    commentId: comment.commentId,
  });

  return comment as any;
}

export async function getTaskComments(
  ...args: Parameters<typeof real_getTaskComments>
): Promise<Awaited<ReturnType<typeof real_getTaskComments>>> {
  const [taskId, limit = 50] = args;
  const store = getDemoStore();

  return store.taskComments
    .filter((c: any) => c.taskId === taskId && c.deletedAt === null)
    .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit)
    .map((comment: any) => {
      const user = store.users.find((u: any) => u.userId === comment.createdBy);
      return {
        commentId: comment.commentId,
        content: comment.content,
        createdAt: comment.createdAt,
        createdBy: comment.createdBy,
        firstName: user?.firstName ?? null,
        lastName: user?.lastName ?? null,
      };
    }) as any;
}

export async function getTaskActivity(
  ...args: Parameters<typeof real_getTaskActivity>
): Promise<Awaited<ReturnType<typeof real_getTaskActivity>>> {
  const [taskId, limit = 25] = args;
  const store = getDemoStore();

  return store.taskActivity
    .filter((a: any) => a.taskId === taskId)
    .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit) as any;
}

export async function searchTasks(
  ...args: Parameters<typeof real_searchTasks>
): Promise<Awaited<ReturnType<typeof real_searchTasks>>> {
  const [searchTerm, cursorOffset = 0, limit = 50] = args;
  const store = getDemoStore();
  const needle = searchTerm.toLowerCase();

  return store.tasks
    .filter(
      (t: any) =>
        t.deletedAt === null && t.name?.toLowerCase().includes(needle),
    )
    .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(cursorOffset, cursorOffset + limit) as any;
}

export async function getActiveTaskTimer(
  ...args: Parameters<typeof real_getActiveTaskTimer>
): Promise<Awaited<ReturnType<typeof real_getActiveTaskTimer>>> {
  const [taskId] = args;
  const store = getDemoStore();

  return store.taskTimeEntries.find(
    (entry: any) =>
      entry.userId === DEMO_USER_ID &&
      entry.endTime === null &&
      (!taskId || entry.taskId === taskId),
  ) as any;
}
