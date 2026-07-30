"use server";

import { db } from "@/db";
import { activityLogs, projectMembers, projects } from "@/db/schema";
import { organizationSequences } from "@/db/schema/organizations";
import { requireCurrentUser } from "@/features/auth/current-user";
import { requirePermission } from "@/features/permissions";
import { and, eq, ilike, isNull, sql, count, not, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { insertProjectSchema, updateProjectSchema } from "./schemas";

/**
 * Log activity for projects module.
 */
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

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
    module: "projects",
    entityType: "project",
    entityId,
    action,
    description: `Project ${action}`,
    userId,
    metadata,
  });
}

/**
 * Generate a sequential project code format: AIC-YYYY-XXXX
 */
async function generateProjectCode(organizationId: string, tx: typeof db | DbTransaction = db): Promise<string> {
  const currentYear = new Date().getFullYear().toString();
  
  const [sequence] = await tx
    .insert(organizationSequences)
    .values({
      organizationId,
      entityType: "project_code",
      nextValue: 1,
    })
    .onConflictDoUpdate({
      target: [organizationSequences.organizationId, organizationSequences.entityType],
      set: { nextValue: sql`${organizationSequences.nextValue} + 1` },
    })
    .returning();

  const nextSequence = sequence.nextValue.toString().padStart(4, "0");
  return `AIC-${currentYear}-${nextSequence}`;
}

/**
 * Create a new project.
 */
export async function createProject(data: z.infer<typeof insertProjectSchema>) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "projects", "create");

  const project = await db.transaction(async (tx) => {
    const projectCode = await generateProjectCode(user.organizationId, tx);

    const [newProject] = await tx
      .insert(projects)
      .values({
        ...data,
        projectCode,
        organizationId: user.organizationId,
        createdBy: user.userId,
        updatedBy: user.userId,
      })
      .returning();

    await logActivity("created", newProject.projectId, user.userId, user.organizationId, {
      projectCode,
      projectName: newProject.projectName,
    }, tx);

    return newProject;
  });

  revalidatePath("/projects");
  return project;
}

/**
 * Update an existing project.
 */
export async function updateProject(projectId: string, data: z.infer<typeof updateProjectSchema>) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "projects", "update");

  const [project] = await db
    .update(projects)
    .set({
      ...data,
      updatedAt: new Date(),
      updatedBy: user.userId,
    })
    .where(and(eq(projects.projectId, projectId), eq(projects.organizationId, user.organizationId)))
    .returning();

  await logActivity("updated", projectId, user.userId, user.organizationId, {
    updatedFields: Object.keys(data),
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return project;
}

/**
 * Get all active projects for the organization with optional search query.
 */
export async function getProjects(
  query?: string,
  limit: number = 50,
  offset: number = 0
) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "projects", "read");

  const filters = [isNull(projects.deletedAt), eq(projects.organizationId, user.organizationId)];
  if (query) {
    filters.push(ilike(projects.projectName, `%${query}%`));
  }

  return db.query.projects.findMany({
    where: and(...filters),
    orderBy: (projects, { desc }) => [desc(projects.createdAt)],
    limit,
    offset,
    with: {
      client: true,
      manager: true,
    },
  });
}

/**
 * Get a specific project by ID.
 */
export async function getProjectById(projectId: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "projects", "read");

  return db.query.projects.findFirst({
    where: and(
      eq(projects.projectId, projectId),
      eq(projects.organizationId, user.organizationId),
      isNull(projects.deletedAt)
    ),
    with: {
      client: true,
      manager: true,
      creativeDirector: true,
      members: {
        with: {
          user: true,
        },
      },
    },
  });
}

/**
 * Soft delete (archive) a project and all its members.
 */
