"use server";

import * as real from "./real-actions";
import * as mock from "./mock-actions";

export type { ProjectDashboardSummary } from "./real-actions";

export async function createProject(...args: Parameters<typeof real.createProject>): Promise<Awaited<ReturnType<typeof real.createProject>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).createProject(...args);
  return (real as any).createProject(...args);
}

export async function updateProject(...args: Parameters<typeof real.updateProject>): Promise<Awaited<ReturnType<typeof real.updateProject>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).updateProject(...args);
  return (real as any).updateProject(...args);
}

export async function getProjects(...args: Parameters<typeof real.getProjects>): Promise<Awaited<ReturnType<typeof real.getProjects>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).getProjects(...args);
  return (real as any).getProjects(...args);
}

export async function getProjectById(...args: Parameters<typeof real.getProjectById>): Promise<Awaited<ReturnType<typeof real.getProjectById>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).getProjectById(...args);
  return (real as any).getProjectById(...args);
}

export async function archiveProject(...args: Parameters<typeof real.archiveProject>): Promise<Awaited<ReturnType<typeof real.archiveProject>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).archiveProject(...args);
  return (real as any).archiveProject(...args);
}

export async function getProjectDashboardSummary(...args: Parameters<typeof real.getProjectDashboardSummary>): Promise<Awaited<ReturnType<typeof real.getProjectDashboardSummary>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).getProjectDashboardSummary(...args);
  return (real as any).getProjectDashboardSummary(...args);
}

export async function addProjectMember(...args: Parameters<typeof real.addProjectMember>): Promise<Awaited<ReturnType<typeof real.addProjectMember>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).addProjectMember(...args);
  return (real as any).addProjectMember(...args);
}

export async function updateProjectMemberRole(...args: Parameters<typeof real.updateProjectMemberRole>): Promise<Awaited<ReturnType<typeof real.updateProjectMemberRole>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).updateProjectMemberRole(...args);
  return (real as any).updateProjectMemberRole(...args);
}

export async function removeProjectMember(...args: Parameters<typeof real.removeProjectMember>): Promise<Awaited<ReturnType<typeof real.removeProjectMember>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).removeProjectMember(...args);
  return (real as any).removeProjectMember(...args);
}

export async function getActiveProjectsCount(...args: Parameters<typeof real.getActiveProjectsCount>): Promise<Awaited<ReturnType<typeof real.getActiveProjectsCount>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).getActiveProjectsCount(...args);
  return (real as any).getActiveProjectsCount(...args);
}

