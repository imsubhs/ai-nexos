import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, isNull, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import {
  organizations,
  organizationMemberships,
  roles,
  users,
} from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/env.server";
import { getDemoStore } from "@/lib/demo/store";
import type { PermissionMap } from "@/features/permissions";
import { SYSTEM_ROLES } from "@/features/permissions/constants";
import { resolveTimeZone } from "@/features/workforce/shared/business-day";
import { DEMO_SESSION_COOKIE, isDemoSessionValue } from "./demo-session";
import type { MembershipStatus } from "@/db/schema/organization-memberships";

export const ACTIVE_ORG_COOKIE = "nexos_active_org_id";
export const ACTIVE_ORG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export type MembershipErrorCode =
  | "MEMBERSHIP_NOT_FOUND"
  | "MEMBERSHIP_INACTIVE"
  | "ORGANIZATION_UNAUTHORIZED"
  | "AUTHENTICATION_REQUIRED"
  | "INVALID_ORGANIZATION_ID";

export class MembershipError extends Error {
  readonly code: MembershipErrorCode;
  readonly organizationId?: string;
  readonly userId?: string;

  constructor(
    code: MembershipErrorCode,
    message: string,
    details?: { organizationId?: string; userId?: string },
  ) {
    super(message);
    this.name = "MembershipError";
    this.code = code;
    this.organizationId = details?.organizationId;
    this.userId = details?.userId;
  }
}

export interface TenantContext {
  readonly userId: string;
  readonly organizationId: string;
  readonly membershipId: string;
  readonly roleId: string;
  readonly roleKey: string;
  readonly roleName: string;
  readonly permissions: PermissionMap;
  readonly organizationName: string;
  readonly organizationSlug: string;
  readonly organizationCodePrefix: string;
  readonly organizationTimezone: string;
  readonly organizationLogoUrl: string | null;
}