export async function archiveProject(projectId: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "projects", "delete");

  await db.transaction(async (tx) => {
    // Archive project
    await tx
      .update(projects)
      .set({
        deletedAt: new Date(),
        deletedBy: user.userId,
        status: "archived",
      })
      .where(and(eq(projects.projectId, projectId), eq(projects.organizationId, user.organizationId)));

    // Cascade to project members
    await tx
      .update(projectMembers)
      .set({
        status: "archived",
      })
      .where(eq(projectMembers.projectId, projectId));

    await logActivity("archived", projectId, user.userId, user.organizationId, undefined, tx);
  });

  revalidatePath("/projects");
}

/**
 * The Project Dashboard Summary Model interface
 */
export interface ProjectDashboardSummary {
  overallProgress: number;
  currentPhase: string;
  currentSprint: string | null;
  projectHealth: string;
  upcomingDeadline: string | null;
  pendingApprovals: number;
  pendingReviews: number;
  openRevisions: number;
  openTasks: number;
  completedTasks: number;
  recentActivity: unknown[];
  latestDeliverable: string | null;
  latestComment: string | null;
  latestMeeting: string | null;
  clientStatus: string;
}

/**
 * Get the dashboard summary model for a project. (Stubbed for future implementation)
 */
export async function getProjectDashboardSummary(projectId: string): Promise<ProjectDashboardSummary> {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "projects", "read");

  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.projectId, projectId),
      eq(projects.organizationId, user.organizationId)
    ),
    with: { client: true }
  });

  if (!project) throw new Error("Project not found");

  // Stub data until remaining modules (Tasks, Deliverables, etc.) are built.
  return {
    overallProgress: project.completionPercentage || 0,
    currentPhase: project.status,
    currentSprint: "Sprint 1",
    projectHealth: project.healthStatus,
    upcomingDeadline: project.estimatedEndDate?.toISOString() || null,
    pendingApprovals: 0,
    pendingReviews: 0,
    openRevisions: 0,
    openTasks: 0,
    completedTasks: 0,
    recentActivity: [],
    latestDeliverable: "None",
    latestComment: "None",
    latestMeeting: "None",
    clientStatus: project.client?.status || "active",
  };
}

/**
 * Add a member to a project.
 */
export async function addProjectMember(projectId: string, userId: string, role: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "projects", "update");

  // Basic check to ensure the project exists in this org
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.projectId, projectId), eq(projects.organizationId, user.organizationId)),
  });

  if (!project) throw new Error("Project not found");

  const [member] = await db
    .insert(projectMembers)
    .values({
      projectId,
      userId,
      role,
    })
    .returning();

  await logActivity("member_added", projectId, user.userId, user.organizationId, {
    memberUserId: userId,
    role,
  });

  revalidatePath(`/projects/${projectId}`);
  return member;
}

/**
 * Update a project member's role.
 */
export async function updateProjectMemberRole(memberId: string, role: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "projects", "update");

  const [member] = await db
    .update(projectMembers)
    .set({ role })
    .where(eq(projectMembers.memberId, memberId))
    .returning();

  if (member) {
    await logActivity("member_role_updated", member.projectId, user.userId, user.organizationId, {
      memberId,
      newRole: role,
    });
    revalidatePath(`/projects/${member.projectId}`);
  }

  return member;
}

/**
 * Remove a project member.
 */
export async function removeProjectMember(memberId: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "projects", "update");

  const [member] = await db
    .delete(projectMembers)
    .where(eq(projectMembers.memberId, memberId))
    .returning();

  if (member) {
    await logActivity("member_removed", member.projectId, user.userId, user.organizationId, {
      memberUserId: member.userId,
    });
    revalidatePath(`/projects/${member.projectId}`);
  }

  return member;
}

export async function getActiveProjectsCount() {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "projects", "read");

  const [result] = await db
    .select({ value: count(projects.projectId) })
    .from(projects)
    .where(
      and(
        eq(projects.organizationId, user.organizationId),
        isNull(projects.deletedAt),
        not(inArray(projects.status, ["completed", "cancelled", "archived"]))
      )
    );

  return result?.value ?? 0;
}
