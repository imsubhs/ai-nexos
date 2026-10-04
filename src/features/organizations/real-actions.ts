import { db } from "@/db";
import {
  activityLogs,
  organizationInvitations,
  organizationMemberships,
  organizations,
  roles,
  users,
} from "@/db/schema";
import { requireCurrentUser } from "@/features/auth/current-user";
import { requirePermission } from "@/features/permissions";
import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  normalizeOrganizationInput,
  updateOrganizationSchema,
  updateUserRoleSchema,
  userActionSchema,
} from "./schemas";

function logActivity(
  orgId: string,
  userId: string,
  action: string,
  entityId: string,
  entityType: string,
  description: string,
  metadata?: Record<string, unknown>,
) {
  return db.insert(activityLogs).values({
    organizationId: orgId,
    userId,
    module: "organization",
    action,
    entityType,
    entityId,
    description,
    metadata,
  });
}

export async function getOrganization() {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "organization", "read");

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.organizationId, user.organizationId));

  return org ?? null;
}

export async function updateOrganization(
  data: z.infer<typeof updateOrganizationSchema>,
) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "organization", "update");

  const parsed = normalizeOrganizationInput(
    updateOrganizationSchema.parse(data),
  );

  const [org] = await db
    .update(organizations)
    .set({
      ...parsed,
      updatedAt: new Date(),
      updatedBy: user.userId,
    })
    .where(eq(organizations.organizationId, user.organizationId))
    .returning();

  if (!org) throw new Error("Organization not found");

  await logActivity(
    user.organizationId,
    user.userId,
    "update",
    org.organizationId,
    "organization",
    "Updated organization profile",
    parsed,
  );

  revalidatePath("/settings/organization");
  return org;
}

export async function getRoles() {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "roles", "read");

  const orgRoles = await db.query.roles.findMany({
    where: eq(roles.organizationId, user.organizationId),
    orderBy: (roles, { asc, desc }) => [
      desc(roles.isSystem),
      asc(roles.roleName),
    ],
  });

  return orgRoles;
}

export async function getOrganizationMembers() {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "users", "read");

  const memberships = await db.query.organizationMemberships.findMany({
    where: and(
      eq(organizationMemberships.organizationId, user.organizationId),
      isNull(organizationMemberships.deletedAt),
    ),
    with: {
      user: true,
      role: true,
      department: true,
    },
    orderBy: (m, { asc }) => [asc(m.createdAt)],
  });

  if (memberships.length > 0) {
    return memberships.map((m) => ({
      userId: m.userId,
      organizationId: m.organizationId,
      email: m.user.email,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      avatarUrl: m.user.avatarUrl,
      status: m.status,
      roleId: m.roleId,
      departmentId: m.departmentId,
      designation: m.designation,
      createdAt: m.createdAt,
      role: m.role,
      department: m.department,
    }));
  }

  const members = await db.query.users.findMany({
    where: eq(users.organizationId, user.organizationId),
    with: {
      role: true,
      department: true,
    },
    orderBy: (users, { asc }) => [asc(users.createdAt)],
  });

  return members;
}

async function checkOwnerProtection(
  organizationId: string,
  userId: string,
  isRemovingOwnerRole: boolean,
) {
  const [targetUser] = await db
    .select({ roleKey: roles.roleKey, status: users.status })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.roleId))
    .where(
      and(eq(users.userId, userId), eq(users.organizationId, organizationId)),
    );

  if (!targetUser) throw new Error("User not found");

  if (
    targetUser.roleKey === "owner" &&
    targetUser.status === "active" &&
    isRemovingOwnerRole
  ) {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.roleId))
      .where(
        and(
          eq(users.organizationId, organizationId),
          eq(roles.roleKey, "owner"),
          eq(users.status, "active"),
        ),
      );

    if (result && result.count <= 1) {
      throw new Error("Cannot modify the last active owner");
    }
  }
}