export interface MembershipRecord {
  id: string;
  membershipId: string;
  userId: string;
  organizationId: string;
  roleId: string;
  roleKey: string;
  roleName: string;
  permissions: PermissionMap;
  departmentId: string | null;
  designation: string | null;
  status: MembershipStatus;
  isDefault: boolean;
  organizationName: string;
  organizationSlug: string;
  organizationCodePrefix: string;
  organizationTimezone: string;
  organizationLogoUrl: string | null;
  joinedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(id: unknown): id is string {
  return typeof id === "string" && UUID_REGEX.test(id);
}

/**
 * Stage C Identity Abstraction: Resolves current authenticated user identity
 * from Supabase Auth (`auth.users`) and public profile (`public.users`).
 */
export async function getCurrentIdentity() {
  const cookieStore = await cookies();
  const isDemo =
    isDemoMode() &&
    isDemoSessionValue(cookieStore.get(DEMO_SESSION_COOKIE)?.value);

  if (isDemo) {
    const store = getDemoStore();
    const demoUser = store.users.find(
      (u: { userId: string }) => u.userId === "00000000-0000-4000-8000-00000000f002",
    );
    return {
      authUserId: "00000000-0000-4000-8000-00000000f002",
      email: demoUser?.email ?? "admin@demo.local",
      user: demoUser ?? null,
      isDemo: true,
    };
  }

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const [profile] = await db
    .select()
    .from(users)
    .where(and(eq(users.userId, authUser.id), isNull(users.deletedAt)));

  return {
    authUserId: authUser.id,
    email: authUser.email ?? profile?.email ?? "",
    user: profile ?? null,
    isDemo: false,
  };
}

/**
 * Returns all organization memberships held by a user.
 */
export async function getUserMemberships(
  userId: string,
): Promise<MembershipRecord[]> {
  if (!isValidUuid(userId)) return [];

  if (isDemoMode()) {
    const store = getDemoStore();
    const rows = (store.organizationMemberships ?? []).filter(
      (m: { userId: string }) => m.userId === userId,
    );

    return rows.map((m: any) => {
      const org = store.organizations.find(
        (o: { organizationId: string }) => o.organizationId === m.organizationId,
      );
      const role = SYSTEM_ROLES.find(
        (r) => r.roleKey === (m.roleId?.replace("demo-role-", "") ?? "owner"),
      );

      return {
        id: m.membershipId,
        membershipId: m.membershipId,
        userId: m.userId,
        organizationId: m.organizationId,
        roleId: m.roleId,
        roleKey: role?.roleKey ?? "owner",
        roleName: role?.roleName ?? "Owner",
        permissions: (role?.permissions ?? {}) as PermissionMap,
        departmentId: m.departmentId ?? null,
        designation: m.designation ?? null,
        status: m.status as MembershipStatus,
        isDefault: Boolean(m.isDefault),
        organizationName: org?.organizationName ?? "Demo Studio",
        organizationSlug: org?.slug ?? "demo-workspace",
        organizationCodePrefix: org?.codePrefix ?? "NEX",
        organizationTimezone: resolveTimeZone(org?.timezone ?? "UTC"),
        organizationLogoUrl: org?.logoUrl ?? null,
        joinedAt: m.joinedAt ? new Date(m.joinedAt) : null,
        createdAt: new Date(m.createdAt),
        updatedAt: new Date(m.updatedAt),
      };
    });
  }

  const rows = await db
    .select({
      membershipId: organizationMemberships.membershipId,
      userId: organizationMemberships.userId,
      organizationId: organizationMemberships.organizationId,
      roleId: organizationMemberships.roleId,
      departmentId: organizationMemberships.departmentId,
      designation: organizationMemberships.designation,
      status: organizationMemberships.status,
      isDefault: organizationMemberships.isDefault,
      joinedAt: organizationMemberships.joinedAt,
      createdAt: organizationMemberships.createdAt,
      updatedAt: organizationMemberships.updatedAt,
      roleKey: roles.roleKey,
      roleName: roles.roleName,
      permissions: roles.permissions,
      organizationName: organizations.organizationName,
      organizationSlug: organizations.slug,
      organizationCodePrefix: organizations.codePrefix,
      organizationTimezone: organizations.timezone,
      organizationLogoUrl: organizations.logoUrl,
    })
    .from(organizationMemberships)
    .innerJoin(roles, eq(organizationMemberships.roleId, roles.roleId))
    .innerJoin(
      organizations,
      eq(organizationMemberships.organizationId, organizations.organizationId),
    )
    .where(
      and(
        eq(organizationMemberships.userId, userId),
        isNull(organizationMemberships.deletedAt),
      ),
    )
    .orderBy(
      organizationMemberships.isDefault,
      organizationMemberships.createdAt,
    );

  return rows.map((r) => ({
    id: r.membershipId,
    membershipId: r.membershipId,
    userId: r.userId,
    organizationId: r.organizationId,
    roleId: r.roleId,
    roleKey: r.roleKey,
    roleName: r.roleName,
    permissions: r.permissions as PermissionMap,
    departmentId: r.departmentId,
    designation: r.designation,
    status: r.status,
    isDefault: r.isDefault,
    organizationName: r.organizationName,
    organizationSlug: r.organizationSlug,
    organizationCodePrefix: r.organizationCodePrefix,
    organizationTimezone: resolveTimeZone(r.organizationTimezone),
    organizationLogoUrl: r.organizationLogoUrl,
    joinedAt: r.joinedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

/**
 * Returns a specific membership record for a (userId, organizationId) pair, or null.
 */
export async function getMembership(
  userId: string,
  organizationId: string,
): Promise<MembershipRecord | null> {
  if (!isValidUuid(userId) || !isValidUuid(organizationId)) return null;

  const memberships = await getUserMemberships(userId);
  return (
    memberships.find((m) => m.organizationId === organizationId) ?? null
  );
}

/**
 * Requires membership to exist; throws MembershipError if not found.
 */
export async function requireMembership(
  userId: string,
  organizationId: string,
): Promise<MembershipRecord> {
  const membership = await getMembership(userId, organizationId);
  if (!membership) {
    throw new MembershipError(
      "MEMBERSHIP_NOT_FOUND",
      `User ${userId} does not have a membership in organization ${organizationId}`,
      { userId, organizationId },
    );
  }
  return membership;
}

/**
 * Requires active membership; throws MembershipError if inactive, suspended, or missing.
 */
export async function requireActiveMembership(
  userId: string,
  organizationId: string,
): Promise<MembershipRecord> {
  const membership = await requireMembership(userId, organizationId);
  if (membership.status !== "active") {
    throw new MembershipError(
      "MEMBERSHIP_INACTIVE",
      `Membership in organization ${organizationId} is not active (status: ${membership.status})`,
      { userId, organizationId },
    );
  }
  return membership;
}

/**
 * Stage D: Authoritative Active Organization Context Resolution.
 *
 * Evaluation Order:
 * 1. Authenticated user
 * 2. If requestedOrgId supplied:
 *    - MUST have valid ACTIVE membership in requestedOrgId.
 *    - If unauthorized or inactive -> REJECT immediately (never switch silently!).
 * 3. If requestedOrgId NOT supplied:
 *    - Read `nexos_active_org_id` cookie.
 *    - If valid active membership -> return context.
 *    - If cookie invalid/stale -> clear cookie and fall back.
 * 4. Fallback:
 *    - Default active membership (`is_default = true`).
 *    - If none, first active membership.
 *    - If none -> return null (caller routes to /unprovisioned).
 */
export async function resolveActiveOrganizationContext(
  userId: string,
  requestedOrgId?: string | null,
): Promise<TenantContext | null> {
  if (!isValidUuid(userId)) return null;

  const memberships = await getUserMemberships(userId);
  const activeMemberships = memberships.filter((m) => m.status === "active");

  // If a specific organization was requested by caller/action:
  if (requestedOrgId !== undefined && requestedOrgId !== null) {
    if (!isValidUuid(requestedOrgId)) {
      throw new MembershipError(
        "INVALID_ORGANIZATION_ID",
        "Requested organization ID is not a valid UUID",
        { userId, organizationId: String(requestedOrgId) },
      );
    }

    const targetMembership = activeMemberships.find(
      (m) => m.organizationId === requestedOrgId,
    );

    if (!targetMembership) {
      const anyMembership = memberships.find(
        (m) => m.organizationId === requestedOrgId,
      );
      if (anyMembership) {
        throw new MembershipError(
          "MEMBERSHIP_INACTIVE",
          `Access rejected: Membership in organization ${requestedOrgId} is ${anyMembership.status}`,
          { userId, organizationId: requestedOrgId },
        );
      }
      throw new MembershipError(
        "ORGANIZATION_UNAUTHORIZED",
        `Access rejected: User does not belong to organization ${requestedOrgId}`,
        { userId, organizationId: requestedOrgId },
      );
    }

    return {
      userId: targetMembership.userId,
      organizationId: targetMembership.organizationId,
      membershipId: targetMembership.membershipId,
      roleId: targetMembership.roleId,
      roleKey: targetMembership.roleKey,
      roleName: targetMembership.roleName,
      permissions: targetMembership.permissions,
      organizationName: targetMembership.organizationName,
      organizationSlug: targetMembership.organizationSlug,
      organizationCodePrefix: targetMembership.organizationCodePrefix,
      organizationTimezone: targetMembership.organizationTimezone,
      organizationLogoUrl: targetMembership.organizationLogoUrl,
    };
  }

  // No specific organization requested — check active cookie:
  const cookieStore = await cookies();
  const cookieOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;

  if (cookieOrgId && isValidUuid(cookieOrgId)) {
    const cookieMembership = activeMemberships.find(
      (m) => m.organizationId === cookieOrgId,
    );
    if (cookieMembership) {
      return {
        userId: cookieMembership.userId,
        organizationId: cookieMembership.organizationId,
        membershipId: cookieMembership.membershipId,
        roleId: cookieMembership.roleId,
        roleKey: cookieMembership.roleKey,
        roleName: cookieMembership.roleName,
        permissions: cookieMembership.permissions,
        organizationName: cookieMembership.organizationName,
        organizationSlug: cookieMembership.organizationSlug,
        organizationCodePrefix: cookieMembership.organizationCodePrefix,
        organizationTimezone: cookieMembership.organizationTimezone,
        organizationLogoUrl: cookieMembership.organizationLogoUrl,
      };
    }
  }

  // Fallback to default or first active membership:
  if (activeMemberships.length === 0) return null;

  const defaultMembership =
    activeMemberships.find((m) => m.isDefault) ?? activeMemberships[0];

  return {
    userId: defaultMembership.userId,
    organizationId: defaultMembership.organizationId,
    membershipId: defaultMembership.membershipId,
    roleId: defaultMembership.roleId,
    roleKey: defaultMembership.roleKey,
    roleName: defaultMembership.roleName,
    permissions: defaultMembership.permissions,
    organizationName: defaultMembership.organizationName,
    organizationSlug: defaultMembership.organizationSlug,
    organizationCodePrefix: defaultMembership.organizationCodePrefix,
    organizationTimezone: defaultMembership.organizationTimezone,
    organizationLogoUrl: defaultMembership.organizationLogoUrl,
  };
}

/**
 * Request-scoped resolution of current tenant context.
 * Cached per request via React cache().
 */
export const getCurrentOrganizationContext = cache(
  async (): Promise<TenantContext | null> => {
    const identity = await getCurrentIdentity();
    if (!identity?.authUserId) return null;
    return resolveActiveOrganizationContext(identity.authUserId);
  },
);

/**
 * Guard: Requires active tenant context. Redirects unauthenticated to /login,
 * unaffiliated to /unprovisioned.
 */
export async function requireCurrentTenantContext(): Promise<TenantContext> {
  const identity = await getCurrentIdentity();
  if (!identity?.authUserId) redirect("/login");

  const context = await getCurrentOrganizationContext();
  if (!context) redirect("/unprovisioned");

  return context;
}

/**
 * Switching Action Service Foundation:
 * 1. Authenticate user.
 * 2. Validate requested organization ID.
 * 3. Look up membership (MUST be active).
 * 4. Set HTTP-only secure cookie `nexos_active_org_id`.
 * 5. Return success.
 */
export async function switchActiveOrganization(targetOrgId: string) {
  const identity = await getCurrentIdentity();
  if (!identity?.authUserId) {
    throw new MembershipError(
      "AUTHENTICATION_REQUIRED",
      "Authentication required to switch organizations",
    );
  }

  if (!isValidUuid(targetOrgId)) {
    throw new MembershipError(
      "INVALID_ORGANIZATION_ID",
      "Invalid organization ID",
      { organizationId: String(targetOrgId) },
    );
  }

  const membership = await requireActiveMembership(
    identity.authUserId,
    targetOrgId,
  );

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, targetOrgId, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ACTIVE_ORG_COOKIE_MAX_AGE,
  });

  return {
    success: true,
    organizationId: membership.organizationId,
    membershipId: membership.membershipId,
  };
}

/**
 * Clears the active organization cookie.
 */
export async function clearActiveOrganizationCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_ORG_COOKIE);
}

/**
 * Stage B Backfill Utility:
 * Populates `organization_memberships` from existing users having `organization_id IS NOT NULL`.
 * Deterministic, idempotent, collision-safe.
 */
export async function backfillUserMemberships(dbInstance = db) {
  const usersToBackfill = await dbInstance
    .select({
      userId: users.userId,
      organizationId: users.organizationId,
      roleId: users.roleId,
      departmentId: users.departmentId,
      designation: users.designation,
      employmentType: users.employmentType,
      workingHours: users.workingHours,
      status: users.status,
      deletedAt: users.deletedAt,
      deletedBy: users.deletedBy,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(and(isNotNull(users.organizationId), isNotNull(users.roleId)));

  if (usersToBackfill.length === 0) {
    return { backfilledCount: 0 };
  }

  const valuesToInsert = usersToBackfill.map((u) => {
    const isUserActive = u.status === "active" && !u.deletedAt;
    return {
      userId: u.userId,
      organizationId: u.organizationId,
      roleId: u.roleId,
      departmentId: u.departmentId,
      designation: u.designation,
      employmentType: u.employmentType ?? ("full_time" as const),
      workingHours: u.workingHours,
      status: (isUserActive ? "active" : "suspended") as MembershipStatus,
      isDefault: true,
      joinedAt: u.createdAt,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      deletedAt: u.deletedAt ?? null,
      deletedBy: u.deletedBy ?? null,
    };
  });

  const inserted = await dbInstance
    .insert(organizationMemberships)
    .values(valuesToInsert)
    .onConflictDoNothing({
      target: [
        organizationMemberships.userId,
        organizationMemberships.organizationId,
      ],
    })
    .returning();

  return {
    backfilledCount: inserted.length,
  };
}
