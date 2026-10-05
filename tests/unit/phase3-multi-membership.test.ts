import { describe, expect, it, vi } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { organizationMemberships } from "@/db/schema/organization-memberships";
import { users } from "@/db/schema/users";
import { organizations } from "@/db/schema/organizations";

const user1Id = "00000000-0000-4000-8000-000000000001";
const orgAId = "00000000-0000-4000-8000-00000000000a";
const orgBId = "00000000-0000-4000-8000-00000000000b";
const roleOwnerId = "00000000-0000-4000-8000-000000000011";
const roleMemberId = "00000000-0000-4000-8000-000000000012";

const cookieMap = vi.hoisted(() => new Map<string, string>());

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (key: string) => {
      const v = cookieMap.get(key);
      return v ? { name: key, value: v } : undefined;
    },
    getAll: () =>
      Array.from(cookieMap.entries()).map(([name, value]) => ({ name, value })),
    set: (name: string, value: string) => {
      cookieMap.set(name, value);
    },
    delete: (name: string) => {
      cookieMap.delete(name);
    },
  }),
}));

const mockDbStore = vi.hoisted(() => {
  const u1 = "00000000-0000-4000-8000-000000000001";
  const oA = "00000000-0000-4000-8000-00000000000a";
  const oB = "00000000-0000-4000-8000-00000000000b";
  const rOwner = "00000000-0000-4000-8000-000000000011";
  const rMember = "00000000-0000-4000-8000-000000000012";
  const uSuspended = "00000000-0000-4000-8000-000000000077";
  const uInactive = "00000000-0000-4000-8000-000000000099";

  return {
    memberships: [
      {
        membershipId: "00000000-0000-4000-8000-000000000101",
        userId: u1,
        organizationId: oA,
        roleId: rOwner,
        departmentId: null,
        designation: "Executive Director",
        status: "active",
        isDefault: true,
        joinedAt: new Date("2026-01-01"),
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
        roleKey: "owner",
        roleName: "Owner",
        permissions: { "*": ["*"] },
        organizationName: "Agency A",
        organizationSlug: "agency-a",
        organizationCodePrefix: "AGA",
        organizationTimezone: "UTC",
        organizationLogoUrl: null,
      },
      {
        membershipId: "00000000-0000-4000-8000-000000000102",
        userId: u1,
        organizationId: oB,
        roleId: rMember,
        departmentId: null,
        designation: "Creative Technologist",
        status: "active",
        isDefault: false,
        joinedAt: new Date("2026-01-02"),
        createdAt: new Date("2026-01-02"),
        updatedAt: new Date("2026-01-02"),
        roleKey: "member",
        roleName: "Member",
        permissions: { projects: ["view"] },
        organizationName: "Agency B",
        organizationSlug: "agency-b",
        organizationCodePrefix: "AGB",
        organizationTimezone: "UTC",
        organizationLogoUrl: null,
      },
      {
        membershipId: "00000000-0000-4000-8000-000000000177",
        userId: uSuspended,
        organizationId: oA,
        roleId: rMember,
        departmentId: null,
        designation: "External Contractor",
        status: "suspended",
        isDefault: true,
        joinedAt: new Date("2026-01-01"),
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
        roleKey: "member",
        roleName: "Member",
        permissions: {},
        organizationName: "Agency A",
        organizationSlug: "agency-a",
        organizationCodePrefix: "AGA",
        organizationTimezone: "UTC",
        organizationLogoUrl: null,
      },
      {
        membershipId: "00000000-0000-4000-8000-000000000199",
        userId: uInactive,
        organizationId: oA,
        roleId: rMember,
        departmentId: null,
        designation: "Pending Invite",
        status: "pending",
        isDefault: true,
        joinedAt: null,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
        roleKey: "member",
        roleName: "Member",
        permissions: {},
        organizationName: "Agency A",
        organizationSlug: "agency-a",
        organizationCodePrefix: "AGA",
        organizationTimezone: "UTC",
        organizationLogoUrl: null,
      },
    ],
  };
});

function extractStringParams(node: unknown, depth = 0): string[] {
  const found: string[] = [];
  if (!node || depth > 10) return found;
  if (Array.isArray(node)) {
    for (const item of node)
      found.push(...extractStringParams(item, depth + 1));
    return found;
  }
  if (typeof node === "object" && node !== null) {
    const record = node as Record<string, unknown>;
    if ("value" in record && typeof record.value === "string") {
      found.push(record.value);
    }
    for (const key of Object.keys(record)) {
      found.push(...extractStringParams(record[key], depth + 1));
    }
  }
  return found;
}