export async function updateUserRole(
  data: z.infer<typeof updateUserRoleSchema>,
) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "roles", "update");

  const parsed = updateUserRoleSchema.parse(data);

  const [newRole] = await db
    .select()
    .from(roles)
    .where(
      and(
        eq(roles.roleId, parsed.roleId),
        eq(roles.organizationId, user.organizationId),
      ),
    );
  if (!newRole) throw new Error("Role not found");

  const isRemovingOwner = newRole.roleKey !== "owner";
  await checkOwnerProtection(
    user.organizationId,
    parsed.userId,
    isRemovingOwner,
  );

  await db
    .update(organizationMemberships)
    .set({
      roleId: parsed.roleId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(organizationMemberships.userId, parsed.userId),
        eq(organizationMemberships.organizationId, user.organizationId),
      ),
    );

  const [updatedUser] = await db
    .update(users)
    .set({
      roleId: parsed.roleId,
      updatedAt: new Date(),
      updatedBy: user.userId,
    })
    .where(
      and(
        eq(users.userId, parsed.userId),
        eq(users.organizationId, user.organizationId),
      ),
    )
    .returning();

  if (!updatedUser) throw new Error("User not found");

  await logActivity(
    user.organizationId,
    user.userId,
    "update",
    updatedUser.userId,
    "user",
    `Updated user role to ${newRole.roleName}`,
    { roleId: parsed.roleId },
  );

  revalidatePath("/settings/organization");
  return updatedUser;
}

export async function deactivateUser(data: z.infer<typeof userActionSchema>) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "users", "update");

  const parsed = userActionSchema.parse(data);

  if (parsed.userId === user.userId) {
    throw new Error("Cannot deactivate yourself");
  }

  await checkOwnerProtection(user.organizationId, parsed.userId, true);

  await db
    .update(organizationMemberships)
    .set({
      status: "suspended",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(organizationMemberships.userId, parsed.userId),
        eq(organizationMemberships.organizationId, user.organizationId),
      ),
    );

  const [updatedUser] = await db
    .update(users)
    .set({
      status: "inactive",
      updatedAt: new Date(),
      updatedBy: user.userId,
    })
    .where(
      and(
        eq(users.userId, parsed.userId),
        eq(users.organizationId, user.organizationId),
      ),
    )
    .returning();

  if (!updatedUser) throw new Error("User not found");

  await logActivity(
    user.organizationId,
    user.userId,
    "update",
    updatedUser.userId,
    "user",
    "Deactivated user",
  );

  revalidatePath("/settings/organization");
  return updatedUser;
}

export async function reactivateUser(data: z.infer<typeof userActionSchema>) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "users", "update");

  const parsed = userActionSchema.parse(data);

  await db
    .update(organizationMemberships)
    .set({
      status: "active",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(organizationMemberships.userId, parsed.userId),
        eq(organizationMemberships.organizationId, user.organizationId),
      ),
    );

  const [updatedUser] = await db
    .update(users)
    .set({
      status: "active",
      updatedAt: new Date(),
      updatedBy: user.userId,
    })
    .where(
      and(
        eq(users.userId, parsed.userId),
        eq(users.organizationId, user.organizationId),
      ),
    )
    .returning();

  if (!updatedUser) throw new Error("User not found");

  await logActivity(
    user.organizationId,
    user.userId,
    "update",
    updatedUser.userId,
    "user",
    "Reactivated user",
  );

  revalidatePath("/settings/organization");
  return updatedUser;
}

export type PendingInvitation = {
  invitationId: string;
  organizationId: string;
  email: string;
  roleId: string;
  roleName: string;
  roleKey: string;
  departmentId: string | null;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  invitedByName?: string | null;
};

export async function getPendingInvitations(): Promise<PendingInvitation[]> {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "users", "read");

  const pending = await db.query.organizationInvitations.findMany({
    where: and(
      eq(organizationInvitations.organizationId, user.organizationId),
      eq(organizationInvitations.status, "pending"),
    ),
    with: {
      role: true,
      department: true,
      invitedByUser: true,
    },
    orderBy: (invites, { desc }) => [desc(invites.createdAt)],
  });

  return pending.map((inv) => ({
    invitationId: inv.invitationId,
    organizationId: inv.organizationId,
    email: inv.email,
    roleId: inv.roleId,
    roleName: inv.role?.roleName ?? "Member",
    roleKey: inv.role?.roleKey ?? "member",
    departmentId: inv.departmentId,
    status: inv.status,
    expiresAt: inv.expiresAt,
    createdAt: inv.createdAt,
    invitedByName: inv.invitedByUser
      ? `${inv.invitedByUser.firstName ?? ""} ${inv.invitedByUser.lastName ?? ""}`.trim() || inv.invitedByUser.email
      : null,
  }));
}
