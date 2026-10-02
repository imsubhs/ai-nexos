// @vitest-environment node

/**
 * Regression Test Suite for NEXOS-SEC-04:
 * Cross-Tenant Project -> Client Object-Level Authorization Gate
 *
 * Invariant Under Test:
 * An authenticated user may create a project with clientId P only if:
 * 1. The caller is authenticated;
 * 2. The caller has the existing project-create permission (projects.create);
 * 3. The project organization is derived from the authenticated tenant (user.organizationId);
 * 4. If clientId is supplied:
 *    a. client exists;
 *    b. client is not soft-deleted (deletedAt IS NULL);
 *    c. client.organizationId === user.organizationId;
 * 5. clientId is never treated as authorization proof.
 * If clientId is omitted, existing project creation behavior remains intact.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { randomUUID } from "node:crypto";
import type { CurrentUser } from "@/features/auth/current-user";
import { SYSTEM_ROLES } from "@/features/permissions/constants";
import { PermissionDeniedError } from "@/features/permissions";
import type { z } from "zod";
import type { insertProjectSchema } from "@/features/projects/schemas";
import { extractParams } from "./helpers/recording-db";

const ORG_A = "00000000-0000-4000-8000-00000000000a";
const ORG_B = "00000000-0000-4000-8000-00000000000b";

const CLIENT_A_ID = "00000000-0000-4000-8000-000000000101";
const CLIENT_B_ID = "00000000-0000-4000-8000-000000000201";
const CLIENT_A_ARCHIVED_ID = "00000000-0000-4000-8000-000000000199";
const NONEXISTENT_CLIENT_ID = "00000000-0000-4000-8000-000000000999";

type MockClient = {
  clientId: string;
  organizationId: string;
  companyName: string;
  deletedAt: Date | null;
};

type MockProject = {
  projectId: string;
  projectName: string;
  projectCode: string;
  organizationId: string;
  clientId: string | null;
  status: string;
  priority: string;
  createdBy: string;
  updatedBy: string;
  deletedAt: Date | null;
};

const state = vi.hoisted(() => {
  return {
    clients: [] as MockClient[],
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
      return cb(mockDb);
    },
    select: () => {
      let isClientsTable = false;
      let whereCondition: unknown = null;

      const chain: any = {
        from: (table: any) => {
          if (table && "clientId" in table && !("contactId" in table)) {
            isClientsTable = true;
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
            table: isClientsTable ? "clients" : "unknown",
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
              status: val.status || "planning",
              priority: val.priority || "medium",
              createdBy: val.createdBy,
              updatedBy: val.updatedBy,
              deletedAt: null,
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
    update: () => ({
      set: () => ({
        where: () => ({
          returning: async () => [],
        }),
      }),
    }),
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

import { createProject } from "@/features/projects/real-actions";

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
    {
      clientId: CLIENT_A_ARCHIVED_ID,
      organizationId: ORG_A,
      companyName: "Old Acme Division (Archived)",
      deletedAt: new Date("2026-01-01T00:00:00Z"),
    },
  ];

  state.projects = [];
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

function makeProjectPayload(
  overrides: Partial<z.infer<typeof insertProjectSchema>> & { projectName: string },
): z.infer<typeof insertProjectSchema> {
  return {
    priority: "medium",
    status: "planning",
    completionPercentage: 0,
    healthStatus: "on_track",
    visibility: "internal",
    tags: [],
    ...overrides,
  };
}

describe("NEXOS-SEC-04: Cross-Tenant Project -> Client Authorization Gate", () => {
  beforeEach(() => {
    seedFixtureData();
    setSession(ORG_A, "owner");
  });

  // --------------------------------------------------------------------------
  // TEST 1: Authenticated Org A user creates project without clientId -> SUCCESS
  // --------------------------------------------------------------------------
  it("TEST 1: Authenticated Org A user creates project without clientId -> SUCCESS", async () => {
    const userA = setSession(ORG_A, "owner");

    const result = await createProject(
      makeProjectPayload({
        projectName: "Internal Infrastructure Overhaul",
        priority: "high",
        status: "planning",
      }),
    );

    expect(result).toBeDefined();
    expect(result.projectId).toBeDefined();
    expect(result.projectName).toBe("Internal Infrastructure Overhaul");
    expect(result.clientId).toBeNull();
    expect(result.organizationId).toBe(userA.organizationId);

    // Verify stored project
    const created = state.projects.find((p) => p.projectId === result.projectId);
    expect(created).toBeDefined();
    expect(created?.clientId).toBeNull();
    expect(created?.organizationId).toBe(ORG_A);
  });

  // --------------------------------------------------------------------------
  // TEST 2: Authenticated Org A user creates project with Org A clientId -> SUCCESS
  // --------------------------------------------------------------------------
  it("TEST 2: Authenticated Org A user creates project with Org A clientId -> SUCCESS", async () => {
    const userA = setSession(ORG_A, "owner");

    const result = await createProject(
      makeProjectPayload({
        projectName: "Acme Web Redesign",
        clientId: CLIENT_A_ID,
        priority: "critical",
        status: "in_progress",
      }),
    );

    expect(result).toBeDefined();
    expect(result.projectId).toBeDefined();
    expect(result.clientId).toBe(CLIENT_A_ID);
    expect(result.organizationId).toBe(userA.organizationId);

    // Verify stored project in state
    const created = state.projects.find((p) => p.projectId === result.projectId);
    expect(created).toBeDefined();
    expect(created?.clientId).toBe(CLIENT_A_ID);
    expect(created?.organizationId).toBe(ORG_A);

    // Verify query bound both clientId and caller's organizationId
    const query = state.recordedQueries.find((q) => q.table === "clients");
    expect(query).toBeDefined();
    expect(query?.params).toContain(CLIENT_A_ID);
    expect(query?.params).toContain(userA.organizationId);
  });

  // --------------------------------------------------------------------------
  // TEST 3: Authenticated Org A user attempts project creation with Org B clientId -> DENIED
  // --------------------------------------------------------------------------
  it("TEST 3: Authenticated Org A user attempts project creation with Org B clientId -> DENIED", async () => {
    setSession(ORG_A, "owner");

    await expect(
      createProject(
        makeProjectPayload({
          projectName: "Illicit Cross-Tenant Project",
          clientId: CLIENT_B_ID, // Foreign tenant client
        }),
      ),
    ).rejects.toThrow("Client not found");
  });

  // --------------------------------------------------------------------------
  // TEST 4: After TEST 3, verify no project was created with Org B clientId -> PASS
  // --------------------------------------------------------------------------
  it("TEST 4: After TEST 3, verify no project was created with Org B clientId -> PASS", async () => {
    setSession(ORG_A, "owner");

    // Attempt exploit
    await expect(
      createProject(
        makeProjectPayload({
          projectName: "Rogue Project Binding",
          clientId: CLIENT_B_ID,
        }),
      ),
    ).rejects.toThrow("Client not found");

    // Explicitly verify zero projects associated with Org B's client exist in the database
    const rogueProjects = state.projects.filter((p) => p.clientId === CLIENT_B_ID);
    expect(rogueProjects).toHaveLength(0);

    // Also verify no project was created with name "Rogue Project Binding"
    const namedProjects = state.projects.filter(
      (p) => p.projectName === "Rogue Project Binding",
    );
    expect(namedProjects).toHaveLength(0);
  });

  // --------------------------------------------------------------------------
  // TEST 5: Authenticated Org A user supplies tampered organizationId -> Server-derived authoritative
  // --------------------------------------------------------------------------
  it("TEST 5: Authenticated Org A user supplies tampered organizationId -> Server-derived authoritative", async () => {
    const userA = setSession(ORG_A, "owner");

    // Client payload attempts to tamper with organizationId
    const tamperedPayload = makeProjectPayload({
      projectName: "Tampered Org Project",
      clientId: CLIENT_A_ID,
    }) as any;
    tamperedPayload.organizationId = ORG_B; // Malicious override attempt

    const result = await createProject(tamperedPayload);

    // Project must be pinned to user's server-derived organization (ORG_A), not tampered ORG_B
    expect(result.organizationId).toBe(userA.organizationId);
    expect(result.organizationId).toBe(ORG_A);
    expect(result.organizationId).not.toBe(ORG_B);

    const saved = state.projects.find((p) => p.projectId === result.projectId);
    expect(saved?.organizationId).toBe(ORG_A);
  });

  // --------------------------------------------------------------------------
  // TEST 6: User without project-create permission attempts project creation -> DENIED
  // --------------------------------------------------------------------------
  it("TEST 6: User without project-create permission attempts project creation -> DENIED", async () => {
    // finance role has read-only or lacks projects.create permission
    setSession(ORG_A, "finance");

    await expect(
      createProject(
        makeProjectPayload({
          projectName: "Unauthorized Financial Project",
          clientId: CLIENT_A_ID,
        }),
      ),
    ).rejects.toThrow(PermissionDeniedError);

    // Verify no project was inserted
    expect(state.projects).toHaveLength(0);
  });

  // --------------------------------------------------------------------------
  // TEST 7: Unauthenticated caller attempts project creation -> DENIED
  // --------------------------------------------------------------------------
  it("TEST 7: Unauthenticated caller attempts project creation -> DENIED", async () => {
    state.currentUser = null;

    await expect(
      createProject(
        makeProjectPayload({
          projectName: "Anonymous Project Attempt",
          clientId: CLIENT_A_ID,
        }),
      ),
    ).rejects.toThrow(/Authentication required/);

    expect(state.projects).toHaveLength(0);
  });

  // --------------------------------------------------------------------------
  // TEST 8: Soft-deleted same-tenant client supplied -> DENIED
  // --------------------------------------------------------------------------
  it("TEST 8: Soft-deleted same-tenant client supplied -> DENIED", async () => {
    setSession(ORG_A, "owner");

    await expect(
      createProject(
        makeProjectPayload({
          projectName: "Archived Client Project",
          clientId: CLIENT_A_ARCHIVED_ID, // Soft-deleted client in same org
        }),
      ),
    ).rejects.toThrow("Client not found");

    const created = state.projects.find(
      (p) => p.clientId === CLIENT_A_ARCHIVED_ID,
    );
    expect(created).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // TEST 9: Nonexistent clientId supplied -> DENIED without information leakage
  // --------------------------------------------------------------------------
  it("TEST 9: Nonexistent clientId supplied -> DENIED without information leakage", async () => {
    setSession(ORG_A, "owner");

    // Generates exact same error message ("Client not found") as foreign tenant client
    await expect(
      createProject(
        makeProjectPayload({
          projectName: "Nonexistent Client Project",
          clientId: NONEXISTENT_CLIENT_ID,
        }),
      ),
    ).rejects.toThrow("Client not found");

    expect(state.projects).toHaveLength(0);
  });

  // --------------------------------------------------------------------------
  // TEST 10: Existing project creation lifecycle remains unchanged -> PASS
  // --------------------------------------------------------------------------
  it("TEST 10: Existing project creation lifecycle remains unchanged -> PASS", async () => {
    const userA = setSession(ORG_A, "owner");

    const project = await createProject(
      makeProjectPayload({
        projectName: "Full Lifecycle Project",
        clientId: CLIENT_A_ID,
        description: "Full end to end project creation test",
        priority: "high",
        status: "planning",
      }),
    );

    expect(project).toBeDefined();
    expect(project.projectId).toBeDefined();
    expect(project.projectCode).toBe("AIC-2026-0001");
    expect(project.organizationId).toBe(userA.organizationId);
    expect(project.createdBy).toBe(userA.userId);
    expect(project.updatedBy).toBe(userA.userId);

    // Verify activity log was recorded
    const log = state.activityLogs.find(
      (l) => l.action === "created" && l.entityId === project.projectId,
    );
    expect(log).toBeDefined();
    expect(log?.organizationId).toBe(ORG_A);
    expect(log?.userId).toBe(userA.userId);
  });
});
