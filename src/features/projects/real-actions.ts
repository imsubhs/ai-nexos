import { db } from "@/db";
import { activityLogs, clients, projectMembers, projects, users, tasks } from "@/db/schema";
import { generateProjectCode } from "@/features/organizations/code-generation";
import { requireCurrentUser } from "@/features/auth/current-user";
import { requirePermission } from "@/features/permissions";
import { and, eq, ilike, isNull, count, not, inArray, or as drizzleOr } from "drizzle-orm";
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
  tx: typeof db | DbTransaction = db,
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
 * Assert that a client exists, belongs to the organization, and is not archived.
 */
async function assertActiveTenantClient(
  clientId: string,
  organizationId: string,
  tx: typeof db | DbTransaction = db,
) {
  const [client] = await tx
    .select({ clientId: clients.clientId })
    .from(clients)
    .where(
      and(
        eq(clients.clientId, clientId),
        eq(clients.organizationId, organizationId),
        isNull(clients.deletedAt),
      ),
    )
    .limit(1);

  if (!client) {
    throw new Error("Client not found");
  }
}

/**
 * Assert that a user exists, belongs to the organization, is active, and is not archived.
 */
async function assertActiveTenantUser(
  userId: string,
  organizationId: string,
  tx: typeof db | DbTransaction = db,
) {
  const [targetUser] = await tx
    .select({ userId: users.userId })
    .from(users)
    .where(
      and(
        eq(users.userId, userId),
        eq(users.organizationId, organizationId),
        eq(users.status, "active"),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);

  if (!targetUser) {
    throw new Error("User not found");
  }
}

/**
 * Create a new project.
 */
export async function createProject(data: z.infer<typeof insertProjectSchema>) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "projects", "create");

  const project = await db.transaction(async (tx) => {
    // If a client is specified, verify it exists, is not deleted, and belongs to caller's organization
    if (data.clientId) {
      await assertActiveTenantClient(data.clientId, user.organizationId, tx);
    }

    // Verify projectManager belongs to active organization and is active
    if (data.projectManager) {
      await assertActiveTenantUser(data.projectManager, user.organizationId, tx);
    }

    // Verify creativeDirector belongs to active organization and is active
    if (data.creativeDirector) {
      await assertActiveTenantUser(data.creativeDirector, user.organizationId, tx);
    }

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

    await logActivity(
      "created",
      newProject.projectId,
      user.userId,
      user.organizationId,
      {
        projectCode,
        projectName: newProject.projectName,
      },
      tx,
    );

    return newProject;
  });

  revalidatePath("/projects");
  return project;
}

/**
 * Update an existing project.
 */
