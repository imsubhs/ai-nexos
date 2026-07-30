"use server";

import { getDemoStore, logDemoActivity } from "@/lib/demo/store";
import { requireCurrentUser } from "@/features/auth/current-user";
import { requirePermission } from "@/features/permissions";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  normalizeOrganizationInput,
  updateOrganizationSchema,
  updateUserRoleSchema,
  userActionSchema,
} from "./schemas";
import { SYSTEM_ROLES } from "@/features/permissions/constants";

export async function getOrganization() {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "organization", "read");

  const store = getDemoStore();
  const org = store.organizations.find((o) => o.organizationId === user.organizationId);

  return org ?? null;
}

export async function updateOrganization(data: z.infer<typeof updateOrganizationSchema>) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "organization", "update");

  const parsed = normalizeOrganizationInput(updateOrganizationSchema.parse(data));
  const store = getDemoStore();
  
  const orgIndex = store.organizations.findIndex((o) => o.organizationId === user.organizationId);
  if (orgIndex === -1) throw new Error("Organization not found");

  const org = store.organizations[orgIndex];
  store.organizations[orgIndex] = {
    ...org,
    ...parsed,
    updatedAt: new Date(),
    updatedBy: user.userId,
  };

  logDemoActivity(
    store,
    "organization",
    "update",
    "organization",
    org.organizationId,
    "Updated organization profile",
    parsed
  );

  revalidatePath("/settings/organization");
  return store.organizations[orgIndex];
}

export async function getRoles() {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "roles", "read");

  // Mirror the real action's row shape (roles table) from SYSTEM_ROLES,
  // matching the "demo-role-<key>" ids used by the demo store's users.
  return SYSTEM_ROLES.map((r) => ({
    roleId: `demo-role-${r.roleKey}`,
    organizationId: user.organizationId,
    roleName: r.roleName,
    roleKey: r.roleKey,
    description: r.description,
    permissions: r.permissions as Record<string, string[]>,
    isSystem: true,
  }));
}

export async function getOrganizationMembers() {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "users", "read");

  const store = getDemoStore();
  const members = store.users.filter((u) => u.organizationId === user.organizationId);
  
  return members.map(m => {
    const roleKey = m.roleId.replace("demo-role-", "");
    const systemRole = SYSTEM_ROLES.find(r => r.roleKey === roleKey);
    return {
      ...m,
      role: systemRole ? { roleId: m.roleId, roleName: systemRole.roleName, roleKey: systemRole.roleKey } : null,
      department: null,
    };
  });
}

export async function checkOwnerProtectionMock(store: any, organizationId: string, userId: string, isRemovingOwnerRole: boolean) {
  const targetUser = store.users.find((u: any) => u.userId === userId && u.organizationId === organizationId);
  if (!targetUser) throw new Error("User not found");

  const roleKey = targetUser.roleId.replace("demo-role-", "");
  
  if (roleKey === "owner" && targetUser.status === "active" && isRemovingOwnerRole) {
    const activeOwners = store.users.filter((u: any) => 
      u.organizationId === organizationId && 
      u.roleId === "demo-role-owner" && 
      u.status === "active"
    );

    if (activeOwners.length <= 1) {
      throw new Error("Cannot modify the last active owner");
    }
  }
}

export async function updateUserRole(data: z.infer<typeof updateUserRoleSchema>) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "roles", "update");

  const parsed = updateUserRoleSchema.parse(data);
  const store = getDemoStore();

  const isRemovingOwner = parsed.roleId !== "demo-role-owner";
  checkOwnerProtectionMock(store, user.organizationId, parsed.userId, isRemovingOwner);

  const targetIndex = store.users.findIndex((u) => u.userId === parsed.userId && u.organizationId === user.organizationId);
  if (targetIndex === -1) throw new Error("User not found");

  store.users[targetIndex] = {
    ...store.users[targetIndex],
    roleId: parsed.roleId,
    updatedAt: new Date(),
    updatedBy: user.userId,
  };

  logDemoActivity(
    store,
    "user",
    "update",
    "user",
    parsed.userId,
    `Updated user role`,
    { roleId: parsed.roleId }
  );

  revalidatePath("/settings/organization");
  return store.users[targetIndex];
}

export async function deactivateUser(data: z.infer<typeof userActionSchema>) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "users", "update");

  const parsed = userActionSchema.parse(data);

  if (parsed.userId === user.userId) {
    throw new Error("Cannot deactivate yourself");
  }

  const store = getDemoStore();
  checkOwnerProtectionMock(store, user.organizationId, parsed.userId, true);

  const targetIndex = store.users.findIndex((u) => u.userId === parsed.userId && u.organizationId === user.organizationId);
  if (targetIndex === -1) throw new Error("User not found");

  store.users[targetIndex] = {
    ...store.users[targetIndex],
    status: "inactive",
    updatedAt: new Date(),
    updatedBy: user.userId,
  };

  logDemoActivity(
    store,
    "user",
    "update",
    "user",
    parsed.userId,
    "Deactivated user"
  );

  revalidatePath("/settings/organization");
  return store.users[targetIndex];
}

export async function reactivateUser(data: z.infer<typeof userActionSchema>) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "users", "update");

  const parsed = userActionSchema.parse(data);
  const store = getDemoStore();

  const targetIndex = store.users.findIndex((u) => u.userId === parsed.userId && u.organizationId === user.organizationId);
  if (targetIndex === -1) throw new Error("User not found");

  store.users[targetIndex] = {
    ...store.users[targetIndex],
    status: "active",
    updatedAt: new Date(),
    updatedBy: user.userId,
  };

  logDemoActivity(
    store,
    "user",
    "update",
    "user",
    parsed.userId,
    "Reactivated user"
  );

  revalidatePath("/settings/organization");
  return store.users[targetIndex];
}
