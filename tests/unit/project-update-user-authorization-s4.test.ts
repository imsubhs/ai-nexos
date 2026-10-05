// @vitest-environment node

/**
 * Regression Test Suite for S4:
 * NEXOS-SEC-07 Project User-Assignment Object-Level Authorization Gate
 *
 * Invariants Under Test:
 *
 * NEXOS-SEC-07:
 * A user in Organization A may update a project to reference projectManager or creativeDirector only if:
 * 1. The caller is authenticated and holds `projects.update` permission;
 * 2. The project belongs to the user's server-derived active organization and is not deleted (deletedAt IS NULL);
 * 3. For each supplied user reference (projectManager, creativeDirector):
 *    a. target user exists;
 *    b. target user belongs to caller's server-derived organization (user.organizationId);
 *    c. target user is active (status === "active");
 *    d. target user is not soft-deleted (deletedAt IS NULL);
 * 4. Foreign, inactive, soft-deleted, or nonexistent user references fail closed with uniform "User not found" semantics;
 * 5. Server-controlled fields (organizationId, projectCode, createdBy, createdAt, deletedAt, isArchived, version)
 *    cannot be manipulated via client mass-assignment payload (OWASP API3:2023).
 * 6. All validations and mutations execute inside a transaction; failures produce zero partial mutation.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { randomUUID } from "node:crypto";
import type { CurrentUser } from "@/features/auth/current-user";
import { SYSTEM_ROLES } from "@/features/permissions/constants";
import { PermissionDeniedError } from "@/features/permissions";
import { extractParams } from "./helpers/recording-db";

const ORG_A = "00000000-0000-4000-8000-00000000000a";
const ORG_B = "00000000-0000-4000-8000-00000000000b";

const CLIENT_A_ID = "00000000-0000-4000-8000-000000000101";
const CLIENT_B_ID = "00000000-0000-4000-8000-000000000201";

const USER_A_PM = "00000000-0000-4000-8000-000000000111";
const USER_A_CD = "00000000-0000-4000-8000-000000000112";
const USER_B_PM = "00000000-0000-4000-8000-000000000211";
const USER_B_CD = "00000000-0000-4000-8000-000000000212";
const USER_A_INACTIVE = "00000000-0000-4000-8000-000000000113";
const USER_A_DELETED = "00000000-0000-4000-8000-000000000114";
const NONEXISTENT_USER_ID = "00000000-0000-4000-8000-000000000998";

const PROJECT_A_ID = "00000000-0000-4000-8000-000000000301";
const PROJECT_B_ID = "00000000-0000-4000-8000-000000000401";

type MockClient = {
  clientId: string;
  organizationId: string;
  companyName: string;
  deletedAt: Date | null;
};

type MockUser = {
  userId: string;
  organizationId: string;
  email: string;
  status: string;
  deletedAt: Date | null;
};

type MockProject = {
  projectId: string;
  projectName: string;
  projectCode: string;
  organizationId: string;
  clientId: string | null;
  projectManager: string | null;
  creativeDirector: string | null;
  status: string;
  priority: string;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  deletedBy: string | null;
  isArchived: boolean;
  version: number;
};

const state = vi.hoisted(() => {
  return {
    clients: [] as MockClient[],
    users: [] as MockUser[],
    projects: [] as MockProject[],
    activityLogs: [] as Record<string, unknown>[],
    currentUser: null as CurrentUser | null,
    recordedQueries: [] as { table?: string; params: string[] }[],
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/features/auth/current-user", () => ({
  requireCurrentUser: async () => {
    if (!state.currentUser) {
      throw new Error("Authentication required: no active session");
    }
    return state.currentUser;
  },
  getCurrentUser: async () => state.currentUser,
}));

vi.mock("@/features/organizations/code-generation", () => ({
  generateProjectCode: vi.fn(async () => "AIC-2026-0001"),
}));

vi.mock("@/db", () => {
  const mockDb = {
    transaction: async (cb: (tx: any) => Promise<any>) => {
      // Snapshot state for transaction rollback simulation
      const snapshotProjects = JSON.parse(JSON.stringify(state.projects));
      const snapshotActivity = JSON.parse(JSON.stringify(state.activityLogs));
      try {
        return await cb(mockDb);
      } catch (err) {
        state.projects = snapshotProjects;
        state.activityLogs = snapshotActivity;
        throw err;
      }
    },
    select: () => {
      let isClientsTable = false;
      let isUsersTable = false;
      let whereCondition: unknown = null;

      const chain: any = {
        from: (table: any) => {
          if (table && "clientId" in table && !("contactId" in table)) {
            isClientsTable = true;
          } else if (table && ("email" in table || "timezone" in table)) {
            isUsersTable = true;
          }
          return chain;
        },
        where: (cond: unknown) => {
          whereCondition = cond;
          return chain;
        },
        limit: () => chain,
        then: (resolve: (val: any) => any) => {
          const params = extractParams(whereCondition);
          state.recordedQueries.push({
            table: isClientsTable
              ? "clients"
              : isUsersTable
                ? "users"
                : "unknown",
            params,
          });

          if (isClientsTable) {
            const [targetClientId, targetOrgId] = params;
            const found = state.clients.find(
              (c) =>
                c.clientId === targetClientId &&
                c.organizationId === targetOrgId &&
                c.deletedAt === null,
            );
            return resolve(found ? [{ clientId: found.clientId }] : []);
          }

          if (isUsersTable) {
            const [targetUserId, targetOrgId, targetStatus] = params;
            const found = state.users.find(
              (u) =>
                u.userId === targetUserId &&
                u.organizationId === targetOrgId &&
                (targetStatus
                  ? u.status === targetStatus
                  : u.status === "active") &&
                u.deletedAt === null,
            );
            return resolve(found ? [{ userId: found.userId }] : []);
          }

          return resolve([]);
        },
      };

      return chain;
    },
    insert: (table: any) => {
      let isProjectsTable = false;
      let isActivityLogsTable = false;

      if (table && "projectName" in table) {
        isProjectsTable = true;
      } else if (table && ("activityId" in table || "entityType" in table)) {
        isActivityLogsTable = true;
      }

      const chain: any = {
        values: (val: any) => {
          if (isProjectsTable) {
            const newProj: MockProject = {
              projectId: val.projectId || randomUUID(),
              projectName: val.projectName,
              projectCode: val.projectCode || "AIC-2026-0001",
              organizationId: val.organizationId,
              clientId: val.clientId || null,
              projectManager: val.projectManager || null,
              creativeDirector: val.creativeDirector || null,
              status: val.status || "planning",
              priority: val.priority || "medium",
              createdBy: val.createdBy,
              updatedBy: val.updatedBy,
              createdAt: new Date("2026-01-01T00:00:00Z"),
              updatedAt: new Date("2026-01-01T00:00:00Z"),
              deletedAt: null,
              deletedBy: null,
              isArchived: false,
              version: 1,
            };
            state.projects.push(newProj);
            return {
              returning: async () => [newProj],
            };
          }

          if (isActivityLogsTable) {
            state.activityLogs.push(val);
            return Promise.resolve();
          }

          return {
            returning: async () => [val],
          };
        },
      };

      return chain;
    },
    update: (table: any) => {
      let isProjectsTable = false;
      if (table && "projectName" in table) {
        isProjectsTable = true;
      }

      return {
        set: (values: any) => ({
          where: (cond: unknown) => {
            const params = extractParams(cond);
            state.recordedQueries.push({
              table: isProjectsTable ? "projects" : "unknown",
              params,
            });

            return {
              returning: async () => {
                if (isProjectsTable) {
                  const [targetProjectId, targetOrgId] = params;
                  const proj = state.projects.find(
                    (p) =>
                      p.projectId === targetProjectId &&
                      p.organizationId === targetOrgId &&
                      p.deletedAt === null,
                  );
                  if (proj) {
                    Object.assign(proj, values);
                    return [proj];
                  }
                }
                return [];
              },
            };
          },
        }),
      };
    },
    query: {
      projects: {
        findFirst: async () => null,
        findMany: async () => [],
      },
      users: {
        findFirst: async () => null,
      },
    },
  };

  return { db: mockDb };
});

import { updateProject } from "@/features/projects/real-actions";

function seedFixtureData() {
  state.clients = [
    {
      clientId: CLIENT_A_ID,
      organizationId: ORG_A,
      companyName: "Acme Corp (Org A)",
      deletedAt: null,
    },
    {
      clientId: CLIENT_B_ID,
      organizationId: ORG_B,
      companyName: "Globex International (Org B)",
      deletedAt: null,
    },
  ];

  state.users = [
    {
      userId: USER_A_PM,
      organizationId: ORG_A,
      email: "pm-a@acme.test",
      status: "active",
      deletedAt: null,
    },
    {
      userId: USER_A_CD,
      organizationId: ORG_A,
      email: "cd-a@acme.test",
      status: "active",
      deletedAt: null,
    },
    {
      userId: USER_B_PM,
      organizationId: ORG_B,
      email: "pm-b@globex.test",
      status: "active",
      deletedAt: null,
    },
    {
      userId: USER_B_CD,
      organizationId: ORG_B,
      email: "cd-b@globex.test",
      status: "active",
      deletedAt: null,
    },
    {
      userId: USER_A_INACTIVE,
      organizationId: ORG_A,
      email: "inactive-a@acme.test",
      status: "inactive",
      deletedAt: null,
    },
    {
      userId: USER_A_DELETED,
      organizationId: ORG_A,
      email: "deleted-a@acme.test",
      status: "active",
      deletedAt: new Date("2026-01-01T00:00:00Z"),
    },
  ];

  state.projects = [
    {
      projectId: PROJECT_A_ID,
      projectName: "Org A Project",
      projectCode: "AIC-2026-0001",
      organizationId: ORG_A,
      clientId: CLIENT_A_ID,
      projectManager: null,
      creativeDirector: null,
      status: "planning",
      priority: "medium",
      createdBy: USER_A_PM,
      updatedBy: USER_A_PM,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
      deletedAt: null,
      deletedBy: null,
      isArchived: false,
      version: 1,
    },
    {
      projectId: PROJECT_B_ID,
      projectName: "Org B Project",
      projectCode: "AIC-2026-0002",
      organizationId: ORG_B,
      clientId: CLIENT_B_ID,
      projectManager: USER_B_PM,
      creativeDirector: USER_B_CD,
      status: "planning",
      priority: "medium",
      createdBy: USER_B_PM,
      updatedBy: USER_B_PM,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
      deletedAt: null,
      deletedBy: null,
      isArchived: false,
      version: 1,
    },
  ];

  state.activityLogs = [];
  state.recordedQueries = [];
}

function permissionsFor(roleKey: string) {
  const role = SYSTEM_ROLES.find((r) => r.roleKey === roleKey);
  if (!role) throw new Error(`Unknown system role: ${roleKey}`);
  return role.permissions;
}

function setSession(organizationId: string, roleKey = "owner"): CurrentUser {
  const user: CurrentUser = {
    userId: randomUUID(),
    organizationId,
    email: `${roleKey}@${organizationId.slice(0, 8)}.test`,
    firstName: "Test",
    lastName: "User",
    avatarUrl: null,
    designation: null,
    roleId: randomUUID(),
    roleKey,
    roleName: roleKey,
    permissions: permissionsFor(roleKey),
    departmentId: null,
    organizationName: `Org ${organizationId.slice(0, 8)}`,
    organizationSlug: `org-${organizationId.slice(0, 8)}`,
    organizationLogoUrl: null,
    organizationTimezone: "UTC",
  };
  state.currentUser = user;
  return user;
}

describe("S4 Security Remediation: NEXOS-SEC-07 Project User-Assignment Authorization", () => {
  beforeEach(() => {
    seedFixtureData();
    setSession(ORG_A, "owner");
  });

  // TEST 1: Org A updates Org A project without projectManager/creativeDirector -> PASS
  it("TEST 1: Org A updates Org A project without projectManager/creativeDirector -> PASS", async () => {
    const updated = await updateProject(PROJECT_A_ID, {
      projectName: "Updated Project Title",
      priority: "high",
    });

    expect(updated).toBeDefined();
    expect(updated.projectName).toBe("Updated Project Title");
    expect(updated.priority).toBe("high");
    expect(updated.projectManager).toBeNull();
    expect(updated.creativeDirector).toBeNull();
  });

  // TEST 2: Org A updates Org A project with same-org active projectManager -> PASS
  it("TEST 2: Org A updates Org A project with same-org active projectManager -> PASS", async () => {
    const updated = await updateProject(PROJECT_A_ID, {
      projectManager: USER_A_PM,
    });

    expect(updated).toBeDefined();
    expect(updated.projectManager).toBe(USER_A_PM);

    const saved = state.projects.find((p) => p.projectId === PROJECT_A_ID);
    expect(saved?.projectManager).toBe(USER_A_PM);
  });

  // TEST 3: Org A updates Org A project with same-org active creativeDirector -> PASS
  it("TEST 3: Org A updates Org A project with same-org active creativeDirector -> PASS", async () => {
    const updated = await updateProject(PROJECT_A_ID, {
      creativeDirector: USER_A_CD,
    });

    expect(updated).toBeDefined();
    expect(updated.creativeDirector).toBe(USER_A_CD);

    const saved = state.projects.find((p) => p.projectId === PROJECT_A_ID);
    expect(saved?.creativeDirector).toBe(USER_A_CD);
  });

  // TEST 4: Org A updates both same-org users -> PASS
  it("TEST 4: Org A updates both same-org users -> PASS", async () => {
    const updated = await updateProject(PROJECT_A_ID, {
      projectManager: USER_A_PM,
      creativeDirector: USER_A_CD,
    });

    expect(updated).toBeDefined();
    expect(updated.projectManager).toBe(USER_A_PM);
    expect(updated.creativeDirector).toBe(USER_A_CD);

    const saved = state.projects.find((p) => p.projectId === PROJECT_A_ID);
    expect(saved?.projectManager).toBe(USER_A_PM);
    expect(saved?.creativeDirector).toBe(USER_A_CD);
  });

  // TEST 5: Org A assigns Org B projectManager -> DENIED "User not found"
  it("TEST 5: Org A assigns Org B projectManager -> DENIED (User not found)", async () => {
    await expect(
      updateProject(PROJECT_A_ID, {
        projectManager: USER_B_PM, // Foreign tenant user
      }),
    ).rejects.toThrow("User not found");

    const saved = state.projects.find((p) => p.projectId === PROJECT_A_ID);
    expect(saved?.projectManager).not.toBe(USER_B_PM);
  });

  // TEST 6: Org A assigns Org B creativeDirector -> DENIED "User not found"
  it("TEST 6: Org A assigns Org B creativeDirector -> DENIED (User not found)", async () => {
    await expect(
      updateProject(PROJECT_A_ID, {
        creativeDirector: USER_B_CD, // Foreign tenant user
      }),
    ).rejects.toThrow("User not found");

    const saved = state.projects.find((p) => p.projectId === PROJECT_A_ID);
    expect(saved?.creativeDirector).not.toBe(USER_B_CD);
  });

  // TEST 7: Org A assigns nonexistent projectManager UUID -> DENIED "User not found"
  it("TEST 7: Org A assigns nonexistent projectManager UUID -> DENIED (User not found)", async () => {
    await expect(
      updateProject(PROJECT_A_ID, {
        projectManager: NONEXISTENT_USER_ID,
      }),
    ).rejects.toThrow("User not found");
  });

  // TEST 8: Org A assigns nonexistent creativeDirector UUID -> DENIED "User not found"
  it("TEST 8: Org A assigns nonexistent creativeDirector UUID -> DENIED (User not found)", async () => {
    await expect(
      updateProject(PROJECT_A_ID, {
        creativeDirector: NONEXISTENT_USER_ID,
      }),
    ).rejects.toThrow("User not found");
  });

  // TEST 9: Org A assigns inactive same-org projectManager -> DENIED "User not found"
  it("TEST 9: Org A assigns inactive same-org projectManager -> DENIED (User not found)", async () => {
    await expect(
      updateProject(PROJECT_A_ID, {
        projectManager: USER_A_INACTIVE,
      }),
    ).rejects.toThrow("User not found");

    const saved = state.projects.find((p) => p.projectId === PROJECT_A_ID);
    expect(saved?.projectManager).not.toBe(USER_A_INACTIVE);
  });

  // TEST 10: Org A assigns inactive same-org creativeDirector -> DENIED "User not found"
  it("TEST 10: Org A assigns inactive same-org creativeDirector -> DENIED (User not found)", async () => {
    await expect(
      updateProject(PROJECT_A_ID, {
        creativeDirector: USER_A_INACTIVE,
      }),
    ).rejects.toThrow("User not found");

    const saved = state.projects.find((p) => p.projectId === PROJECT_A_ID);
    expect(saved?.creativeDirector).not.toBe(USER_A_INACTIVE);
  });

  // TEST 11: Org A assigns soft-deleted same-org projectManager -> DENIED "User not found"
  it("TEST 11: Org A assigns soft-deleted same-org projectManager -> DENIED (User not found)", async () => {
    await expect(
      updateProject(PROJECT_A_ID, {
        projectManager: USER_A_DELETED,
      }),
    ).rejects.toThrow("User not found");

    const saved = state.projects.find((p) => p.projectId === PROJECT_A_ID);
    expect(saved?.projectManager).not.toBe(USER_A_DELETED);
  });

  // TEST 12: Org A assigns soft-deleted same-org creativeDirector -> DENIED "User not found"
  it("TEST 12: Org A assigns soft-deleted same-org creativeDirector -> DENIED (User not found)", async () => {
    await expect(
      updateProject(PROJECT_A_ID, {
        creativeDirector: USER_A_DELETED,
      }),
    ).rejects.toThrow("User not found");

    const saved = state.projects.find((p) => p.projectId === PROJECT_A_ID);
    expect(saved?.creativeDirector).not.toBe(USER_A_DELETED);
  });

  // TEST 13: Tampered organizationId = Org B -> Org A remains authoritative
  it("TEST 13: Tampered organizationId = Org B -> Org A remains authoritative", async () => {
    const tamperedPayload = {
      projectName: "Org A Project Tampered",
      projectManager: USER_A_PM,
      organizationId: ORG_B,
    } as any;

    const updated = await updateProject(PROJECT_A_ID, tamperedPayload);
    expect(updated.organizationId).toBe(ORG_A);
    expect(updated.organizationId).not.toBe(ORG_B);

    const saved = state.projects.find((p) => p.projectId === PROJECT_A_ID);
    expect(saved?.organizationId).toBe(ORG_A);
  });

  // TEST 14: User without projects.update attempts assignment -> PermissionDeniedError
  it("TEST 14: User without projects.update attempts assignment -> PermissionDeniedError", async () => {
    setSession(ORG_A, "finance");

    await expect(
      updateProject(PROJECT_A_ID, {
        projectManager: USER_A_PM,
      }),
    ).rejects.toThrow(PermissionDeniedError);
  });

  // TEST 15: Unauthenticated caller attempts update -> Authentication required
  it("TEST 15: Unauthenticated caller attempts update -> Authentication required", async () => {
    state.currentUser = null;

    await expect(
      updateProject(PROJECT_A_ID, {
        projectManager: USER_A_PM,
      }),
    ).rejects.toThrow(/Authentication required/);
  });

  // TEST 16: Cross-tenant projectId -> Project not found / denied
  it("TEST 16: Cross-tenant projectId -> Project not found / denied", async () => {
    setSession(ORG_A, "owner");

    await expect(
      updateProject(PROJECT_B_ID, {
        projectName: "Attacking Org B Project",
        projectManager: USER_A_PM,
      }),
    ).rejects.toThrow("Project not found");

    // Verify Org B project was untouched
    const projB = state.projects.find((p) => p.projectId === PROJECT_B_ID);
    expect(projB?.projectName).toBe("Org B Project");
    expect(projB?.projectManager).toBe(USER_B_PM);
  });

  // TEST 17: Attempt to override server-managed organizationId -> rejected/ignored
  it("TEST 17: Attempt to override server-managed organizationId -> rejected/ignored", async () => {
    const payload = {
      organizationId: ORG_B,
    } as any;

    const updated = await updateProject(PROJECT_A_ID, payload);
    expect(updated.organizationId).toBe(ORG_A);
  });

  // TEST 18: Attempt to modify server-controlled audit fields -> Client cannot control them
  it("TEST 18: Attempt to modify server-controlled audit fields -> Client cannot control them", async () => {
    const originalProject = state.projects.find(
      (p) => p.projectId === PROJECT_A_ID,
    )!;
    const originalCreatedAt = originalProject.createdAt;
    const originalCreatedBy = originalProject.createdBy;
    const originalProjectCode = originalProject.projectCode;

    const maliciousPayload = {
      projectCode: "TAMPERED-CODE-999",
      createdBy: randomUUID(),
      createdAt: new Date("1999-01-01T00:00:00Z"),
      deletedAt: new Date("2026-12-31T00:00:00Z"),
      deletedBy: randomUUID(),
      isArchived: true,
      version: 999,
    } as any;

    const updated = await updateProject(PROJECT_A_ID, maliciousPayload);

    expect(updated.projectCode).toBe(originalProjectCode);
    expect(updated.createdBy).toBe(originalCreatedBy);
    expect(updated.createdAt).toEqual(originalCreatedAt);
    expect(updated.deletedAt).toBeNull();
    expect(updated.deletedBy).toBeNull();
    expect(updated.isArchived).toBe(false);
    expect(updated.version).toBe(1);
  });

  // TEST 19: Same-tenant normal project update lifecycle -> PASS
  it("TEST 19: Same-tenant normal project update lifecycle -> PASS", async () => {
    const updated = await updateProject(PROJECT_A_ID, {
      projectName: "Lifecycle Milestone Project",
      status: "in_progress",
      priority: "critical",
      healthStatus: "delayed",
      completionPercentage: 50,
      tags: ["q3-launch", "critical-path"],
      projectManager: USER_A_PM,
      creativeDirector: USER_A_CD,
    });

    expect(updated.projectName).toBe("Lifecycle Milestone Project");
    expect(updated.status).toBe("in_progress");
    expect(updated.priority).toBe("critical");
    expect(updated.healthStatus).toBe("delayed");
    expect(updated.completionPercentage).toBe(50);
    expect(updated.tags).toEqual(["q3-launch", "critical-path"]);
    expect(updated.projectManager).toBe(USER_A_PM);
    expect(updated.creativeDirector).toBe(USER_A_CD);
  });

  // TEST 20: Failed foreign-user validation produces no partial mutation -> Project remains unchanged
  it("TEST 20: Failed foreign-user validation produces no partial mutation -> Project remains unchanged", async () => {
    const originalProject = state.projects.find(
      (p) => p.projectId === PROJECT_A_ID,
    )!;
    const originalTitle = originalProject.projectName;
    const originalPriority = originalProject.priority;

    await expect(
      updateProject(PROJECT_A_ID, {
        projectName: "Partial Mutation Title",
        priority: "low",
        projectManager: USER_B_PM, // Rejection trigger
      }),
    ).rejects.toThrow("User not found");

    const saved = state.projects.find((p) => p.projectId === PROJECT_A_ID);
    expect(saved?.projectName).toBe(originalTitle);
    expect(saved?.priority).toBe(originalPriority);
    expect(saved?.projectManager).toBeNull();
  });
});
