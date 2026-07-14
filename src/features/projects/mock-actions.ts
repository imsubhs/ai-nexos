/**
 * DEMO_MODE implementation backed by the in-memory demo store.
 * Mirrors real-actions.ts behavior so the demo session behaves like a real
 * database: creates appear in the list, updates persist, archives disappear.
 */
import { revalidatePath } from "next/cache";
import {
  DEMO_ORG_ID,
  DEMO_USER_ID,
  DEMO_USER_SUMMARY,
  getDemoStore,
  logDemoActivity,
  nextDemoCode,
  nextDemoId,
} from "@/lib/demo/store";
import type {
  createProject as real_createProject,
  updateProject as real_updateProject,
  getProjects as real_getProjects,
  getProjectById as real_getProjectById,
  archiveProject as real_archiveProject,
  getProjectDashboardSummary as real_getProjectDashboardSummary,
  addProjectMember as real_addProjectMember,
  updateProjectMemberRole as real_updateProjectMemberRole,
  removeProjectMember as real_removeProjectMember,
} from "./real-actions";
import type { ProjectDashboardSummary } from "./real-actions";

function findClientSummary(clientId: string | null | undefined) {
  if (!clientId) return null;
  const client = getDemoStore().clients.find((c) => c.clientId === clientId);
  return client ? { companyName: client.companyName, status: client.status } : null;
}

export async function createProject(...args: Parameters<typeof real_createProject>): Promise<Awaited<ReturnType<typeof real_createProject>>> {
  const [data] = args;
  const store = getDemoStore();

  const now = new Date();
  const project = {
    projectId: nextDemoId(store),
    projectCode: nextDemoCode(store, `AIC-${now.getFullYear()}`),
    organizationId: DEMO_ORG_ID,
    description: null,
    clientId: null,
    projectManager: null,
    creativeDirector: null,
    departmentId: null,
    startDate: null,
    estimatedEndDate: null,
    actualEndDate: null,
    budget: null,
    ...data,
    createdAt: now,
    updatedAt: now,
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    deletedAt: null,
    deletedBy: null,
    isArchived: false,
    client: findClientSummary(data.clientId),
    manager: { ...DEMO_USER_SUMMARY },
  };
  store.projects.push(project);

  logDemoActivity(store, "projects", "created", "project", project.projectId, `Created project ${project.projectName}`, {
    projectCode: project.projectCode,
    projectName: project.projectName,
  });

  revalidatePath("/projects");
  return project as any;
}