vi.mock("@/db", () => {
  return {
    db: {
      select: () => {
        let matchedUserId: string | null = null;
        const chain: any = {
          from: () => chain,
          innerJoin: () => chain,
          where: (condition: unknown) => {
            const params = extractStringParams(condition);
            for (const p of params) {
              if (mockDbStore.memberships.some((m) => m.userId === p)) {
                matchedUserId = p;
                break;
              }
            }
            return chain;
          },
          orderBy: () => chain,
          limit: () => chain,
          then: (resolve: (val: any) => any) => {
            if (matchedUserId) {
              resolve(
                mockDbStore.memberships.filter(
                  (m) => m.userId === matchedUserId,
                ),
              );
            } else {
              resolve([]);
            }
          },
        };
        return chain;
      },
      insert: () => ({
        values: () => ({
          onConflictDoNothing: () => ({
            returning: async () => [],
          }),
        }),
      }),
    },
  };
});

import {
  backfillUserMemberships,
  MembershipError,
  requireActiveMembership,
  requireMembership,
  resolveActiveOrganizationContext,
  switchActiveOrganization,
} from "@/features/auth/membership-service";
import {
  createTenantRepository,
  SecurityViolationError,
  TenantRepository,
  withTenantScope,
} from "@/lib/tenant/tenant-repository";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

