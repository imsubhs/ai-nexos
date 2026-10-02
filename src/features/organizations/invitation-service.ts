import crypto from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  organizationInvitations,
  organizationMemberships,
  organizations,
  roles,
  users,
} from "@/db/schema";
import { isDemoMode } from "@/lib/env.server";
import { getDemoStore } from "@/lib/demo/store";
import { getCurrentIdentity } from "@/features/auth/membership-service";
import { ACTIVE_ORG_COOKIE, ACTIVE_ORG_COOKIE_MAX_AGE } from "@/features/auth/membership-service";

export type InvitationErrorCode =
  | "INVITATION_NOT_FOUND"
  | "INVITATION_EXPIRED"
  | "INVITATION_REVOKED"
  | "INVITATION_ALREADY_ACCEPTED"
  | "AUTHENTICATION_REQUIRED"
  | "EMAIL_MISMATCH"
  | "ALREADY_MEMBER"
  | "UNAUTHORIZED";

export class InvitationError extends Error {
  readonly code: InvitationErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: InvitationErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "InvitationError";
    this.code = code;
    this.details = details;
  }
}

/** Demo store for in-memory invitations when DEMO_MODE is true. */
const demoInvitations: Array<{
  invitationId: string;
  organizationId: string;
  email: string;
  roleId: string;
  departmentId: string | null;
  tokenHash: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: Date;
  invitedByUserId: string;
  acceptedAt: Date | null;
  acceptedByUserId: string | null;
  revokedAt: Date | null;
  revokedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}> = [];

/**
 * Computes deterministic SHA-256 digest of raw invitation token.
 */
