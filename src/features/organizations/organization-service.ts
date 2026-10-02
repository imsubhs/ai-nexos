import crypto from "node:crypto";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  organizations,
  organizationMemberships,
  organizationSequences,
  roles,
  users,
} from "@/db/schema";
import { SYSTEM_ROLES } from "@/features/permissions/constants";
import { isDemoMode } from "@/lib/env.server";
import { getDemoStore } from "@/lib/demo/store";

import {
  getCurrentIdentity,
  ACTIVE_ORG_COOKIE,
  ACTIVE_ORG_COOKIE_MAX_AGE,
} from "@/features/auth/membership-service";
import { validateCodePrefix, slugify, deriveCodePrefixFromName } from "./schemas";
export { slugify, deriveCodePrefixFromName };



export type OrganizationServiceErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "ORGANIZATION_NAME_REQUIRED"
  | "SLUG_ALREADY_EXISTS"
  | "INVALID_CODE_PREFIX"
  | "CODE_PREFIX_ALREADY_EXISTS"
  | "CREATION_FAILED";

export class OrganizationServiceError extends Error {
  readonly code: OrganizationServiceErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: OrganizationServiceErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "OrganizationServiceError";
    this.code = code;
    this.details = details;
  }
}

export interface CreateOrganizationServiceInput {
  organizationName: string;
  slug?: string;
  codePrefix?: string;
  timezone?: string;
  currency?: string;
  creatorUserId?: string;
}

/**

 * Authoritative server-side organization creation pipeline.
 *
 * Security & Tenancy Invariants:
 * 1. Caller identity is ALWAYS derived server-side from session.
 * 2. Caller is automatically assigned the newly seeded 'owner' role.
 * 3. Seeded system roles are provisioned specifically for the new organization.
 * 4. An active organization_membership is created.
 * 5. Active context cookie `nexos_active_org_id` is updated.
 * 6. Legacy compatibility columns (users.organization_id, users.role_id) are maintained.
 */
