"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createOrganization,
  slugify,
  OrganizationServiceError,
} from "./organization-service";
import {
  acceptInvitation,
  createInvitation,
  getInvitationByToken,
  revokeInvitation,
  hashInvitationToken,
  InvitationError,
  type InvitationPreview,
} from "./invitation-service";
import {
  switchActiveOrganization,
  requireActiveMembership,
  getUserMemberships,
  MembershipError,
} from "@/features/auth/membership-service";
import { requireCurrentUser } from "@/features/auth/current-user";
import { requirePermission } from "@/features/permissions";

import {
  createOrganizationSchema,
  acceptInvitationSchema,
  previewInvitationSchema,
  switchOrganizationSchema,
  createInvitationSchema,
} from "./schemas";

import {
  RATE_LIMITS,
  consumeRateLimit,
  tokenPrefixBucket,
} from "@/lib/security/rate-limit";
import { resolveGuardContext, KeyResolvers } from "@/lib/security/action-guard";

export type ActionResponse<T = Record<string, unknown>> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Server Action: Create a new organization workspace.
 * Authenticates caller and provisions owner membership.
 * Enforces S6.2 ORG_CREATION policy (3 / 24h) with fail-closed semantics on Redis failure.
 */
export async function createOrganizationAction(data: {
  organizationName: string;
  slug?: string;
  codePrefix?: string;
}): Promise<ActionResponse<{ organizationId: string; slug: string }>> {
  try {
    const context = await resolveGuardContext();
    const identifier = KeyResolvers.userOrIp([], context);
    const decision = await consumeRateLimit(
      RATE_LIMITS.orgCreation,
      identifier,
    );
    if (!decision.allowed) {
      const errorMsg =
        decision.reason === "storage_unavailable_fail_closed"
          ? "Organization creation is temporarily unavailable due to system maintenance. Please try again later."
          : `Too many organization creation requests. Please try again in ${decision.retryAfterSeconds}s.`;
      return { success: false, error: errorMsg };
    }

    const parsed = createOrganizationSchema.parse(data);
    const result = await createOrganization(parsed);

    revalidatePath("/dashboard");
    revalidatePath("/onboarding");
    return {
      success: true,
      data: {
        organizationId: result.organizationId,
        slug: result.slug,
      },
    };
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return {
        success: false,
        error: err.issues[0]?.message ?? "Invalid input",
      };
    }
    if (err instanceof OrganizationServiceError) {
      return { success: false, error: err.message };
    }
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to create organization",
    };
  }
}

/**
 * Server Action: Accept an invitation via raw token.
 */
export async function acceptInvitationAction(data: {
  rawToken: string;
}): Promise<ActionResponse<{ organizationId: string }>> {
  try {
    const parsed = acceptInvitationSchema.parse(data);
    const result = await acceptInvitation(parsed.rawToken);
    revalidatePath("/dashboard");
    revalidatePath("/onboarding");

    return {
      success: true,
      data: { organizationId: result.organizationId },
    };
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return {
        success: false,
        error: err.issues[0]?.message ?? "Invalid input",
      };
    }
    if (err instanceof InvitationError) {
      return { success: false, error: err.message };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to accept invitation",
    };
  }
}

/**
 * Server Action: Preview an invitation token.
 *
 * Security controls:
 * - Rate limited by IP + coarse 8-hex token prefix bucket (20 / 5m).
 * - Coarse prefix bucket (32 bits) groups requests for abuse correlation
 *   WITHOUT compromising the 256-bit entropy model used for database lookup.
 */
export async function previewInvitationAction(data: {
  rawToken: string;
}): Promise<InvitationPreview> {
  const parsed = previewInvitationSchema.safeParse(data);
  if (!parsed.success) {
    return {
      valid: false,
      invitationId: "",
      organizationId: "",
      organizationName: "",
      organizationSlug: "",
      roleName: "",
      roleKey: "",
      email: "",
      expiresAt: new Date(0),
      status: "expired",
      error: "INVITATION_NOT_FOUND",
    };
  }

  // Derive coarse abuse-correlation bucket from SHA-256 token hash
  const tokenHash = hashInvitationToken(parsed.data.rawToken);
  const prefixBucket = tokenPrefixBucket(tokenHash);

  const context = await resolveGuardContext();
  const identifier = `${context.ip}:${prefixBucket}`;
  const decision = await consumeRateLimit(
    RATE_LIMITS.invitationPreview,
    identifier,
  );
  if (!decision.allowed) {
    return {
      valid: false,
      invitationId: "",
      organizationId: "",
      organizationName: "",
      organizationSlug: "",
      roleName: "",
      roleKey: "",
      email: "",
      expiresAt: new Date(0),
      status: "expired",
      error: "INVITATION_NOT_FOUND", // Do not confirm rate-limit existence to enumeration attackers
    };
  }

  // Full 256-bit token entropy lookup
  return getInvitationByToken(parsed.data.rawToken);
}

/**
 * Server Action: Switch the active organization context.
 * Strictly verifies caller holds active membership in the target organization.
 */
export async function switchOrganizationAction(data: {
  targetOrgId: string;
}): Promise<ActionResponse<{ organizationId: string }>> {
  try {
    const parsed = switchOrganizationSchema.parse(data);
    const result = await switchActiveOrganization(parsed.targetOrgId);
    revalidatePath("/dashboard");
    return {
      success: true,
      data: { organizationId: result.organizationId },
    };
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return {
        success: false,
        error: err.issues[0]?.message ?? "Invalid input",
      };
    }
    if (err instanceof MembershipError) {
      return { success: false, error: err.message };
    }
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to switch organization",
    };
  }
}

/**
 * Server Action: Issue an invitation from an active organization.
 * Derives organizationId from active authenticated session.
 */
export async function inviteMemberAction(data: {
  email: string;
  roleId: string;
  departmentId?: string | null;
}): Promise<ActionResponse<{ rawToken: string; invitationId: string }>> {
  try {
    const currentUser = await requireCurrentUser();
    requirePermission(currentUser.permissions, "users", "create");

    const identifier = `${currentUser.organizationId}:${currentUser.userId}`;
    const decision = await consumeRateLimit(
      RATE_LIMITS.invitationIssuance,
      identifier,
    );
    if (!decision.allowed) {
      return {
        success: false,
        error: `Too many invitation requests. Please try again in ${decision.retryAfterSeconds}s.`,
      };
    }

    const parsed = createInvitationSchema.parse(data);

    const result = await createInvitation({
      organizationId: currentUser.organizationId,
      email: parsed.email,
      roleId: parsed.roleId,
      departmentId: parsed.departmentId,
    });

    revalidatePath("/settings/members");
    return {
      success: true,
      data: {
        rawToken: result.rawToken,
        invitationId: result.invitationId,
      },
    };
  } catch (err: unknown) {
    if (err instanceof InvitationError) {
      return { success: false, error: err.message };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to invite member",
    };
  }
}

/**
 * Server Action: Revoke an invitation.
 * Derives organizationId from active authenticated session.
 */
export async function revokeInvitationAction(data: {
  invitationId: string;
}): Promise<ActionResponse> {
  try {
    const currentUser = await requireCurrentUser();
    requirePermission(currentUser.permissions, "users", "delete");

    await revokeInvitation(
      data.invitationId,
      currentUser.userId,
      currentUser.organizationId,
    );
    revalidatePath("/settings/members");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to revoke invitation",
    };
  }
}
