"use server";

import * as real from "./real-actions";
import * as mock from "./mock-actions";

export async function createTask(...args: Parameters<typeof real.createTask>): Promise<Awaited<ReturnType<typeof real.createTask>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).createTask(...args);
  return (real as any).createTask(...args);
}

export async function updateTask(...args: Parameters<typeof real.updateTask>): Promise<Awaited<ReturnType<typeof real.updateTask>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).updateTask(...args);
  return (real as any).updateTask(...args);
}

export async function getTasks(...args: Parameters<typeof real.getTasks>): Promise<Awaited<ReturnType<typeof real.getTasks>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).getTasks(...args);
  return (real as any).getTasks(...args);
}

export async function startTaskTimer(...args: Parameters<typeof real.startTaskTimer>): Promise<Awaited<ReturnType<typeof real.startTaskTimer>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).startTaskTimer(...args);
  return (real as any).startTaskTimer(...args);
}

export async function stopTaskTimer(...args: Parameters<typeof real.stopTaskTimer>): Promise<Awaited<ReturnType<typeof real.stopTaskTimer>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).stopTaskTimer(...args);
  return (real as any).stopTaskTimer(...args);
}

export async function addTaskDependency(...args: Parameters<typeof real.addTaskDependency>): Promise<Awaited<ReturnType<typeof real.addTaskDependency>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).addTaskDependency(...args);
  return (real as any).addTaskDependency(...args);
}