export async function updateProject(
  projectId: string,
  data: z.infer<typeof updateProjectSchema>,
) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "projects", "update");

  const project = await db.transaction(async (tx) => {
    // If a client is specified, verify it exists, is not deleted, and belongs to caller's organization
    if (data.clientId) {
      await assertActiveTenantClient(data.clientId, user.organizationId, tx);
    }

    // If projectManager is specified, verify it exists, is active, is not deleted, and belongs to caller's organization
    if (data.projectManager) {
      await assertActiveTenantUser(data.projectManager, user.organizationId, tx);
    }

    // If creativeDirector is specified, verify it exists, is active, is not deleted, and belongs to caller's organization
    if (data.creativeDirector) {
      await assertActiveTenantUser(data.creativeDirector, user.organizationId, tx);
    }

    // Whitelist only legitimate editable fields to prevent mass-assignment (OWASP API3:2023)
    const updatePayload: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: user.userId,
      organizationId: user.organizationId,
    };

    if (data.projectName !== undefined) updatePayload.projectName = data.projectName;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.clientId !== undefined) updatePayload.clientId = data.clientId;
    if (data.projectManager !== undefined) updatePayload.projectManager = data.projectManager;
    if (data.creativeDirector !== undefined) updatePayload.creativeDirector = data.creativeDirector;
    if (data.departmentId !== undefined) updatePayload.departmentId = data.departmentId;
    if (data.priority !== undefined) updatePayload.priority = data.priority;
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.startDate !== undefined) updatePayload.startDate = data.startDate;
    if (data.estimatedEndDate !== undefined) updatePayload.estimatedEndDate = data.estimatedEndDate;
    if (data.actualEndDate !== undefined) updatePayload.actualEndDate = data.actualEndDate;
    if (data.completionPercentage !== undefined) updatePayload.completionPercentage = data.completionPercentage;
    if (data.budget !== undefined) updatePayload.budget = data.budget;
    if (data.healthStatus !== undefined) updatePayload.healthStatus = data.healthStatus;
    if (data.visibility !== undefined) updatePayload.visibility = data.visibility;
    if (data.tags !== undefined) updatePayload.tags = data.tags;

    const [updated] = await tx
      .update(projects)
      .set(updatePayload)
      .where(
        and(
          eq(projects.projectId, projectId),
          eq(projects.organizationId, user.organizationId),
          isNull(projects.deletedAt),
        ),
      )
      .returning();

    if (!updated) {
      throw new Error("Project not found");
    }

    await logActivity(
      "updated",
      projectId,
      user.userId,
      user.organizationId,
      {
        updatedFields: Object.keys(data),
      },
      tx,
    );

    return updated;
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
  offset: number = 0,
  status?: string,
  healthStatus?: string,
) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "projects", "read");

  const filters = [
    isNull(projects.deletedAt),
    eq(projects.organizationId, user.organizationId),
  ];
  if (query && query.trim().length > 0) {
    const q = `%${query.trim()}%`;
    filters.push(
      drizzleOr(
        ilike(projects.projectName, q),
        ilike(projects.projectCode, q),
      )!,
    );
  }
  if (status && status !== "all") {
    filters.push(eq(projects.status, status as any));
  }
  if (healthStatus && healthStatus !== "all") {
    filters.push(eq(projects.healthStatus, healthStatus as any));
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
      isNull(projects.deletedAt),
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
      .where(
        and(
          eq(projects.projectId, projectId),
          eq(projects.organizationId, user.organizationId),
        ),
      );

    // Cascade to project members
    await tx
      .update(projectMembers)
      .set({
        status: "archived",
      })
      .where(eq(projectMembers.projectId, projectId));

    await logActivity(
      "archived",
      projectId,
      user.userId,
      user.organizationId,
      undefined,
      tx,
    );
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
export async function getProjectDashboardSummary(
  projectId: string,
): Promise<ProjectDashboardSummary> {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "projects", "read");

  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.projectId, projectId),
      eq(projects.organizationId, user.organizationId),
    ),
    with: { client: true },
  });

  if (!project) throw new Error("Project not found");

  const projectTasks = await db.query.tasks.findMany({
    where: and(
      eq(tasks.projectId, projectId),
      eq(tasks.organizationId, user.organizationId),
      isNull(tasks.deletedAt),
    ),
    columns: {
      status: true,
      progress: true,
      dueDate: true,
    },
  });

  const totalTasks = projectTasks.length;
  const completedTasks = projectTasks.filter(
    (t) => t.status === "completed" || t.status === "approved",
  ).length;
  const openTasks = totalTasks - completedTasks;
  const pendingReviews = projectTasks.filter(
    (t) => t.status === "review" || t.status === "client_review",
  ).length;

  const calculatedProgress =
    totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : project.completionPercentage || 0;

  return {
    overallProgress: calculatedProgress,
    currentPhase: project.status,
    currentSprint: "Sprint 1",
    projectHealth: project.healthStatus,
    upcomingDeadline: project.estimatedEndDate?.toISOString() || null,
    pendingApprovals: 0,
    pendingReviews,
    openRevisions: 0,
    openTasks,
    completedTasks,
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
export async function addProjectMember(
  projectId: string,
  userId: string,
  role: string,
) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "projects", "update");

  // Basic check to ensure the project exists in this org
  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.projectId, projectId),
      eq(projects.organizationId, user.organizationId),
    ),
  });

  if (!project) throw new Error("Project not found");

  // `userId` names the person being added, not the caller — but it is still a
  // caller-supplied id, and nothing confirmed it belonged to this organisation.
  // Project membership is an authorization input elsewhere (see
  // `validateProjectMembership` in features/revisions), so an unchecked id here
  // writes a foreign identity into a table other checks read.
  const target = await db.query.users.findFirst({
    where: and(
      eq(users.userId, userId),
      eq(users.organizationId, user.organizationId),
      eq(users.status, "active"),
      isNull(users.deletedAt),
    ),
    columns: { userId: true },
  });
  if (!target) throw new Error("User not found");

  const [member] = await db
    .insert(projectMembers)
    .values({
      projectId,
      userId,
      role,
    })
    .returning();

  await logActivity(
    "member_added",
    projectId,
    user.userId,
    user.organizationId,
    {
      memberUserId: userId,
      role,
    },
  );

  revalidatePath(`/projects/${projectId}`);
  return member;
}

/**
 * Update a project member's role.
 */
export async function updateProjectMemberRole(memberId: string, role: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "projects", "update");

  const existing = await db.query.projectMembers.findFirst({
    where: eq(projectMembers.memberId, memberId),
    with: { project: true },
  });
  if (!existing || existing.project.organizationId !== user.organizationId) {
    throw new Error("Project member not found");
  }

  const [member] = await db
    .update(projectMembers)
    .set({ role })
    .where(eq(projectMembers.memberId, memberId))
    .returning();

  if (member) {
    await logActivity(
      "member_role_updated",
      member.projectId,
      user.userId,
      user.organizationId,
      {
        memberId,
        newRole: role,
      },
    );
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

  const existing = await db.query.projectMembers.findFirst({
    where: eq(projectMembers.memberId, memberId),
    with: { project: true },
  });
  if (!existing || existing.project.organizationId !== user.organizationId) {
    throw new Error("Project member not found");
  }

  const [member] = await db
    .delete(projectMembers)
    .where(eq(projectMembers.memberId, memberId))
    .returning();

  if (member) {
    await logActivity(
      "member_removed",
      member.projectId,
      user.userId,
      user.organizationId,
      {
        memberUserId: member.userId,
      },
    );
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
        not(inArray(projects.status, ["completed", "cancelled", "archived"])),
      ),
    );

  return result?.value ?? 0;
}
