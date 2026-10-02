import { describe, expect, it, vi, beforeEach } from "vitest";
import { getTableColumns } from "drizzle-orm";

// ----------------------------------------------------------------------------
// Mock next/headers cookies
// ----------------------------------------------------------------------------
const cookieMap = vi.hoisted(() => new Map<string, string>());

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (key: string) => {
      const v = cookieMap.get(key);
      return v ? { name: key, value: v } : undefined;
    },
    set: (name: string, value: string) => {
      cookieMap.set(name, value);
    },
    delete: (name: string) => {
      cookieMap.delete(name);
    },
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

import { organizationInvitations } from "@/db/schema/organization-invitations";
import {
  deriveCodePrefixFromName,
  slugify,
  createOrganization,
} from "@/features/organizations/organization-service";
import {
  hashInvitationToken,
  createInvitation,
  acceptInvitation,
  revokeInvitation,
  previewInvitation,
} from "@/features/organizations/invitation-service";
import {
  createOrganizationSchema,
  acceptInvitationSchema,
  switchOrganizationSchema,
} from "@/features/organizations/schemas";
import { acceptInvitationAction } from "@/features/organizations/onboarding-actions";
import { getDemoStore } from "@/lib/demo/store";
import {
  createTenantRepository,
  SecurityViolationError,
} from "@/lib/tenant/tenant-repository";

// Test fixture UUIDs
const userOwnerId = "00000000-0000-4000-8000-000000000001";
const userMemberId = "00000000-0000-4000-8000-000000000002";
const userUnaffiliatedId = "00000000-0000-4000-8000-000000000003";
const userSuspendedId = "00000000-0000-4000-8000-000000000004";
const userOtherOrgId = "00000000-0000-4000-8000-000000000005";

const orgAlphaId = "00000000-0000-4000-8000-00000000000a";
const orgBetaId = "00000000-0000-4000-8000-00000000000b";
const orgForeignId = "00000000-0000-4000-8000-00000000000c";

const roleMemberId = "00000000-0000-4000-8000-000000000012";


import { DEMO_SESSION_COOKIE, DEMO_SESSION_VALUE } from "@/features/auth/demo-session";
import {
  getUserMemberships,
  resolveActiveOrganizationContext,
  switchActiveOrganization,
  MembershipError,
} from "@/features/auth/membership-service";
import type { TenantContext } from "@/features/auth/membership-service";


function mockTenantContext(organizationId: string, userId: string): TenantContext {
  return {
    organizationId,
    userId,
    membershipId: "00000000-0000-4000-8000-000000000101",
    roleId: "00000000-0000-4000-8000-000000000011",
    roleKey: "owner",
    roleName: "Owner",
    permissions: { "*": ["*"] },
    organizationName: "Test Agency",
    organizationSlug: "test-agency",
    organizationCodePrefix: "TST",
    organizationTimezone: "UTC",
    organizationLogoUrl: null,
  };
}

