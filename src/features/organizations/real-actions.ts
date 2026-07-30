"use server";

import { db } from "@/db";
import { activityLogs, organizations, roles, users } from "@/db/schema";
import { requireCurrentUser } from "@/features/auth/current-user";
import { requirePermission } from "@/features/permissions";
import { and, eq, sql } from "drizzle-orm";
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
    .where(eq(roles.roleId, parsed.roleId));
  if (!newRole) throw new Error("Role not found");

  const isRemovingOwner = newRole.roleKey !== "owner";
  await checkOwnerProtection(
    user.organizationId,
    parsed.userId,
    isRemovingOwner,
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