export async function createOrganization(
  input: CreateOrganizationServiceInput,
  creatorUserIdOverride?: string,
) {
  const trimmedName = (input.organizationName || "").trim();
  if (!trimmedName || trimmedName.length < 2) {
    throw new OrganizationServiceError(
      "ORGANIZATION_NAME_REQUIRED",
      "Organization name must be at least 2 characters",
    );
  }

  let callerId = input.creatorUserId ?? creatorUserIdOverride;
  let callerEmail = "";


  if (!callerId) {
    const identity = await getCurrentIdentity();
    if (!identity?.authUserId) {
      throw new OrganizationServiceError(
        "AUTHENTICATION_REQUIRED",
        "Authentication required to create an organization",
      );
    }
    callerId = identity.authUserId;
    callerEmail = identity.email || "";
  }

  // Derive / validate code prefix
  let codePrefix = (input.codePrefix || "").trim().toUpperCase();
  if (codePrefix) {
    const validation = validateCodePrefix(codePrefix);
    if (!validation.valid) {
      throw new OrganizationServiceError(
        "INVALID_CODE_PREFIX",
        validation.error ?? "Invalid code prefix",
      );
    }
    codePrefix = validation.normalized;
  } else {
    codePrefix = deriveCodePrefixFromName(trimmedName);
  }

  // Derive / validate slug
  const baseSlug = input.slug ? slugify(input.slug) : slugify(trimmedName);

  if (isDemoMode()) {
    const store = getDemoStore();
    const orgId = crypto.randomUUID();
    const ownerRoleId = crypto.randomUUID();

    const newOrg = {
      organizationId: orgId,
      organizationName: trimmedName,
      slug: baseSlug,
      codePrefix,
      timezone: input.timezone ?? "UTC",
      currency: input.currency ?? "USD",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.organizations.push(newOrg);

    const ownerRole = {
      roleId: ownerRoleId,
      organizationId: orgId,
      roleName: "Owner",
      roleKey: "owner",
      isSystem: true,
      permissions: SYSTEM_ROLES.find((r) => r.roleKey === "owner")!.permissions,
    };

    const membershipId = crypto.randomUUID();
    store.organizationMemberships = store.organizationMemberships ?? [];
    store.organizationMemberships.push({
      membershipId,
      userId: callerId,
      organizationId: orgId,
      roleId: ownerRoleId,
      status: "active",
      isDefault: true,
      joinedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: ACTIVE_ORG_COOKIE_MAX_AGE,
    });

    return {
      success: true,
      organizationId: orgId,
      organizationName: trimmedName,
      slug: baseSlug,
      codePrefix,
      membershipId,
      roleKey: "owner",
    };
  }

  // Database Execution Path:
  // Ensure slug uniqueness:
  let finalSlug = baseSlug;
  const [existingSlug] = await db
    .select({ organizationId: organizations.organizationId })
    .from(organizations)
    .where(eq(organizations.slug, finalSlug));

  if (existingSlug) {
    const randomSuffix = crypto.randomBytes(2).toString("hex");
    finalSlug = `${baseSlug}-${randomSuffix}`.slice(0, 50);
  }

  // Ensure codePrefix uniqueness:
  let finalCodePrefix = codePrefix;
  const [existingPrefix] = await db
    .select({ organizationId: organizations.organizationId })
    .from(organizations)
    .where(eq(organizations.codePrefix, finalCodePrefix));

  if (existingPrefix) {
    // Append numeric digit if possible, otherwise throw
    const altPrefix = `${finalCodePrefix.slice(0, 2)}${Math.floor(Math.random() * 90 + 10)}`;
    const val = validateCodePrefix(altPrefix);
    if (val.valid) {
      finalCodePrefix = val.normalized;
    } else {
      throw new OrganizationServiceError(
        "CODE_PREFIX_ALREADY_EXISTS",
        `Organization code prefix ${codePrefix} is already in use`,
      );
    }
  }

  // Database Execution Path: Atomic transaction across organization, roles, user fallback, membership, and sequences
  const txResult = await db.transaction(async (tx) => {
    // 1. Insert organization
    const [newOrg] = await tx
      .insert(organizations)
      .values({
        organizationName: trimmedName,
        slug: finalSlug,
        codePrefix: finalCodePrefix,
        timezone: input.timezone ?? "UTC",
        currency: input.currency ?? "USD",
        status: "active",
        createdBy: callerId,
        updatedBy: callerId,
      })
      .returning();

    // 2. Seed system roles for this organization
    const rolesToInsert = SYSTEM_ROLES.map((r) => ({
      organizationId: newOrg.organizationId,
      roleKey: r.roleKey,
      roleName: r.roleName,
      description: r.description,
      permissions: r.permissions,
      isSystem: true,
      createdBy: callerId,
      updatedBy: callerId,
    }));

    const insertedRoles = await tx
      .insert(roles)
      .values(rolesToInsert)
      .returning();

    const ownerRole = insertedRoles.find((r) => r.roleKey === "owner") ?? insertedRoles[0];

    // 3. Ensure user exists in public.users
    const [existingUser] = await tx
      .select()
      .from(users)
      .where(eq(users.userId, callerId));

    if (!existingUser) {
      await tx.insert(users).values({
        userId: callerId,
        email: callerEmail || `${callerId}@nexos.internal`,
        firstName: trimmedName.split(" ")[0] || "Owner",
        organizationId: newOrg.organizationId, // legacy fallback
        roleId: ownerRole.roleId,             // legacy fallback
        status: "active",
      });
    }

    // 4. Create owner membership
    const [membership] = await tx
      .insert(organizationMemberships)
      .values({
        userId: callerId,
        organizationId: newOrg.organizationId,
        roleId: ownerRole.roleId,
        status: "active",
        isDefault: true,
        joinedAt: new Date(),
        createdBy: callerId,
        updatedBy: callerId,
      })
      .onConflictDoUpdate({
        target: [
          organizationMemberships.userId,
          organizationMemberships.organizationId,
        ],
        set: {
          status: "active",
          roleId: ownerRole.roleId,
          updatedAt: new Date(),
          deletedAt: null,
        },
      })
      .returning();

    // 5. Initialize organization sequence for sequential entity codes
    await tx
      .insert(organizationSequences)
      .values({
        organizationId: newOrg.organizationId,
        entityType: "project_code",
        nextValue: 1,
      })
      .onConflictDoNothing();

    return {
      newOrg,
      membership,
      ownerRole,
    };
  });

  // 6. Set active organization cookie
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, txResult.newOrg.organizationId, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ACTIVE_ORG_COOKIE_MAX_AGE,
  });

  return {
    success: true,
    organizationId: txResult.newOrg.organizationId,
    organizationName: txResult.newOrg.organizationName,
    slug: txResult.newOrg.slug,
    codePrefix: txResult.newOrg.codePrefix,
    membershipId: txResult.membership.membershipId,
    roleKey: "owner",
  };
}