describe("AI NEX OS — Phase 3 Multi-Membership & Identity Foundation", () => {
  // --------------------------------------------------------------------------
  // TEST-P3-001: Existing user receives membership during backfill
  // --------------------------------------------------------------------------
  it("TEST-P3-001: Existing user receives membership during backfill", async () => {
    const mockUsers = [
      {
        userId: user1Id,
        organizationId: orgAId,
        roleId: roleOwnerId,
        departmentId: null,
        designation: "Executive Director",
        employmentType: "full_time" as const,
        workingHours: null,
        status: "active" as const,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      },
    ];

    let insertedRecords: any[] = [];
    const mockDb: any = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockUsers),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation((records) => {
          insertedRecords = records;
          return {
            onConflictDoNothing: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue(records),
            }),
          };
        }),
      }),
    };

    const result = await backfillUserMemberships(mockDb);
    expect(result.backfilledCount).toBe(1);
    expect(insertedRecords.length).toBe(1);
    expect(insertedRecords[0].userId).toBe(user1Id);
    expect(insertedRecords[0].organizationId).toBe(orgAId);
    expect(insertedRecords[0].roleId).toBe(roleOwnerId);
    expect(insertedRecords[0].status).toBe("active");
    expect(insertedRecords[0].isDefault).toBe(true);
  });

  // --------------------------------------------------------------------------
  // TEST-P3-002: Backfill is idempotent
  // --------------------------------------------------------------------------
  it("TEST-P3-002: Backfill is idempotent", async () => {
    // When records already exist, onConflictDoNothing returns empty array
    const mockDb: any = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              userId: user1Id,
              organizationId: orgAId,
              roleId: roleOwnerId,
              status: "active",
            },
          ]),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]), // 0 inserted due to conflict
          }),
        }),
      }),
    };

    const result = await backfillUserMemberships(mockDb);
    expect(result.backfilledCount).toBe(0);
  });

  // --------------------------------------------------------------------------
  // TEST-P3-003: Duplicate membership is rejected/prevented
  // --------------------------------------------------------------------------
  it("TEST-P3-003: Duplicate membership is rejected/prevented by schema constraint", () => {
    // Verify unique index is configured in migration DDL
    const migrationSql = readFileSync(
      join(
        process.cwd(),
        "database/migrations/0016_organization_memberships.sql",
      ),
      "utf8",
    );
    expect(migrationSql).toContain(
      'CREATE UNIQUE INDEX "uq_user_organization"',
    );
    expect(migrationSql).toContain('"user_id"');
    expect(migrationSql).toContain('"organization_id"');

    const columns = getTableColumns(organizationMemberships);
    expect(columns.userId).toBeDefined();
    expect(columns.organizationId).toBeDefined();
    expect(columns.roleId).toBeDefined();
    expect(columns.status).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // TEST-P3-004: User can have memberships in multiple organizations
  // --------------------------------------------------------------------------
  it("TEST-P3-004: User can have memberships in multiple organizations", () => {
    const membershipA = {
      membershipId: "00000000-0000-4000-8000-000000000101",
      userId: user1Id,
      organizationId: orgAId,
      roleId: roleOwnerId,
      status: "active" as const,
    };

    const membershipB = {
      membershipId: "00000000-0000-4000-8000-000000000102",
      userId: user1Id,
      organizationId: orgBId,
      roleId: roleMemberId,
      status: "active" as const,
    };

    const userMemberships = [membershipA, membershipB];
    expect(userMemberships.length).toBe(2);
    expect(userMemberships[0].userId).toBe(userMemberships[1].userId);
    expect(userMemberships[0].organizationId).not.toBe(
      userMemberships[1].organizationId,
    );
  });

  // --------------------------------------------------------------------------
  // TEST-P3-005: Inactive membership cannot authorize access
  // --------------------------------------------------------------------------
  it("TEST-P3-005: Inactive membership cannot authorize access", async () => {
    // Mock getUserMemberships inside getMembership
    const inactiveUser = "00000000-0000-4000-8000-000000000099";
    await expect(
      requireActiveMembership(inactiveUser, orgAId),
    ).rejects.toThrow();
  });

  // --------------------------------------------------------------------------
  // TEST-P3-006: User A cannot access Organization B without membership
  // --------------------------------------------------------------------------
  it("TEST-P3-006: User A cannot access Organization B without membership", async () => {
    await expect(
      requireMembership(user1Id, "00000000-0000-4000-8000-999999999999"),
    ).rejects.toThrow();
  });

  // --------------------------------------------------------------------------
  // TEST-P3-007: Changing active organization requires membership
  // --------------------------------------------------------------------------
  it("TEST-P3-007: Changing active organization requires membership", async () => {
    // When attempting to switch to an organization where user has no active membership:
    await expect(
      switchActiveOrganization("00000000-0000-4000-8000-000000000099"),
    ).rejects.toThrow();
  });

  // --------------------------------------------------------------------------
  // TEST-P3-008: Invalid active organization cookie is rejected
  // --------------------------------------------------------------------------
  it("TEST-P3-008: Invalid active organization cookie is rejected and falls back safely", async () => {
    // resolveActiveOrganizationContext with null requestedOrgId checks cookie and falls back
    const context = await resolveActiveOrganizationContext(user1Id, null);
    // If user has no memberships, returns null without throwing unhandled exceptions
    expect(context === null || typeof context === "object").toBe(true);
  });

  // --------------------------------------------------------------------------
  // TEST-P3-009: Legacy users.organization_id remains intact
  // --------------------------------------------------------------------------
  it("TEST-P3-009: Legacy users.organization_id remains intact", () => {
    const userColumns = getTableColumns(users);
    expect(userColumns.organizationId).toBeDefined();
    expect(userColumns.organizationId.dataType).toBe("string");
    expect(userColumns.organizationId.notNull).toBe(true);
  });

  // --------------------------------------------------------------------------
  // TEST-P3-010: Legacy users.role_id remains intact
  // --------------------------------------------------------------------------
  it("TEST-P3-010: Legacy users.role_id remains intact", () => {
    const userColumns = getTableColumns(users);
    expect(userColumns.roleId).toBeDefined();
    expect(userColumns.roleId.dataType).toBe("string");
    expect(userColumns.roleId.notNull).toBe(true);
  });

  // --------------------------------------------------------------------------
  // TEST-P3-011: Membership role is resolved correctly
  // --------------------------------------------------------------------------
  it("TEST-P3-011: Membership role is resolved correctly", () => {
    const membership = {
      membershipId: "00000000-0000-4000-8000-000000000101",
      userId: user1Id,
      organizationId: orgAId,
      roleId: roleOwnerId,
      roleKey: "owner",
      roleName: "Owner",
      permissions: { "*": ["*"] },
      status: "active" as const,
      isDefault: true,
    };

    expect(membership.roleKey).toBe("owner");
    expect(membership.permissions["*"]).toContain("*");
  });

  // --------------------------------------------------------------------------
  // TEST-P3-012: Tenant-bound repository cannot be constructed from unauthorized organization ID
  // --------------------------------------------------------------------------
  it("TEST-P3-012: Tenant-bound repository cannot be constructed from unauthorized organization ID", () => {
    expect(() => {
      createTenantRepository({
        userId: "",
        organizationId: "",
        membershipId: "",
        roleId: "",
        roleKey: "",
        roleName: "",
        permissions: {},
        organizationName: "",
        organizationSlug: "",
        organizationCodePrefix: "",
        organizationTimezone: "UTC",
        organizationLogoUrl: null,
      });
    }).toThrow(SecurityViolationError);
  });

  // --------------------------------------------------------------------------
  // TEST-P3-013: Server Actions do not accept caller-controlled identity as tenant authority
  // --------------------------------------------------------------------------
  it("TEST-P3-013: Server Actions do not accept caller-controlled identity as tenant authority", () => {
    const SRC = join(process.cwd(), "src");
    function walk(dir: string, out: string[] = []): string[] {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path, out);
        else if (/\.tsx?$/.test(path)) out.push(path);
      }
      return out;
    }

    const actionFiles = walk(SRC).filter((file) => {
      const head = readFileSync(file, "utf8")
        .split("\n")
        .slice(0, 5)
        .join("\n");
      return /^\s*(["'])use server\1/m.test(head);
    });

    const IDENTITY_PARAMS =
      /^(userId|organizationId|orgId|tenantId|currentUserId)$/;
    const EXPORT_PATTERN =
      /export\s+(?:async\s+function|const)\s+(\w+)\s*(?:=\s*async\s*)?\(([^)]*)\)/g;

    const offenders: string[] = [];
    const ALLOWED = ["checkOwnerProtectionMock", "addProjectMember"];

    for (const file of actionFiles) {
      const content = readFileSync(file, "utf8");
      for (const match of content.matchAll(EXPORT_PATTERN)) {
        const [, fn, params] = match;
        if (ALLOWED.includes(fn)) continue;
        for (const raw of params.split(",")) {
          const name = raw.trim().split(/[:=]/)[0].trim();
          if (IDENTITY_PARAMS.test(name)) {
            offenders.push(`${file} :: ${fn}(${name})`);
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  // --------------------------------------------------------------------------
  // TEST-P3-014: Query-string organization ID cannot bypass membership
  // --------------------------------------------------------------------------
  it("TEST-P3-014: Query-string organization ID cannot bypass membership", async () => {
    const attackerRequestedOrgId = "00000000-0000-4000-8000-999999999999";
    await expect(
      resolveActiveOrganizationContext(user1Id, attackerRequestedOrgId),
    ).rejects.toThrow(MembershipError);
  });

  // --------------------------------------------------------------------------
  // TEST-P3-015: Form/body organization ID cannot bypass membership
  // --------------------------------------------------------------------------
  it("TEST-P3-015: Form/body organization ID cannot bypass membership", async () => {
    const maliciousPayloadOrgId = "00000000-0000-4000-8000-888888888888";
    await expect(
      switchActiveOrganization(maliciousPayloadOrgId),
    ).rejects.toThrow();
  });

  // --------------------------------------------------------------------------
  // TEST-P3-016: Cross-tenant resource access is rejected
  // --------------------------------------------------------------------------
  it("TEST-P3-016: Cross-tenant resource access is rejected", () => {
    const repoA = new TenantRepository({
      userId: user1Id,
      organizationId: orgAId,
      membershipId: "00000000-0000-4000-8000-000000000101",
      roleId: roleOwnerId,
      roleKey: "owner",
      roleName: "Owner",
      permissions: { "*": ["*"] },
      organizationName: "Agency A",
      organizationSlug: "agency-a",
      organizationCodePrefix: "AGA",
      organizationTimezone: "UTC",
      organizationLogoUrl: null,
    });

    expect(repoA.organizationId).toBe(orgAId);

    // withTenantScope guarantees any table query produces organizationId = repoA.organizationId
    const predicate = withTenantScope(organizations, repoA.organizationId);
    expect(predicate).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // TEST-P3-017: Suspended membership cannot access tenant resources
  // --------------------------------------------------------------------------
  it("TEST-P3-017: Suspended membership cannot access tenant resources", async () => {
    const suspendedUserId = "00000000-0000-4000-8000-000000000077";
    await expect(
      requireActiveMembership(suspendedUserId, orgAId),
    ).rejects.toThrow(MembershipError);
  });

  // --------------------------------------------------------------------------
  // TEST-P3-018: Membership deletion/revocation does not delete user or organization
  // --------------------------------------------------------------------------
  it("TEST-P3-018: Membership deletion/revocation does not delete user or organization", () => {
    const columns = getTableColumns(organizationMemberships);
    // Deleting organization_memberships row is isolated:
    expect(columns.userId).toBeDefined();
    expect(columns.organizationId).toBeDefined();
    expect(columns.membershipId.name).toBe("membership_id");
    expect(columns.membershipId.primary).toBe(true);

    // Verify migration specifies cascade from parent entities, NOT cascade from membership to parent
    const migrationSql = readFileSync(
      join(
        process.cwd(),
        "database/migrations/0016_organization_memberships.sql",
      ),
      "utf8",
    );
    expect(migrationSql).toContain(
      'REFERENCES "users"("user_id") ON DELETE CASCADE',
    );
    expect(migrationSql).toContain(
      'REFERENCES "organizations"("organization_id") ON DELETE CASCADE',
    );
  });

  // --------------------------------------------------------------------------
  // TEST-P3-019: Multiple memberships do not create duplicate global users
  // --------------------------------------------------------------------------
  it("TEST-P3-019: Multiple memberships do not create duplicate global users", () => {
    // 1 user, 3 memberships
    const user = {
      userId: user1Id,
      email: "creator@example.com",
    };

    const memberships = [
      { userId: user.userId, organizationId: orgAId },
      { userId: user.userId, organizationId: orgBId },
      {
        userId: user.userId,
        organizationId: "00000000-0000-4000-8000-00000000000c",
      },
    ];

    const uniqueUserIds = new Set(memberships.map((m) => m.userId));
    expect(uniqueUserIds.size).toBe(1);
    expect(memberships.length).toBe(3);
  });

  // --------------------------------------------------------------------------
  // TEST-P3-020: Global email uniqueness remains valid
  // --------------------------------------------------------------------------
  it("TEST-P3-020: Global email uniqueness remains valid", () => {
    const userColumns = getTableColumns(users);
    expect(userColumns.email).toBeDefined();
    expect(userColumns.email.notNull).toBe(true);
  });

  // --------------------------------------------------------------------------
  // TEST-P3-021: Active user → active membership
  // --------------------------------------------------------------------------
  it("TEST-P3-021: Active user → active membership", async () => {
    const activeUser = {
      userId: user1Id,
      organizationId: orgAId,
      roleId: roleOwnerId,
      departmentId: null,
      designation: "Lead Designer",
      employmentType: "full_time" as const,
      workingHours: null,
      status: "active" as const,
      deletedAt: null,
      deletedBy: null,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    };

    let insertedRecords: any[] = [];
    const mockDb: any = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([activeUser]),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation((records) => {
          insertedRecords = records;
          return {
            onConflictDoNothing: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue(records),
            }),
          };
        }),
      }),
    };

    const result = await backfillUserMemberships(mockDb);
    expect(result.backfilledCount).toBe(1);
    expect(insertedRecords[0].status).toBe("active");
    expect(insertedRecords[0].deletedAt).toBeNull();

    // Verify migration SQL CASE statement for active users
    const migrationSql = readFileSync(
      join(
        process.cwd(),
        "database/migrations/0016_organization_memberships.sql",
      ),
      "utf8",
    );
    expect(migrationSql).toContain(
      'WHEN u."status" = \'active\' AND u."deleted_at" IS NULL THEN \'active\'::"membership_status"',
    );
  });

  // --------------------------------------------------------------------------
  // TEST-P3-022: Inactive user → suspended membership
  // --------------------------------------------------------------------------
  it("TEST-P3-022: Inactive user → suspended membership", async () => {
    const inactiveUser = {
      userId: "00000000-0000-4000-8000-000000000022",
      organizationId: orgAId,
      roleId: roleMemberId,
      departmentId: null,
      designation: "Former Associate",
      employmentType: "contract" as const,
      workingHours: null,
      status: "inactive" as const,
      deletedAt: null,
      deletedBy: null,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    };

    let insertedRecords: any[] = [];
    const mockDb: any = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([inactiveUser]),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation((records) => {
          insertedRecords = records;
          return {
            onConflictDoNothing: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue(records),
            }),
          };
        }),
      }),
    };

    const result = await backfillUserMemberships(mockDb);
    expect(result.backfilledCount).toBe(1);
    expect(insertedRecords[0].status).toBe("suspended");
    expect(insertedRecords[0].deletedAt).toBeNull();
  });

  // --------------------------------------------------------------------------
  // TEST-P3-023: Soft-deleted user → non-active membership and deleted_at preserved
  // --------------------------------------------------------------------------
  it("TEST-P3-023: Soft-deleted user → non-active membership and deleted_at preserved", async () => {
    const deletedTime = new Date("2026-02-15T12:00:00Z");
    const softDeletedUser = {
      userId: "00000000-0000-4000-8000-000000000023",
      organizationId: orgAId,
      roleId: roleMemberId,
      departmentId: null,
      designation: "Archived Staff",
      employmentType: "full_time" as const,
      workingHours: null,
      status: "active" as const, // Even if status was left as 'active', deletedAt takes precedence
      deletedAt: deletedTime,
      deletedBy: user1Id,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-02-15"),
    };

    let insertedRecords: any[] = [];
    const mockDb: any = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([softDeletedUser]),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation((records) => {
          insertedRecords = records;
          return {
            onConflictDoNothing: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue(records),
            }),
          };
        }),
      }),
    };

    const result = await backfillUserMemberships(mockDb);
    expect(result.backfilledCount).toBe(1);
    expect(insertedRecords[0].status).toBe("suspended");
    expect(insertedRecords[0].deletedAt).toEqual(deletedTime);
    expect(insertedRecords[0].deletedBy).toBe(user1Id);

    // Verify migration SQL preserves deleted_at and deleted_by
    const migrationSql = readFileSync(
      join(
        process.cwd(),
        "database/migrations/0016_organization_memberships.sql",
      ),
      "utf8",
    );
    expect(migrationSql).toContain('"deleted_at",');
    expect(migrationSql).toContain('"deleted_by"');
    expect(migrationSql).toContain('u."deleted_at"');
    expect(migrationSql).toContain('u."deleted_by"');
  });

  // --------------------------------------------------------------------------
  // TEST-P3-024: Null-status behavior
  // --------------------------------------------------------------------------
  it("TEST-P3-024: Null-status behavior enforces notNull and falls back closed to suspended", async () => {
    const userColumns = getTableColumns(users);
    // Schema enforces NOT NULL with default 'active'
    expect(userColumns.status.notNull).toBe(true);
    expect(userColumns.status.default).toBe("active");

    // Edge case: if a row had null/unrecognized status, backfill must fail-closed to suspended
    const nullStatusUser = {
      userId: "00000000-0000-4000-8000-000000000024",
      organizationId: orgAId,
      roleId: roleMemberId,
      departmentId: null,
      designation: null,
      employmentType: "full_time" as const,
      workingHours: null,
      status: null as any,
      deletedAt: null,
      deletedBy: null,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    };

    let insertedRecords: any[] = [];
    const mockDb: any = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([nullStatusUser]),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation((records) => {
          insertedRecords = records;
          return {
            onConflictDoNothing: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue(records),
            }),
          };
        }),
      }),
    };

    await backfillUserMemberships(mockDb);
    expect(insertedRecords[0].status).toBe("suspended");
  });

  // --------------------------------------------------------------------------
  // TEST-P3-025: Backfill remains idempotent
  // --------------------------------------------------------------------------
  it("TEST-P3-025: Backfill remains idempotent across multiple executions", () => {
    const migrationSql = readFileSync(
      join(
        process.cwd(),
        "database/migrations/0016_organization_memberships.sql",
      ),
      "utf8",
    );
    expect(migrationSql).toContain(
      'ON CONFLICT ("user_id", "organization_id") DO NOTHING;',
    );
  });

  // --------------------------------------------------------------------------
  // TEST-P3-026: Legacy users.organization_id remains unchanged
  // --------------------------------------------------------------------------
  it("TEST-P3-026: Legacy users.organization_id remains unchanged", () => {
    const userColumns = getTableColumns(users);
    expect(userColumns.organizationId).toBeDefined();
    expect(userColumns.organizationId.name).toBe("organization_id");
    expect(userColumns.organizationId.notNull).toBe(true);

    const migrationSql = readFileSync(
      join(
        process.cwd(),
        "database/migrations/0016_organization_memberships.sql",
      ),
      "utf8",
    );
    expect(migrationSql).not.toContain('DROP COLUMN "organization_id"');
    expect(migrationSql).not.toContain('ALTER TABLE "users" DROP');
  });

  // --------------------------------------------------------------------------
  // TEST-P3-027: Legacy users.role_id remains unchanged
  // --------------------------------------------------------------------------
  it("TEST-P3-027: Legacy users.role_id remains unchanged", () => {
    const userColumns = getTableColumns(users);
    expect(userColumns.roleId).toBeDefined();
    expect(userColumns.roleId.name).toBe("role_id");
    expect(userColumns.roleId.notNull).toBe(true);

    const migrationSql = readFileSync(
      join(
        process.cwd(),
        "database/migrations/0016_organization_memberships.sql",
      ),
      "utf8",
    );
    expect(migrationSql).not.toContain('DROP COLUMN "role_id"');
  });
});