export function hashInvitationToken(rawToken: string): string {
  const normalized = (rawToken || "").trim();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export interface CreateInvitationInput {
  organizationId: string;
  email: string;
  roleId: string;
  departmentId?: string | null;
  expiresInDays?: number;
  invitedByUserId?: string;
}

/**
 * Creates a secure, tokenized invitation to join an organization.
 * Never stores raw token in database.
 */
export async function createInvitation(
  input: CreateInvitationInput,
  inviterUserId?: string,
) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const days = input.expiresInDays !== undefined ? input.expiresInDays : 7;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  // Generate 32 bytes of secure random entropy (64 hex characters)
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashInvitationToken(rawToken);

  let callerId = input.invitedByUserId ?? inviterUserId;
  if (!callerId) {
    const identity = await getCurrentIdentity();
    if (!identity?.authUserId) {
      throw new InvitationError(
        "AUTHENTICATION_REQUIRED",
        "Authentication required to issue an invitation",
      );
    }
    callerId = identity.authUserId;
  }


  if (isDemoMode()) {
    const invitationId = crypto.randomUUID();
    demoInvitations.push({
      invitationId,
      organizationId: input.organizationId,
      email: normalizedEmail,
      roleId: input.roleId,
      departmentId: input.departmentId ?? null,
      tokenHash,
      status: "pending",
      expiresAt,
      invitedByUserId: callerId,
      acceptedAt: null,
      acceptedByUserId: null,
      revokedAt: null,
      revokedByUserId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return {
      invitationId,
      rawToken,
      tokenHash,
      organizationId: input.organizationId,
      email: normalizedEmail,
      roleId: input.roleId,
      expiresAt,
      status: "pending" as const,
    };
  }

  if (!isDemoMode()) {
    const [validRole] = await db
      .select({ roleId: roles.roleId })
      .from(roles)
      .where(
        and(
          eq(roles.roleId, input.roleId),
          eq(roles.organizationId, input.organizationId),
        ),
      )
      .limit(1);

    if (!validRole) {
      throw new InvitationError(
        "UNAUTHORIZED",
        "Role not found or does not belong to target organization",
      );
    }
  }

  const [row] = await db
    .insert(organizationInvitations)
    .values({
      organizationId: input.organizationId,
      email: normalizedEmail,
      roleId: input.roleId,
      departmentId: input.departmentId ?? null,
      tokenHash,
      status: "pending",
      expiresAt,
      invitedByUserId: callerId,
    })
    .returning();

  return {
    invitationId: row.invitationId,
    rawToken,
    tokenHash,
    organizationId: row.organizationId,
    email: row.email,
    roleId: row.roleId,
    expiresAt: row.expiresAt,
    status: row.status,
  };
}

export const previewInvitation = getInvitationByToken;

export interface InvitationPreview {

  valid: boolean;
  invitationId: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  roleName: string;
  roleKey: string;
  email: string;
  expiresAt: Date;
  status: "pending" | "accepted" | "revoked" | "expired";
  error?: InvitationErrorCode;
}

/**
 * Validates and retrieves metadata for a raw invitation token.
 */
export async function getInvitationByToken(
  rawToken: string,
): Promise<InvitationPreview> {
  const tokenHash = hashInvitationToken(rawToken);

  if (isDemoMode()) {
    const invite = demoInvitations.find((i) => i.tokenHash === tokenHash);
    if (!invite) {
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

    const now = new Date();
    if (invite.status === "accepted") {
      return {
        valid: false,
        invitationId: invite.invitationId,
        organizationId: invite.organizationId,
        organizationName: "Demo Studio",
        organizationSlug: "demo-workspace",
        roleName: "Team Member",
        roleKey: "team_member",
        email: invite.email,
        expiresAt: invite.expiresAt,
        status: "accepted",
        error: "INVITATION_ALREADY_ACCEPTED",
      };
    }

    if (invite.status === "revoked") {
      return {
        valid: false,
        invitationId: invite.invitationId,
        organizationId: invite.organizationId,
        organizationName: "Demo Studio",
        organizationSlug: "demo-workspace",
        roleName: "Team Member",
        roleKey: "team_member",
        email: invite.email,
        expiresAt: invite.expiresAt,
        status: "revoked",
        error: "INVITATION_REVOKED",
      };
    }

    if (invite.expiresAt < now || invite.status === "expired") {
      return {
        valid: false,
        invitationId: invite.invitationId,
        organizationId: invite.organizationId,
        organizationName: "Demo Studio",
        organizationSlug: "demo-workspace",
        roleName: "Team Member",
        roleKey: "team_member",
        email: invite.email,
        expiresAt: invite.expiresAt,
        status: "expired",
        error: "INVITATION_EXPIRED",
      };
    }

    return {
      valid: true,
      invitationId: invite.invitationId,
      organizationId: invite.organizationId,
      organizationName: "Demo Studio",
      organizationSlug: "demo-workspace",
      roleName: "Team Member",
      roleKey: "team_member",
      email: invite.email,
      expiresAt: invite.expiresAt,
      status: "pending",
    };
  }

  const [row] = await db
    .select({
      invitationId: organizationInvitations.invitationId,
      organizationId: organizationInvitations.organizationId,
      email: organizationInvitations.email,
      roleId: organizationInvitations.roleId,
      status: organizationInvitations.status,
      expiresAt: organizationInvitations.expiresAt,
      organizationName: organizations.organizationName,
      organizationSlug: organizations.slug,
      roleName: roles.roleName,
      roleKey: roles.roleKey,
    })
    .from(organizationInvitations)
    .innerJoin(
      organizations,
      eq(organizationInvitations.organizationId, organizations.organizationId),
    )
    .innerJoin(roles, eq(organizationInvitations.roleId, roles.roleId))
    .where(eq(organizationInvitations.tokenHash, tokenHash));

  if (!row) {
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

  const now = new Date();
  if (row.status === "accepted") {
    return {
      valid: false,
      invitationId: row.invitationId,
      organizationId: row.organizationId,
      organizationName: row.organizationName,
      organizationSlug: row.organizationSlug,
      roleName: row.roleName,
      roleKey: row.roleKey,
      email: row.email,
      expiresAt: row.expiresAt,
      status: "accepted",
      error: "INVITATION_ALREADY_ACCEPTED",
    };
  }

  if (row.status === "revoked") {
    return {
      valid: false,
      invitationId: row.invitationId,
      organizationId: row.organizationId,
      organizationName: row.organizationName,
      organizationSlug: row.organizationSlug,
      roleName: row.roleName,
      roleKey: row.roleKey,
      email: row.email,
      expiresAt: row.expiresAt,
      status: "revoked",
      error: "INVITATION_REVOKED",
    };
  }

  if (row.expiresAt < now || row.status === "expired") {
    return {
      valid: false,
      invitationId: row.invitationId,
      organizationId: row.organizationId,
      organizationName: row.organizationName,
      organizationSlug: row.organizationSlug,
      roleName: row.roleName,
      roleKey: row.roleKey,
      email: row.email,
      expiresAt: row.expiresAt,
      status: "expired",
      error: "INVITATION_EXPIRED",
    };
  }

  return {
    valid: true,
    invitationId: row.invitationId,
    organizationId: row.organizationId,
    organizationName: row.organizationName,
    organizationSlug: row.organizationSlug,
    roleName: row.roleName,
    roleKey: row.roleKey,
    email: row.email,
    expiresAt: row.expiresAt,
    status: "pending",
  };
}

export interface AcceptInvitationResult {
  success: boolean;
  organizationId: string;
  membershipId: string;
  roleId?: string;
}


export interface AcceptInvitationOptions {
  userIdOverride?: string;
  userEmailOverride?: string;
}

/**
 * Authoritative server-side invitation acceptance.
 * 1. Re-validates token and expiration.
 * 2. Validates caller identity and strictly verifies email binding (EMAIL_MISMATCH protection).
 * 3. Atomically creates organization_memberships row and marks invitation accepted.
 * 4. Preserves existing user primary org (legacy compatibility).
 * 5. Sets nexos_active_org_id cookie.
 */
export async function acceptInvitation(
  rawToken: string,
  optionsOrUserId?: string | AcceptInvitationOptions,
): Promise<AcceptInvitationResult> {
  const options: AcceptInvitationOptions =
    typeof optionsOrUserId === "string"
      ? { userIdOverride: optionsOrUserId }
      : optionsOrUserId ?? {};

  const tokenHash = hashInvitationToken(rawToken);

  let callerId = options.userIdOverride;
  let callerEmail = options.userEmailOverride
    ? options.userEmailOverride.trim().toLowerCase()
    : "";

  if (!callerId) {
    const identity = await getCurrentIdentity();
    if (!identity?.authUserId) {
      throw new InvitationError(
        "AUTHENTICATION_REQUIRED",
        "You must be signed in to accept an invitation",
      );
    }
    callerId = identity.authUserId;
    callerEmail = (identity.email || "").trim().toLowerCase();
  } else if (!callerEmail && isDemoMode()) {
    const store = getDemoStore();
    const user = store.users.find(
      (u: { userId: string; email?: string }) => u.userId === callerId,
    );
    if (user?.email) {
      callerEmail = user.email.trim().toLowerCase();
    }
  }

  if (isDemoMode()) {
    const invite = demoInvitations.find((i) => i.tokenHash === tokenHash);
    if (!invite) {
      throw new InvitationError("INVITATION_NOT_FOUND", "Invitation not found");
    }
    if (invite.status === "accepted") {
      throw new InvitationError(
        "INVITATION_ALREADY_ACCEPTED",
        "This invitation has already been accepted",
      );
    }
    if (invite.status === "revoked") {
      throw new InvitationError(
        "INVITATION_REVOKED",
        "This invitation has been revoked by an administrator",
      );
    }
    if (invite.expiresAt < new Date()) {
      throw new InvitationError(
        "INVITATION_EXPIRED",
        "This invitation has expired",
      );
    }

    if (!callerEmail) {
      throw new InvitationError(
        "EMAIL_MISMATCH",
        "Authenticated identity does not have an email address associated with it",
      );
    }

    const invitedEmail = invite.email.trim().toLowerCase();
    if (callerEmail !== invitedEmail) {
      throw new InvitationError(
        "EMAIL_MISMATCH",
        `This invitation was issued to ${invite.email}. Please sign in with that account to accept it.`,
        { invitedEmail: invite.email, callerEmail },
      );
    }

    invite.status = "accepted";
    invite.acceptedAt = new Date();
    invite.acceptedByUserId = callerId;

    const store = getDemoStore();
    const membershipId = crypto.randomUUID();
    if (!store.organizationMemberships) {
      store.organizationMemberships = [];
    }
    const existingMembership = store.organizationMemberships.find(
      (m: { userId: string; organizationId: string }) =>
        m.userId === callerId && m.organizationId === invite.organizationId,
    );
    if (existingMembership) {
      existingMembership.status = "active";
      existingMembership.roleId = invite.roleId;
      existingMembership.departmentId = invite.departmentId ?? null;
      existingMembership.updatedAt = new Date();
    } else {
      store.organizationMemberships.push({
        membershipId,
        userId: callerId,
        organizationId: invite.organizationId,
        roleId: invite.roleId,
        departmentId: invite.departmentId ?? null,
        designation: null,
        employmentType: "full_time",
        workingHours: null,
        status: "active",
        isDefault: false,
        joinedAt: new Date(),
        invitedAt: invite.createdAt,
        acceptedAt: new Date(),
        suspendedAt: null,
        removedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Ensure user exists in demo store users collection
    const existingDemoUser = store.users.find(
      (u: { userId: string }) => u.userId === callerId,
    );
    if (!existingDemoUser) {
      store.users.push({
        userId: callerId,
        organizationId: invite.organizationId,
        email: callerEmail || invite.email,
        firstName: (callerEmail || invite.email).split("@")[0] || "User",
        lastName: null,
        avatarUrl: null,
        designation: null,
        departmentId: invite.departmentId ?? null,
        roleId: invite.roleId,
        employmentType: "full_time",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        deletedBy: null,
      });
    }

    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_ORG_COOKIE, invite.organizationId, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: ACTIVE_ORG_COOKIE_MAX_AGE,
    });

    return {
      success: true,
      organizationId: invite.organizationId,
      membershipId,
      roleId: invite.roleId,
    };
  }

  // Database path: execute inside an atomic transaction
  const txResult = await db.transaction(async (tx) => {
    const [invite] = await tx
      .select()
      .from(organizationInvitations)
      .where(eq(organizationInvitations.tokenHash, tokenHash));

    if (!invite) {
      throw new InvitationError("INVITATION_NOT_FOUND", "Invitation not found");
    }

    if (invite.status === "accepted") {
      throw new InvitationError(
        "INVITATION_ALREADY_ACCEPTED",
        "This invitation has already been accepted",
      );
    }

    if (invite.status === "revoked") {
      throw new InvitationError(
        "INVITATION_REVOKED",
        "This invitation has been revoked by an administrator",
      );
    }

    if (invite.expiresAt < new Date()) {
      throw new InvitationError(
        "INVITATION_EXPIRED",
        "This invitation has expired",
      );
    }

    if (!callerEmail) {
      throw new InvitationError(
        "EMAIL_MISMATCH",
        "Authenticated identity does not have an email address associated with it",
      );
    }

    const invitedEmail = invite.email.trim().toLowerCase();
    if (callerEmail !== invitedEmail) {
      throw new InvitationError(
        "EMAIL_MISMATCH",
        `This invitation was issued to ${invite.email}. Please sign in with that account to accept it.`,
        { invitedEmail: invite.email, callerEmail },
      );
    }

    // Ensure caller has a record in public.users first to satisfy organization_invitations.accepted_by_user_id FK
    const [existingUser] = await tx
      .select()
      .from(users)
      .where(eq(users.userId, callerId));

    if (!existingUser) {
      await tx.insert(users).values({
        userId: callerId,
        email: callerEmail || invite.email,
        firstName: (callerEmail || invite.email).split("@")[0] || "User",
        organizationId: invite.organizationId,
        roleId: invite.roleId,
        status: "active",
      });
    }

    // Atomically consume invitation with optimistic locking (status = 'pending')
    const [consumedInvite] = await tx
      .update(organizationInvitations)
      .set({
        status: "accepted",
        acceptedAt: new Date(),
        acceptedByUserId: callerId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(organizationInvitations.invitationId, invite.invitationId),
          eq(organizationInvitations.status, "pending"),
        ),
      )
      .returning();

    if (!consumedInvite) {
      throw new InvitationError(
        "INVITATION_ALREADY_ACCEPTED",
        "This invitation was already accepted concurrently",
      );
    }

    // Upsert or insert organization_membership
    const [membership] = await tx
      .insert(organizationMemberships)
      .values({
        userId: callerId,
        organizationId: invite.organizationId,
        roleId: invite.roleId,
        departmentId: invite.departmentId,
        status: "active",
        isDefault: !existingUser,
        joinedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          organizationMemberships.userId,
          organizationMemberships.organizationId,
        ],
        set: {
          status: "active",
          roleId: invite.roleId,
          departmentId: invite.departmentId,
          updatedAt: new Date(),
          deletedAt: null,
        },
      })
      .returning();

    return {
      organizationId: invite.organizationId,
      membershipId: membership.membershipId,
      roleId: invite.roleId,
    };
  });

  // Set active organization cookie outside transaction
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, txResult.organizationId, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ACTIVE_ORG_COOKIE_MAX_AGE,
  });

  return {
    success: true,
    organizationId: txResult.organizationId,
    membershipId: txResult.membershipId,
    roleId: txResult.roleId,
  };
}


/**
 * Revokes a pending invitation.
 */
export async function revokeInvitation(
  invitationId: string,
  revokerUserId?: string,
  targetOrganizationId?: string,
) {
  let callerId = revokerUserId;
  if (!callerId) {
    const identity = await getCurrentIdentity();
    if (!identity?.authUserId) {
      throw new InvitationError(
        "AUTHENTICATION_REQUIRED",
        "Authentication required to revoke an invitation",
      );
    }
    callerId = identity.authUserId;
  }

  if (isDemoMode()) {
    const invite = demoInvitations.find(
      (i) =>
        i.invitationId === invitationId &&
        (!targetOrganizationId || i.organizationId === targetOrganizationId),
    );
    if (!invite) throw new InvitationError("INVITATION_NOT_FOUND", "Invitation not found");
    invite.status = "revoked";
    invite.revokedAt = new Date();
    invite.revokedByUserId = callerId;
    return { success: true };
  }

  const conditions = [eq(organizationInvitations.invitationId, invitationId)];
  if (targetOrganizationId) {
    conditions.push(
      eq(organizationInvitations.organizationId, targetOrganizationId),
    );
  }

  const [row] = await db
    .update(organizationInvitations)
    .set({
      status: "revoked",
      revokedAt: new Date(),
      revokedByUserId: callerId,
      updatedAt: new Date(),
    })
    .where(and(...conditions))
    .returning();

  if (!row) throw new InvitationError("INVITATION_NOT_FOUND", "Invitation not found");
  return { success: true };
}
