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
} from "./real-actions";

export async function createTask(...args: Parameters<typeof real_createTask>): Promise<Awaited<ReturnType<typeof real_createTask>>> {
  const [data] = args;
  const store = getDemoStore();

  const now = new Date();
  const task = {
    taskId: nextDemoId(store),
    taskCode: nextDemoCode(store, `AIC-T-${now.getFullYear()}`),
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

export async function updateTask(...args: Parameters<typeof real_updateTask>): Promise<Awaited<ReturnType<typeof real_updateTask>>> {
  const [taskId, data] = args;
  const store = getDemoStore();

  const task = store.tasks.find((t) => t.taskId === taskId && t.deletedAt === null);
  if (!task) throw new Error("Task not found or access denied.");

  Object.assign(task, data, { updatedAt: new Date(), updatedBy: DEMO_USER_ID });

  revalidatePath(`/projects/${task.projectId}/timeline`);
  return task as any;
}

export async function getTasks(...args: Parameters<typeof real_getTasks>): Promise<Awaited<ReturnType<typeof real_getTasks>>> {
  const [milestoneId, cursorOffset = 0, limit = 100] = args;
  const store = getDemoStore();

  return store.tasks
    .filter((t) => t.milestoneId === milestoneId && t.deletedAt === null)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .slice(cursorOffset, cursorOffset + limit) as any;
}

export async function startTaskTimer(...args: Parameters<typeof real_startTaskTimer>): Promise<Awaited<ReturnType<typeof real_startTaskTimer>>> {
  const [taskId] = args;
  const store = getDemoStore();

  const task = store.tasks.find((t) => t.taskId === taskId && t.deletedAt === null);
  if (!task) throw new Error("Task not found or access denied.");

  // Stop any running timer first, mirroring the real single-active-timer rule.
  const active = store.taskTimeEntries.find((e) => e.userId === DEMO_USER_ID && e.endTime === null);
  if (active) {
    await stopTaskTimer(active.timeEntryId);
  }

  const entry = {
    timeEntryId: nextDemoId(store),
    taskId,
    organizationId: DEMO_ORG_ID,
    userId: DEMO_USER_ID,
    startTime: new Date(),
    endTime: null,
  };
  store.taskTimeEntries.push(entry);

  return entry as any;
}

export async function stopTaskTimer(...args: Parameters<typeof real_stopTaskTimer>): Promise<Awaited<ReturnType<typeof real_stopTaskTimer>>> {
  const [timeEntryId] = args;
  const store = getDemoStore();

  const entry = store.taskTimeEntries.find((e) => e.timeEntryId === timeEntryId && e.endTime === null);
  if (!entry) throw new Error("Time entry not found");

  entry.endTime = new Date();

  const task = store.tasks.find((t) => t.taskId === entry.taskId);
  if (task) {
    const elapsedMins = Math.max(1, Math.round((entry.endTime.getTime() - entry.startTime.getTime()) / 60000));
    task.actualDurationMins = (task.actualDurationMins ?? 0) + elapsedMins;
    task.updatedAt = new Date();
  }

  return entry as any;
}

export async function addTaskDependency(...args: Parameters<typeof real_addTaskDependency>): Promise<Awaited<ReturnType<typeof real_addTaskDependency>>> {
  const [data] = args as unknown as [{ taskId: string; dependsOnTaskId: string }];
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