export async function updateProject(...args: Parameters<typeof real_updateProject>): Promise<Awaited<ReturnType<typeof real_updateProject>>> {
  const [projectId, data] = args;
  const store = getDemoStore();

  const project = store.projects.find((p) => p.projectId === projectId && p.deletedAt === null);
  if (!project) throw new Error("Project not found");

  Object.assign(project, data, { updatedAt: new Date(), updatedBy: DEMO_USER_ID });
  if ("clientId" in data) {
    project.client = findClientSummary(project.clientId);
  }

  logDemoActivity(store, "projects", "updated", "project", projectId, `Updated project ${project.projectName}`, {
    updatedFields: Object.keys(data),
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return project as any;
}

export async function getProjects(...args: Parameters<typeof real_getProjects>): Promise<Awaited<ReturnType<typeof real_getProjects>>> {
  const [query, limit = 50, offset = 0] = args;
  const store = getDemoStore();

  return store.projects
    .filter((p) => p.deletedAt === null)
    .filter((p) => (query ? p.projectName.toLowerCase().includes(query.toLowerCase()) : true))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(offset, offset + limit) as any;
}

export async function getProjectById(...args: Parameters<typeof real_getProjectById>): Promise<Awaited<ReturnType<typeof real_getProjectById>>> {
  const [projectId] = args;
  const store = getDemoStore();

  const project = store.projects.find((p) => p.projectId === projectId && p.deletedAt === null);
  if (!project) return undefined as any;

  return {
    ...project,
    members: store.projectMembers.filter((m) => m.projectId === projectId && m.deletedAt === null),
  } as any;
}

export async function archiveProject(...args: Parameters<typeof real_archiveProject>): Promise<Awaited<ReturnType<typeof real_archiveProject>>> {
  const [projectId] = args;
  const store = getDemoStore();

  const project = store.projects.find((p) => p.projectId === projectId && p.deletedAt === null);
  if (!project) throw new Error("Project not found");

  const now = new Date();
  Object.assign(project, {
    deletedAt: now,
    deletedBy: DEMO_USER_ID,
    isArchived: true,
    status: "archived",
    updatedAt: now,
    updatedBy: DEMO_USER_ID,
  });

  store.projectMembers
    .filter((m) => m.projectId === projectId && m.deletedAt === null)
    .forEach((m) => Object.assign(m, { deletedAt: now, deletedBy: DEMO_USER_ID, status: "inactive" }));

  logDemoActivity(store, "projects", "archived", "project", projectId, `Archived project ${project.projectName}`);

  revalidatePath("/projects");
  return project as any;
}

export async function getProjectDashboardSummary(...args: Parameters<typeof real_getProjectDashboardSummary>): Promise<Awaited<ReturnType<typeof real_getProjectDashboardSummary>>> {
  const [projectId] = args;
  const store = getDemoStore();

  const project = store.projects.find((p) => p.projectId === projectId);
  if (!project) throw new Error("Project not found");

  const projectTasks = store.tasks.filter((t) => t.projectId === projectId && t.deletedAt === null);
  const openTasks = projectTasks.filter((t) => t.status !== "completed").length;
  const completedTasks = projectTasks.length - openTasks;

  const summary: ProjectDashboardSummary = {
    overallProgress: project.completionPercentage || 0,
    currentPhase: project.status,
    currentSprint: "Sprint 1",
    projectHealth: project.healthStatus,
    upcomingDeadline: project.estimatedEndDate?.toISOString() || null,
    pendingApprovals: 0,
    pendingReviews: 0,
    openRevisions: 0,
    openTasks,
    completedTasks,
    recentActivity: store.activityLogs.filter((log) => log.entityId === projectId).slice(-5),
    latestDeliverable: null,
    latestComment: null,
    latestMeeting: null,
    clientStatus: project.client?.status ?? "active",
  };
  return summary;
}

export async function addProjectMember(...args: Parameters<typeof real_addProjectMember>): Promise<Awaited<ReturnType<typeof real_addProjectMember>>> {
  const [projectId, userId, role] = args;
  const store = getDemoStore();

  const member = {
    memberId: nextDemoId(store),
    projectId,
    userId,
    role,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    deletedAt: null,
    deletedBy: null,
    user:
      userId === DEMO_USER_ID
        ? { ...DEMO_USER_SUMMARY }
        : { userId, firstName: "Guest", lastName: "Member", email: "guest@demo.local", avatarUrl: null },
  };
  store.projectMembers.push(member);

  logDemoActivity(store, "projects", "member_added", "project", projectId, `Added member to project`, { userId, role });

  revalidatePath(`/projects/${projectId}`);
  return member as any;
}

export async function updateProjectMemberRole(...args: Parameters<typeof real_updateProjectMemberRole>): Promise<Awaited<ReturnType<typeof real_updateProjectMemberRole>>> {
  const [memberId, role] = args;
  const store = getDemoStore();

  const member = store.projectMembers.find((m) => m.memberId === memberId && m.deletedAt === null);
  if (!member) throw new Error("Member not found");

  Object.assign(member, { role, updatedAt: new Date(), updatedBy: DEMO_USER_ID });

  revalidatePath(`/projects/${member.projectId}`);
  return member as any;
}

export async function removeProjectMember(...args: Parameters<typeof real_removeProjectMember>): Promise<Awaited<ReturnType<typeof real_removeProjectMember>>> {
  const [memberId] = args;
  const store = getDemoStore();

  const member = store.projectMembers.find((m) => m.memberId === memberId && m.deletedAt === null);
  if (!member) throw new Error("Member not found");

  Object.assign(member, { deletedAt: new Date(), deletedBy: DEMO_USER_ID, status: "inactive" });

  revalidatePath(`/projects/${member.projectId}`);
  return member as any;
}
