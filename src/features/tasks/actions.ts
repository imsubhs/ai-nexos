"use server";

import * as real from "./real-actions";
import * as mock from "./mock-actions";
import { isDemoMode } from "@/lib/env.server";

export async function createTask(
  ...args: Parameters<typeof real.createTask>
): Promise<Awaited<ReturnType<typeof real.createTask>>> {
  if (isDemoMode()) return (mock as any).createTask(...args);
  return (real as any).createTask(...args);
}

export async function updateTask(
  ...args: Parameters<typeof real.updateTask>
): Promise<Awaited<ReturnType<typeof real.updateTask>>> {
  if (isDemoMode()) return (mock as any).updateTask(...args);
  return (real as any).updateTask(...args);
}

export async function getTasks(
  ...args: Parameters<typeof real.getTasks>
): Promise<Awaited<ReturnType<typeof real.getTasks>>> {
  if (isDemoMode()) return (mock as any).getTasks(...args);
  return (real as any).getTasks(...args);
}

export async function startTaskTimer(
  ...args: Parameters<typeof real.startTaskTimer>
): Promise<Awaited<ReturnType<typeof real.startTaskTimer>>> {
  if (isDemoMode()) return (mock as any).startTaskTimer(...args);
  return (real as any).startTaskTimer(...args);
}

export async function stopTaskTimer(
  ...args: Parameters<typeof real.stopTaskTimer>
): Promise<Awaited<ReturnType<typeof real.stopTaskTimer>>> {
  if (isDemoMode()) return (mock as any).stopTaskTimer(...args);
  return (real as any).stopTaskTimer(...args);
}

export async function addTaskDependency(
  ...args: Parameters<typeof real.addTaskDependency>
): Promise<Awaited<ReturnType<typeof real.addTaskDependency>>> {
  if (isDemoMode()) return (mock as any).addTaskDependency(...args);
  return (real as any).addTaskDependency(...args);
}

export async function getMyOpenTasksCount(
  ...args: Parameters<typeof real.getMyOpenTasksCount>
): Promise<Awaited<ReturnType<typeof real.getMyOpenTasksCount>>> {
  if (isDemoMode()) return (mock as any).getMyOpenTasksCount(...args);
  return (real as any).getMyOpenTasksCount(...args);
}

export async function deleteTask(
  ...args: Parameters<typeof real.deleteTask>
): Promise<Awaited<ReturnType<typeof real.deleteTask>>> {
  if (isDemoMode()) return (mock as any).deleteTask(...args);
  return (real as any).deleteTask(...args);
}

export async function assignTask(
  ...args: Parameters<typeof real.assignTask>
): Promise<Awaited<ReturnType<typeof real.assignTask>>> {
  if (isDemoMode()) return (mock as any).assignTask(...args);
  return (real as any).assignTask(...args);
}

export async function unassignTask(
  ...args: Parameters<typeof real.unassignTask>
): Promise<Awaited<ReturnType<typeof real.unassignTask>>> {
  if (isDemoMode()) return (mock as any).unassignTask(...args);
  return (real as any).unassignTask(...args);
}

export async function getTaskAssignees(
  ...args: Parameters<typeof real.getTaskAssignees>
): Promise<Awaited<ReturnType<typeof real.getTaskAssignees>>> {
  if (isDemoMode()) return (mock as any).getTaskAssignees(...args);
  return (real as any).getTaskAssignees(...args);
}

export async function addTaskComment(
  ...args: Parameters<typeof real.addTaskComment>
): Promise<Awaited<ReturnType<typeof real.addTaskComment>>> {
  if (isDemoMode()) return (mock as any).addTaskComment(...args);
  return (real as any).addTaskComment(...args);
}

export async function getTaskComments(
  ...args: Parameters<typeof real.getTaskComments>
): Promise<Awaited<ReturnType<typeof real.getTaskComments>>> {
  if (isDemoMode()) return (mock as any).getTaskComments(...args);
  return (real as any).getTaskComments(...args);
}

export async function getTaskActivity(
  ...args: Parameters<typeof real.getTaskActivity>
): Promise<Awaited<ReturnType<typeof real.getTaskActivity>>> {
  if (isDemoMode()) return (mock as any).getTaskActivity(...args);
  return (real as any).getTaskActivity(...args);
}

export async function searchTasks(
  ...args: Parameters<typeof real.searchTasks>
): Promise<Awaited<ReturnType<typeof real.searchTasks>>> {
  if (isDemoMode()) return (mock as any).searchTasks(...args);
  return (real as any).searchTasks(...args);
}

export async function getActiveTaskTimer(
  ...args: Parameters<typeof real.getActiveTaskTimer>
): Promise<Awaited<ReturnType<typeof real.getActiveTaskTimer>>> {
  if (isDemoMode()) return (mock as any).getActiveTaskTimer(...args);
  return (real as any).getActiveTaskTimer(...args);
}
