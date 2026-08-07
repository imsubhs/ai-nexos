"use server";

import * as real from "./real-actions";
import * as mock from "./mock-actions";
import { isDemoMode } from "@/lib/env.server";

export async function getOrganization(
  ...args: Parameters<typeof real.getOrganization>
): Promise<Awaited<ReturnType<typeof real.getOrganization>>> {
  if (isDemoMode()) return (mock as any).getOrganization(...args);
  return (real as any).getOrganization(...args);
}

export async function updateOrganization(
  ...args: Parameters<typeof real.updateOrganization>
): Promise<Awaited<ReturnType<typeof real.updateOrganization>>> {
  if (isDemoMode()) return (mock as any).updateOrganization(...args);
  return (real as any).updateOrganization(...args);
}

export type RoleRow = {
  roleId: string;
  organizationId: string;
  roleName: string;
  roleKey: string;
  description: string | null;
  permissions: Record<string, string[]>;
  isSystem: boolean;
};

export async function getRoles(): Promise<RoleRow[]> {
  if (isDemoMode()) return (mock as any).getRoles();
  return (real as any).getRoles();
}

export async function getOrganizationMembers(
  ...args: Parameters<typeof real.getOrganizationMembers>
): Promise<Awaited<ReturnType<typeof real.getOrganizationMembers>>> {
  if (isDemoMode()) return (mock as any).getOrganizationMembers(...args);
  return (real as any).getOrganizationMembers(...args);
}

export async function updateUserRole(
  ...args: Parameters<typeof real.updateUserRole>
): Promise<Awaited<ReturnType<typeof real.updateUserRole>>> {
  if (isDemoMode()) return (mock as any).updateUserRole(...args);
  return (real as any).updateUserRole(...args);
}

export async function deactivateUser(
  ...args: Parameters<typeof real.deactivateUser>
): Promise<Awaited<ReturnType<typeof real.deactivateUser>>> {
  if (isDemoMode()) return (mock as any).deactivateUser(...args);
  return (real as any).deactivateUser(...args);
}

export async function reactivateUser(
  ...args: Parameters<typeof real.reactivateUser>
): Promise<Awaited<ReturnType<typeof real.reactivateUser>>> {
  if (isDemoMode()) return (mock as any).reactivateUser(...args);
  return (real as any).reactivateUser(...args);
}