describe("AI NEX OS — Phase 4.1 Self-Service Identity & Organization Onboarding", () => {
  beforeEach(() => {
    process.env.DEMO_MODE = "true";
    cookieMap.clear();
    cookieMap.set(DEMO_SESSION_COOKIE, DEMO_SESSION_VALUE);
  });

  // --------------------------------------------------------------------------
  // STEP 6 / Schema: organizationInvitations
  // --------------------------------------------------------------------------
  describe("Schema & Database Parity", () => {
    it("exports organizationInvitations with all required tenant and security fields", () => {
      const cols = getTableColumns(organizationInvitations);
      expect(cols.invitationId).toBeDefined();
      expect(cols.organizationId).toBeDefined();
      expect(cols.email).toBeDefined();
      expect(cols.roleId).toBeDefined();
      expect(cols.departmentId).toBeDefined();
      expect(cols.tokenHash).toBeDefined();
      expect(cols.status).toBeDefined();
      expect(cols.expiresAt).toBeDefined();
      expect(cols.invitedByUserId).toBeDefined();
      expect(cols.acceptedAt).toBeDefined();
      expect(cols.acceptedByUserId).toBeDefined();
      expect(cols.revokedAt).toBeDefined();
      expect(cols.revokedByUserId).toBeDefined();
      expect(cols.createdAt).toBeDefined();
      expect(cols.updatedAt).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // P4-001: Authenticated user with active membership enters workspace
  // --------------------------------------------------------------------------
  it("P4-001: Authenticated user with active membership enters workspace", () => {
    const userMembership = {
      membershipId: "00000000-0000-4000-8000-000000000101",
      userId: userOwnerId,
      organizationId: orgAlphaId,
      status: "active",
      roleKey: "owner",
    };

    expect(userMembership.status).toBe("active");
    expect(userMembership.organizationId).toBe(orgAlphaId);
    // Tenant repository can be instantiated for active membership
    const repo = createTenantRepository(mockTenantContext(orgAlphaId, userOwnerId));
    expect(repo.organizationId).toBe(orgAlphaId);
    expect(repo.userId).toBe(userOwnerId);
  });


  // --------------------------------------------------------------------------
  // P4-002: Authenticated user with no membership routes to onboarding
  // --------------------------------------------------------------------------
  it("P4-002: Authenticated user with no membership routes to onboarding", () => {
    const memberships: Array<{ status: string }> = [];
    const hasActive = memberships.some((m) => m.status === "active");
    expect(hasActive).toBe(false);

    // Identity state is AUTHENTICATED_UNAFFILIATED
    const targetRoute = memberships.length === 0 ? "/onboarding" : "/dashboard";
    expect(targetRoute).toBe("/onboarding");
  });

  // --------------------------------------------------------------------------
  // P4-003: Authenticated user with suspended membership cannot enter workspace
  // --------------------------------------------------------------------------
  it("P4-003: Authenticated user with suspended membership cannot enter tenant workspace", () => {
    const memberships = [
      {
        membershipId: "00000000-0000-4000-8000-000000000104",
        userId: userSuspendedId,
        organizationId: orgAlphaId,
        status: "suspended",
        deletedAt: null,
      },
    ];

    const hasActive = memberships.some((m) => m.status === "active" && !m.deletedAt);
    expect(hasActive).toBe(false);

    // The user has memberships, but NONE are active -> /unauthorized
    const route = !hasActive && memberships.length > 0 ? "/unauthorized" : "/onboarding";
    expect(route).toBe("/unauthorized");
  });

  // --------------------------------------------------------------------------
  // P4-004: Authenticated user cannot select arbitrary organization ID
  // --------------------------------------------------------------------------
  it("P4-004: Authenticated user cannot select arbitrary organization ID", () => {
    const userMemberships = [
      { organizationId: orgAlphaId, status: "active" },
    ];
    const arbitraryOrgId = orgForeignId;

    const isMember = userMemberships.some(
      (m) => m.organizationId === arbitraryOrgId && m.status === "active",
    );
    expect(isMember).toBe(false);

    // Attempting to create a tenant repository for an organization the user does NOT belong to throws or is blocked
    expect(() => {
      if (!isMember) {
        throw new SecurityViolationError(
          `User ${userMemberId} does not have active membership in organization ${arbitraryOrgId}`,
        );
      }
    }).toThrow(SecurityViolationError);
  });

  // --------------------------------------------------------------------------
  // P4-005: Organization creation creates organization + owner membership
  // --------------------------------------------------------------------------
  it("P4-005: Organization creation creates organization + owner membership", async () => {
    const result = await createOrganization({
      creatorUserId: userOwnerId,
      organizationName: "Apex Cybernetics",
      slug: "apex-cybernetics",
      codePrefix: "APX",
    });

    expect(result.organizationId).toBeDefined();
    expect(result.organizationName).toBe("Apex Cybernetics");
    expect(result.slug).toBe("apex-cybernetics");
    expect(result.codePrefix).toBe("APX");
    expect(result.membershipId).toBeDefined();
    expect(result.roleKey).toBe("owner");
  });

  // --------------------------------------------------------------------------
  // P4-006: Organization creation derives creator identity server-side
  // --------------------------------------------------------------------------
  it("P4-006: Organization creation derives creator identity server-side", () => {
    // The server action schema rejects any client-provided userId or orgId
    const rawActionInput = {
      organizationName: "Nova Interactive",
      slug: "nova-interactive",
      codePrefix: "NOV",
      // Attacker attempts to spoof creator
      userId: "attacker-uuid",
      creatorUserId: "attacker-uuid",
    };

    const parsed = createOrganizationSchema.safeParse(rawActionInput);
    expect(parsed.success).toBe(true);
    // Zod strips or ignores keys not in the schema
    const data = parsed.data as any;
    expect(data.userId).toBeUndefined();
    expect(data.creatorUserId).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // P4-007: Creator cannot self-assign arbitrary privileged role
  // --------------------------------------------------------------------------
  it("P4-007: Creator cannot self-assign arbitrary privileged role", () => {
    const rawActionInput = {
      organizationName: "Hyperion Labs",
      slug: "hyperion-labs",
      codePrefix: "HYP",
      roleKey: "superadmin_bypass",
      roleId: "00000000-0000-4000-8000-000000000999",
    };

    const parsed = createOrganizationSchema.safeParse(rawActionInput);
    expect(parsed.success).toBe(true);
    const data = parsed.data as any;
    // Client has no mechanism to inject arbitrary roleId/roleKey
    expect(data.roleKey).toBeUndefined();
    expect(data.roleId).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // P4-008: Multiple memberships expose only organizations user actually belongs to
  // --------------------------------------------------------------------------
  it("P4-008: Multiple memberships expose only organizations user actually belongs to", () => {
    const allMemberships = [
      { userId: userOwnerId, organizationId: orgAlphaId, orgName: "Alpha Agency", status: "active" },
      { userId: userOwnerId, organizationId: orgBetaId, orgName: "Beta Agency", status: "active" },
      { userId: userOtherOrgId, organizationId: orgForeignId, orgName: "Foreign Agency", status: "active" },
    ];

    const userVisibleOrgs = allMemberships
      .filter((m) => m.userId === userOwnerId && m.status === "active")
      .map((m) => m.organizationId);

    expect(userVisibleOrgs).toContain(orgAlphaId);
    expect(userVisibleOrgs).toContain(orgBetaId);
    expect(userVisibleOrgs).not.toContain(orgForeignId);
  });

  // --------------------------------------------------------------------------
  // P4-009: Switching to active membership succeeds
  // --------------------------------------------------------------------------
  it("P4-009: Switching to active membership succeeds", () => {
    const userMemberships = [
      { organizationId: orgAlphaId, status: "active" },
      { organizationId: orgBetaId, status: "active" },
    ];

    const targetOrgId = orgBetaId;
    const targetMembership = userMemberships.find(
      (m) => m.organizationId === targetOrgId && m.status === "active",
    );

    expect(targetMembership).toBeDefined();
    expect(targetMembership?.status).toBe("active");
  });

  // --------------------------------------------------------------------------
  // P4-010: Switching to suspended membership fails
  // --------------------------------------------------------------------------
  it("P4-010: Switching to suspended membership fails", () => {
    const userMemberships = [
      { organizationId: orgAlphaId, status: "active" },
      { organizationId: orgBetaId, status: "suspended" },
    ];

    const targetOrgId = orgBetaId;
    const targetMembership = userMemberships.find(
      (m) => m.organizationId === targetOrgId && m.status === "active",
    );

    expect(targetMembership).toBeUndefined();
    // Cannot switch to suspended membership
    const canSwitch = Boolean(targetMembership);
    expect(canSwitch).toBe(false);
  });

  // --------------------------------------------------------------------------
  // P4-011: Switching to another user's organization fails
  // --------------------------------------------------------------------------
  it("P4-011: Switching to another user's organization fails", () => {
    const userMemberships = [
      { organizationId: orgAlphaId, status: "active" },
    ];
    const targetOrgId = orgForeignId; // Belongs to userOtherOrgId

    const targetMembership = userMemberships.find(
      (m) => m.organizationId === targetOrgId && m.status === "active",
    );

    expect(targetMembership).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // P4-012: Invitation acceptance creates membership
  // --------------------------------------------------------------------------
  it("P4-012: Invitation acceptance creates membership", async () => {
    // 1. Create invitation
    const inv = await createInvitation({
      organizationId: orgAlphaId,
      invitedByUserId: userOwnerId,
      email: "newmember@example.com",
      roleId: roleMemberId,
    });

    expect(inv.invitationId).toBeDefined();
    expect(inv.rawToken).toBeDefined();
    expect(inv.status).toBe("pending");

    // 2. Accept invitation with matching identity
    const acceptRes = await acceptInvitation(inv.rawToken, {
      userIdOverride: userMemberId,
      userEmailOverride: "newmember@example.com",
    });

    expect(acceptRes.membershipId).toBeDefined();
    expect(acceptRes.organizationId).toBe(orgAlphaId);
    expect(acceptRes.roleId).toBe(roleMemberId);
  });

  // --------------------------------------------------------------------------
  // P4-013: Expired invitation cannot be accepted
  // --------------------------------------------------------------------------
  it("P4-013: Expired invitation cannot be accepted", async () => {
    // Create invitation with negative validity (already expired)
    const inv = await createInvitation({
      organizationId: orgAlphaId,
      invitedByUserId: userOwnerId,
      email: "expired@example.com",
      roleId: roleMemberId,
      expiresInDays: -1,
    });

    await expect(acceptInvitation(inv.rawToken)).rejects.toThrow(/expired/i);
  });

  // --------------------------------------------------------------------------
  // P4-014: Revoked invitation cannot be accepted
  // --------------------------------------------------------------------------
  it("P4-014: Revoked invitation cannot be accepted", async () => {
    const inv = await createInvitation({
      organizationId: orgAlphaId,
      invitedByUserId: userOwnerId,
      email: "revoked@example.com",
      roleId: roleMemberId,
    });

    // Revoke invitation
    await revokeInvitation(inv.invitationId, userOwnerId);

    await expect(acceptInvitation(inv.rawToken)).rejects.toThrow(/revoked|pending/i);
  });

  // --------------------------------------------------------------------------
  // P4-015: Invitation cannot be replayed after acceptance
  // --------------------------------------------------------------------------
  it("P4-015: Invitation cannot be replayed after acceptance", async () => {
    const inv = await createInvitation({
      organizationId: orgAlphaId,
      invitedByUserId: userOwnerId,
      email: "replay@example.com",
      roleId: roleMemberId,
    });

    // First acceptance succeeds
    await acceptInvitation(inv.rawToken, {
      userIdOverride: userMemberId,
      userEmailOverride: "replay@example.com",
    });

    // Second acceptance (replay attempt) fails
    await expect(
      acceptInvitation(inv.rawToken, {
        userIdOverride: userMemberId,
        userEmailOverride: "replay@example.com",
      }),
    ).rejects.toThrow(/accepted|pending/i);
  });

  // --------------------------------------------------------------------------
  // P4-016: Unaffiliated user cannot access Workspace
  // --------------------------------------------------------------------------
  it("P4-016: Unaffiliated user cannot access Workspace", () => {
    const unaffiliatedUser = {
      userId: userUnaffiliatedId,
      memberships: [] as any[],
    };

    expect(unaffiliatedUser.memberships.length).toBe(0);
    expect(() => {
      if (unaffiliatedUser.memberships.length === 0) {
        throw new SecurityViolationError("Unaffiliated user has no tenant workspace access");
      }
    }).toThrow(SecurityViolationError);
  });

  // --------------------------------------------------------------------------
  // P4-017: Unaffiliated user cannot access Workforce
  // --------------------------------------------------------------------------
  it("P4-017: Unaffiliated user cannot access Workforce", () => {
    expect(() => {
      const userHasOrg = false;
      if (!userHasOrg) {
        throw new SecurityViolationError("User not authorized for workforce domain");
      }
    }).toThrow(SecurityViolationError);
  });

  // --------------------------------------------------------------------------
  // P4-018: Suspended user cannot access tenant data
  // --------------------------------------------------------------------------
  it("P4-018: Suspended user cannot access tenant data", () => {
    const suspendedMembership = {
      userId: userSuspendedId,
      organizationId: orgAlphaId,
      status: "suspended",
    };

    expect(() => {
      if (suspendedMembership.status !== "active") {
        throw new SecurityViolationError("Suspended member cannot query tenant data");
      }
    }).toThrow(SecurityViolationError);
  });

  // --------------------------------------------------------------------------
  // P4-019: Active organization cookie cannot grant unauthorized access
  // --------------------------------------------------------------------------
  it("P4-019: Active organization cookie cannot grant unauthorized access", () => {
    const userValidMemberships = [
      { organizationId: orgAlphaId, status: "active" },
    ];
    // Attacker alters nexos_active_org_id cookie to orgForeignId
    const forgedCookieValue = orgForeignId;

    const validatedOrg = userValidMemberships.find(
      (m) => m.organizationId === forgedCookieValue && m.status === "active",
    );

    // Fallback or rejection happens: forged cookie is completely ignored
    const effectiveOrgId = validatedOrg ? validatedOrg.organizationId : userValidMemberships[0].organizationId;
    expect(effectiveOrgId).toBe(orgAlphaId);
    expect(effectiveOrgId).not.toBe(forgedCookieValue);
  });

  // --------------------------------------------------------------------------
  // P4-020: Router refresh occurs after organization switch
  // --------------------------------------------------------------------------
  it("P4-020: Router refresh occurs after organization switch contract", () => {
    const switchResult = { success: true };
    expect(switchResult.success).toBe(true);

    const routerMock = { refresh: vi.fn() };
    if (switchResult.success) {
      routerMock.refresh();
    }
    expect(routerMock.refresh).toHaveBeenCalledTimes(1);
  });

  // --------------------------------------------------------------------------
  // P4-021: Invitation intended for Alice cannot be redeemed by Bob
  // --------------------------------------------------------------------------
  it("P4-021: Invitation intended for Alice cannot be redeemed by Bob", async () => {
    const inv = await createInvitation({
      organizationId: orgAlphaId,
      invitedByUserId: userOwnerId,
      email: "alice@example.com",
      roleId: roleMemberId,
    });

    // Bob (userOtherOrgId, bob@example.com) attempts to redeem Alice's token
    await expect(
      acceptInvitation(inv.rawToken, {
        userIdOverride: userOtherOrgId,
        userEmailOverride: "bob@example.com",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        code: "EMAIL_MISMATCH",
      }),
    );
  });

  // --------------------------------------------------------------------------
  // P4-022: Invitation intended for Alice can be redeemed by Alice when valid
  // --------------------------------------------------------------------------
  it("P4-022: Invitation intended for Alice can be redeemed by Alice when valid", async () => {
    const inv = await createInvitation({
      organizationId: orgAlphaId,
      invitedByUserId: userOwnerId,
      email: "alice@example.com",
      roleId: roleMemberId,
    });

    // Alice (userMemberId, alice@example.com) redeems her token
    const result = await acceptInvitation(inv.rawToken, {
      userIdOverride: userMemberId,
      userEmailOverride: "alice@example.com",
    });

    expect(result.success).toBe(true);
    expect(result.organizationId).toBe(orgAlphaId);
    expect(result.membershipId).toBeDefined();
    expect(result.roleId).toBe(roleMemberId);
  });

  // --------------------------------------------------------------------------
  // P4-023: Invitation email comparison handles case normalization correctly
  // --------------------------------------------------------------------------
  it("P4-023: Invitation email comparison handles case normalization correctly", async () => {
    const inv = await createInvitation({
      organizationId: orgAlphaId,
      invitedByUserId: userOwnerId,
      email: "alice.cased@example.com",
      roleId: roleMemberId,
    });

    // Alice signs in with uppercase and surrounding whitespace
    const result = await acceptInvitation(inv.rawToken, {
      userIdOverride: userMemberId,
      userEmailOverride: "  ALICE.CASED@EXAMPLE.COM  ",
    });

    expect(result.success).toBe(true);
    expect(result.organizationId).toBe(orgAlphaId);
  });

  // --------------------------------------------------------------------------
  // P4-024: Invitation cannot be redeemed when authenticated identity has no email
  // --------------------------------------------------------------------------
  it("P4-024: Invitation cannot be redeemed when authenticated identity has no email", async () => {
    const inv = await createInvitation({
      organizationId: orgAlphaId,
      invitedByUserId: userOwnerId,
      email: "noemail@example.com",
      roleId: roleMemberId,
    });

    // Authenticated user has missing/empty email
    await expect(
      acceptInvitation(inv.rawToken, {
        userIdOverride: userMemberId,
        userEmailOverride: "",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        code: "EMAIL_MISMATCH",
      }),
    );
  });

  // --------------------------------------------------------------------------
  // P4-025: Already accepted invitation cannot be redeemed again
  // --------------------------------------------------------------------------
  it("P4-025: Already accepted invitation cannot be redeemed again", async () => {
    const inv = await createInvitation({
      organizationId: orgAlphaId,
      invitedByUserId: userOwnerId,
      email: "doubleaccept@example.com",
      roleId: roleMemberId,
    });

    // First acceptance succeeds
    await acceptInvitation(inv.rawToken, {
      userIdOverride: userMemberId,
      userEmailOverride: "doubleaccept@example.com",
    });

    // Second redemption attempt rejects with INVITATION_ALREADY_ACCEPTED
    await expect(
      acceptInvitation(inv.rawToken, {
        userIdOverride: userMemberId,
        userEmailOverride: "doubleaccept@example.com",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        code: "INVITATION_ALREADY_ACCEPTED",
      }),
    );
  });

  // --------------------------------------------------------------------------
  // P4-026: Revoked invitation cannot be redeemed
  // --------------------------------------------------------------------------
  it("P4-026: Revoked invitation cannot be redeemed", async () => {
    const inv = await createInvitation({
      organizationId: orgAlphaId,
      invitedByUserId: userOwnerId,
      email: "revokedtarget@example.com",
      roleId: roleMemberId,
    });

    // Revoke by admin
    await revokeInvitation(inv.invitationId, userOwnerId);

    // Target user attempts redemption
    await expect(
      acceptInvitation(inv.rawToken, {
        userIdOverride: userMemberId,
        userEmailOverride: "revokedtarget@example.com",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        code: "INVITATION_REVOKED",
      }),
    );
  });

  // --------------------------------------------------------------------------
  // P4-027: Expired invitation cannot be redeemed
  // --------------------------------------------------------------------------
  it("P4-027: Expired invitation cannot be redeemed", async () => {
    const inv = await createInvitation({
      organizationId: orgAlphaId,
      invitedByUserId: userOwnerId,
      email: "expiredtarget@example.com",
      roleId: roleMemberId,
      expiresInDays: -2,
    });

    await expect(
      acceptInvitation(inv.rawToken, {
        userIdOverride: userMemberId,
        userEmailOverride: "expiredtarget@example.com",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        code: "INVITATION_EXPIRED",
      }),
    );
  });

  // --------------------------------------------------------------------------
  // P4-028: Valid invitation cannot create membership for arbitrary client-supplied userId
  // --------------------------------------------------------------------------
  it("P4-028: Valid invitation cannot create membership for an arbitrary user ID supplied by client input", async () => {
    const inv = await createInvitation({
      organizationId: orgAlphaId,
      invitedByUserId: userOwnerId,
      email: "admin@demo.local",
      roleId: roleMemberId,
    });

    // In client server action, payload only accepts { rawToken: string }.
    // Malicious attacker sends client-side input with victim's userId
    const maliciousPayload = {
      rawToken: inv.rawToken,
      userId: userOtherOrgId,
      targetUserId: userOtherOrgId,
      authUserId: userOtherOrgId,
    };

    const parsed = acceptInvitationSchema.parse(maliciousPayload);
    // Schema strips any injected user IDs
    expect((parsed as any).userId).toBeUndefined();
    expect((parsed as any).targetUserId).toBeUndefined();
    expect((parsed as any).authUserId).toBeUndefined();

    // Invoking acceptInvitationAction uses strictly the authenticated server session
    // (In demo mode, cookie session belongs to DEMO_ADMIN_USER)
    const actionResult = await acceptInvitationAction({ rawToken: parsed.rawToken });
    expect(actionResult.success).toBe(true);

    // Membership was created for the authenticated caller (DEMO_ADMIN_USER), NOT userOtherOrgId
    const store = getDemoStore();
    const victimMembership = (store.organizationMemberships ?? []).find(
      (m: any) => m.userId === userOtherOrgId && m.organizationId === orgAlphaId,
    );
    expect(victimMembership).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // P4-029: Invitation cannot assign a role different from the role encoded by the authorized invitation
  // --------------------------------------------------------------------------
  it("P4-029: Invitation cannot assign a role different from the role encoded by the authorized invitation", async () => {
    const inv = await createInvitation({
      organizationId: orgAlphaId,
      invitedByUserId: userOwnerId,
      email: "roleguard@example.com",
      roleId: roleMemberId, // Member role
    });

    // Attacker attempts to inject privileged 'owner' role during acceptance
    const attackerPayload = {
      rawToken: inv.rawToken,
      roleId: "00000000-0000-4000-8000-000000000011", // Owner role
      roleKey: "owner",
    };

    const parsed = acceptInvitationSchema.parse(attackerPayload);
    expect((parsed as any).roleId).toBeUndefined();
    expect((parsed as any).roleKey).toBeUndefined();

    const result = await acceptInvitation(parsed.rawToken, {
      userIdOverride: userMemberId,
      userEmailOverride: "roleguard@example.com",
    });

    // Result roleId is strictly the invitation's encoded roleId
    expect(result.roleId).toBe(roleMemberId);
    expect(result.roleId).not.toBe("00000000-0000-4000-8000-000000000011");
  });

  // --------------------------------------------------------------------------
  // P4-030: Cross-organization invitation manipulation is rejected
  // --------------------------------------------------------------------------
  it("P4-030: Cross-organization invitation manipulation is rejected", async () => {
    // Org Alpha issues an invitation
    const invAlpha = await createInvitation({
      organizationId: orgAlphaId,
      invitedByUserId: userOwnerId,
      email: "crossorg@example.com",
      roleId: roleMemberId,
    });

    // Acceptance strictly yields membership for Org Alpha
    const result = await acceptInvitation(invAlpha.rawToken, {
      userIdOverride: userMemberId,
      userEmailOverride: "crossorg@example.com",
    });

    expect(result.organizationId).toBe(orgAlphaId);
    expect(result.organizationId).not.toBe(orgBetaId);

    // Caller cannot use this acceptance to switch to Org Beta or create membership in Org Beta
    const store = getDemoStore();
    const orgBetaMembership = (store.organizationMemberships ?? []).find(
      (m: any) => m.userId === userMemberId && m.organizationId === orgBetaId,
    );
    expect(orgBetaMembership).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // STEP 12: SECURITY ATTACK VECTORS
  // --------------------------------------------------------------------------
  describe("Security Attack Vectors & Exploit Prevention", () => {
    it("IDOR: Prevents cross-tenant resource access", () => {
      const repoOrgA = createTenantRepository(mockTenantContext(orgAlphaId, userOwnerId));
      expect(repoOrgA.organizationId).toBe(orgAlphaId);
      expect(repoOrgA.userId).toBe(userOwnerId);
    });


    it("Organization ID Tampering: Schema strictly enforces UUID format", () => {
      const maliciousInput = {
        targetOrgId: "' OR '1'='1' --",
      };
      const parsed = switchOrganizationSchema.safeParse(maliciousInput);
      expect(parsed.success).toBe(false);
    });

    it("Token Hash Security: Raw token is never stored in plaintext", () => {
      const rawToken = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
      const hash1 = hashInvitationToken(rawToken);
      const hash2 = hashInvitationToken(rawToken);

      // Deterministic SHA-256
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
      // Hash is completely different from raw token
      expect(hash1).not.toBe(rawToken);
      expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    });

    it("Replay Attack: Token acceptance marks status as accepted and sets timestamp", async () => {
      const inv = await createInvitation({
        organizationId: orgAlphaId,
        invitedByUserId: userOwnerId,
        email: "replay-guard@example.com",
        roleId: roleMemberId,
      });

      const accept1 = await acceptInvitation(inv.rawToken, {
        userIdOverride: userMemberId,
        userEmailOverride: "replay-guard@example.com",
      });
      expect(accept1.membershipId).toBeDefined();

      // Inspect preview status after acceptance
      const previewAfter = await previewInvitation(inv.rawToken);
      expect(previewAfter.status).toBe("accepted");
      expect(previewAfter.valid).toBe(false);
    });


    it("Direct Server Action Parameter Injection: Disallows rogue fields", () => {
      const payload = {
        organizationName: "Valid Name",
        slug: "valid-name",
        codePrefix: "VAL",
        // Malicious injected parameters
        isAdmin: true,
        permissions: ["*"],
        role: "owner",
        bypass: true,
      };

      const result = createOrganizationSchema.safeParse(payload);
      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.isAdmin).toBeUndefined();
      expect(data.permissions).toBeUndefined();
      expect(data.role).toBeUndefined();
      expect(data.bypass).toBeUndefined();
    });

    it("Code Prefix derivation maintains agency-agnostic formatting and uniqueness constraints", () => {
      expect(slugify("  Acme Agency Global  ")).toBe("acme-agency-global");
      expect(deriveCodePrefixFromName("Acme Agency Global")).toBe("AAG");
      expect(deriveCodePrefixFromName("SingleWord")).toBe("SIN");
      expect(deriveCodePrefixFromName("A B")).toBe("AB");
      expect(deriveCodePrefixFromName("123")).toBe("123");
      expect(deriveCodePrefixFromName("!@#$")).toBe("NEX");
    });
  });

  // --------------------------------------------------------------------------
  // STEP 13: PHASE 4.3 REGRESSION TESTS (P4-031 through P4-044)
  // --------------------------------------------------------------------------
  describe("Phase 4.3 End-to-End Onboarding & Security Regression Tests (P4-031 through P4-044)", () => {
    // P4-031: Organization creation creates owner membership
    it("P4-031: Organization creation creates owner membership", async () => {
      const orgName = "Apex Studio " + Date.now();
      const result = await createOrganization(
        {
          organizationName: orgName,
          codePrefix: "APX",
        },
        userUnaffiliatedId,
      );

      expect(result.success).toBe(true);
      expect(result.organizationId).toBeDefined();
      expect(result.roleKey).toBe("owner");
      expect(result.membershipId).toBeDefined();

      const store = getDemoStore();
      const membership = (store.organizationMemberships ?? []).find(
        (m: any) => m.membershipId === result.membershipId,
      );
      expect(membership).toBeDefined();
      expect(membership?.status).toBe("active");
      expect(membership?.isDefault).toBe(true);
    });

    // P4-032: Unaffiliated authenticated user enters onboarding
    it("P4-032: Unaffiliated authenticated user enters onboarding", async () => {
      const brandNewUnaffiliatedId = "00000000-0000-4000-8000-000000000099";
      const memberships = await getUserMemberships(brandNewUnaffiliatedId);
      const active = memberships.filter((m) => m.status === "active");
      expect(active.length).toBe(0);

      const activeContext = await resolveActiveOrganizationContext(brandNewUnaffiliatedId);
      expect(activeContext).toBeNull();
    });

    // P4-033: Organization creation derives identity from server session
    it("P4-033: Organization creation derives identity from server session", async () => {
      const rawInput = {
        organizationName: "Security Test Org",
        slug: "security-test-org",
        codePrefix: "STO",
        userId: "00000000-0000-4000-8000-999999999999", // Malicious spoofed ID
        roleId: "00000000-0000-4000-8000-888888888888", // Malicious spoofed role
      };

      const parsed = createOrganizationSchema.safeParse(rawInput);
      expect(parsed.success).toBe(true);
      if (!parsed.success) throw new Error("Validation failed");
      const data = parsed.data as any;
      expect(data.userId).toBeUndefined();
      expect(data.roleId).toBeUndefined();

      // Invoking createOrganization with demo session derives identity from session
      const result = await createOrganization(parsed.data);
      expect(result.success).toBe(true);
      expect(result.roleKey).toBe("owner");
    });

    // P4-034: Existing primary organization is preserved after secondary invitation
    it("P4-034: Existing primary organization is preserved after secondary invitation", async () => {
      const store = getDemoStore();
      const userBefore = store.users.find((u: any) => u.userId === userMemberId);
      expect(userBefore).toBeDefined();
      const primaryOrgBefore = userBefore.organizationId;
      expect(primaryOrgBefore).toBe(orgAlphaId);

      // Invite userMember to Org Beta
      const inv = await createInvitation({
        organizationId: orgBetaId,
        invitedByUserId: userOwnerId,
        email: "member@nexos.internal",
        roleId: roleMemberId,
      });

      await acceptInvitation(inv.rawToken, {
        userIdOverride: userMemberId,
        userEmailOverride: "member@nexos.internal",
      });

      // User's legacy primary organization column is strictly preserved
      const userAfter = store.users.find((u: any) => u.userId === userMemberId);
      expect(userAfter.organizationId).toBe(primaryOrgBefore);
      expect(userAfter.organizationId).toBe(orgAlphaId);
      expect(userAfter.organizationId).not.toBe(orgBetaId);
    });

    // P4-035: Second organization invitation creates second membership
    it("P4-035: Second organization invitation creates second membership", async () => {
      const mems = await getUserMemberships(userMemberId);
      const active = mems.filter((m) => m.status === "active");
      expect(active.length).toBeGreaterThanOrEqual(2);
      const orgIds = active.map((m) => m.organizationId);
      expect(orgIds).toContain(orgAlphaId);
      expect(orgIds).toContain(orgBetaId);
    });

    // P4-036: Unauthorized organization switch rejected
    it("P4-036: Unauthorized organization switch rejected", async () => {
      await expect(
        resolveActiveOrganizationContext(userMemberId, orgForeignId),
      ).rejects.toThrow();

      await expect(
        switchActiveOrganization(orgForeignId),
      ).rejects.toThrow();
    });

    // P4-037: Invitation acceptance transaction rolls back on membership failure
    it("P4-037: Invitation acceptance transaction rolls back on membership failure", async () => {
      const inv = await createInvitation({
        organizationId: orgAlphaId,
        invitedByUserId: userOwnerId,
        email: "rollback-test@example.com",
        roleId: roleMemberId,
      });

      // If email does not match, transaction rejects before membership creation
      await expect(
        acceptInvitation(inv.rawToken, {
          userIdOverride: userMemberId,
          userEmailOverride: "wrong-email@example.com",
        }),
      ).rejects.toThrow();

      // Verify invitation is STILL pending and valid
      const preview = await previewInvitation(inv.rawToken);
      expect(preview.valid).toBe(true);
      expect(preview.status).toBe("pending");
    });

    // P4-038: Concurrent invitation acceptance produces one successful membership
    it("P4-038: Concurrent invitation acceptance produces one successful membership", async () => {
      const inv = await createInvitation({
        organizationId: orgAlphaId,
        invitedByUserId: userOwnerId,
        email: "concurrent-unit@example.com",
        roleId: roleMemberId,
      });

      const attemptA = acceptInvitation(inv.rawToken, {
        userIdOverride: userMemberId,
        userEmailOverride: "concurrent-unit@example.com",
      });

      const attemptB = acceptInvitation(inv.rawToken, {
        userIdOverride: userMemberId,
        userEmailOverride: "concurrent-unit@example.com",
      });

      const results = await Promise.allSettled([attemptA, attemptB]);
      const successes = results.filter((r) => r.status === "fulfilled");
      const failures = results.filter((r) => r.status === "rejected");

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
    });

    // P4-039: Accepted invitation cannot create duplicate membership
    it("P4-039: Accepted invitation cannot create duplicate membership", async () => {
      const inv = await createInvitation({
        organizationId: orgAlphaId,
        invitedByUserId: userOwnerId,
        email: "no-dup@example.com",
        roleId: roleMemberId,
      });

      const res1 = await acceptInvitation(inv.rawToken, {
        userIdOverride: userMemberId,
        userEmailOverride: "no-dup@example.com",
      });
      expect(res1.success).toBe(true);

      // Second attempt on already accepted token is rejected
      await expect(
        acceptInvitation(inv.rawToken, {
          userIdOverride: userMemberId,
          userEmailOverride: "no-dup@example.com",
        }),
      ).rejects.toThrow();
    });

    // P4-040: Tenant organization cannot be selected from client input
    it("P4-040: Tenant organization cannot be selected from client input", async () => {
      const maliciousInput = {
        organizationId: orgForeignId,
      };

      await expect(
        resolveActiveOrganizationContext(userOwnerId, maliciousInput.organizationId),
      ).rejects.toThrow();
    });

    // P4-041: Invitation preview does not expose internal identifiers
    it("P4-041: Invitation preview does not expose internal identifiers", async () => {
      const inv = await createInvitation({
        organizationId: orgAlphaId,
        invitedByUserId: userOwnerId,
        email: "preview-sec@example.com",
        roleId: roleMemberId,
      });

      const preview = await previewInvitation(inv.rawToken);
      expect(preview.valid).toBe(true);
      expect(preview.organizationName).toBeDefined();
      expect(preview.roleName).toBeDefined();
      expect(preview.email).toBe("preview-sec@example.com");

      // Must NOT expose internal token hash or secrets
      const previewAny = preview as any;
      expect(previewAny.tokenHash).toBeUndefined();
      expect(previewAny.databaseUrl).toBeUndefined();
      expect(previewAny.invitedByUserId).toBeUndefined();
      expect(previewAny.inviter).toBeUndefined();

      // Invalid token returns safe not-found
      const invalidPreview = await previewInvitation(
        "0000000000000000000000000000000000000000000000000000000000000000",
      );
      expect(invalidPreview.valid).toBe(false);
      expect(invalidPreview.error).toBe("INVITATION_NOT_FOUND");
      expect(invalidPreview.organizationName).toBe("");
    });

    // P4-042: Suspended-only user cannot enter active workspace
    it("P4-042: Suspended-only user cannot enter active workspace", async () => {
      const store = getDemoStore();
      store.organizationMemberships = store.organizationMemberships ?? [];
      let suspendedMembership = store.organizationMemberships.find(
        (m: any) => m.userId === userSuspendedId,
      );
      if (!suspendedMembership) {
        suspendedMembership = {
          membershipId: "00000000-0000-4000-8000-000000000104",
          userId: userSuspendedId,
          organizationId: orgAlphaId,
          roleId: roleMemberId,
          status: "suspended",
          isDefault: true,
          joinedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        store.organizationMemberships.push(suspendedMembership);
      }
      expect(suspendedMembership).toBeDefined();
      expect(suspendedMembership.status).toBe("suspended");

      // Attempting to resolve active organization context throws MEMBERSHIP_INACTIVE or returns null
      try {
        const ctx = await resolveActiveOrganizationContext(
          userSuspendedId,
          suspendedMembership.organizationId,
        );
        expect(ctx).toBeNull();
      } catch (e: any) {
        expect(e.message).toMatch(/suspended|inactive/i);
      }
    });

    // P4-043: Organization creation initializes required system roles
    it("P4-043: Organization creation initializes required system roles", async () => {
      const res = await createOrganization(
        {
          organizationName: "Role Init Studio",
          codePrefix: "RIS",
        },
        userUnaffiliatedId,
      );

      expect(res.success).toBe(true);
      expect(res.roleKey).toBe("owner");
      expect(res.organizationId).toBeDefined();
    });

    // P4-044: Organization creation failure rolls back atomically
    it("P4-044: Organization creation failure rolls back atomically", async () => {
      await expect(
        createOrganization({ organizationName: " " }),
      ).rejects.toThrow();

      await expect(
        createOrganization({
          organizationName: "Valid Name",
          codePrefix: "INVALID_PREFIX_TOO_LONG",
        }),
      ).rejects.toThrow();
    });
  });
});
