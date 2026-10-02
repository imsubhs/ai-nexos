// @vitest-environment node

/**
 * Regression Test Suite for S3:
 * NEXOS-SEC-05 & NEXOS-SEC-06 Project Object-Level Authorization Gate
 *
 * Invariants Under Test:
 *
 * NEXOS-SEC-05:
 * A user in Organization A may update a project to reference clientId C only if:
 * 1. The caller is authenticated and holds `projects.update` permission;
 * 2. The project belongs to the user's server-derived active organization;
 * 3. If clientId is supplied:
 *    a. client exists;
 *    b. client is not soft-deleted (deletedAt IS NULL);
 *    c. client.organizationId === user.organizationId;
 * 4. Client-supplied organizationId or clientId is never trusted as authorization proof;
 * 5. Uniform not-found semantics ("Client not found") prevent object-existence disclosure.
 *
 * NEXOS-SEC-06:
 * A user in Organization A may create a project with user references (projectManager, creativeDirector) only if:
 * 1. The caller is authenticated and holds `projects.create` permission;
 * 2. For each supplied user reference:
 *    a. target user exists;
 *    b. target user belongs to user's server-derived organization (user.organizationId);
 *    c. target user is active (status === "active");
 *    d. target user is not soft-deleted (deletedAt IS NULL);
 * 3. Foreign, inactive, or soft-deleted user references fail closed with uniform "User not found" semantics.
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
  deletedAt: Date | null;
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
      return cb(mockDb);
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
            table: isClientsTable ? "clients" : isUsersTable ? "users" : "unknown",
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
                (targetStatus ? u.status === targetStatus : u.status === "active") &&
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

import { createProject, updateProject } from "@/features/projects/real-actions";

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
      projectName: "Org A Baseline Project",
      projectCode: "AIC-2026-0001",
      organizationId: ORG_A,
      clientId: null,
      projectManager: null,
      creativeDirector: null,
      status: "planning",
      priority: "medium",
      createdBy: randomUUID(),
      updatedBy: randomUUID(),
      deletedAt: null,
    },
    {
      projectId: PROJECT_B_ID,
      projectName: "Org B Baseline Project",
      projectCode: "AIC-2026-0002",
      organizationId: ORG_B,
      clientId: null,
      projectManager: null,
      creativeDirector: null,
      status: "planning",
      priority: "medium",
      createdBy: randomUUID(),
      updatedBy: randomUUID(),
      deletedAt: null,
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

describe("S3 Security Remediation: NEXOS-SEC-05 & NEXOS-SEC-06", () => {
  beforeEach(() => {
    seedFixtureData();
    setSession(ORG_A, "owner");
  });

  // ==========================================================================
  // NEXOS-SEC-05: updateProject Client Object-Level Authorization
  // ==========================================================================
  describe("NEXOS-SEC-05: updateProject() Client Authorization", () => {
    // TEST 1: Org A updates project with no clientId -> SUCCESS
    it("TEST 1: Org A updates project with no clientId -> SUCCESS", async () => {
      setSession(ORG_A, "owner");

      const updated = await updateProject(PROJECT_A_ID, {
        projectName: "Renamed Project A",
        priority: "high",
      });

      expect(updated).toBeDefined();
      expect(updated.projectName).toBe("Renamed Project A");
      expect(updated.priority).toBe("high");
      expect(updated.organizationId).toBe(ORG_A);
    });

    // TEST 2: Org A updates project to Org A client -> SUCCESS
    it("TEST 2: Org A updates project to Org A client -> SUCCESS", async () => {
      setSession(ORG_A, "owner");

      const updated = await updateProject(PROJECT_A_ID, {
        clientId: CLIENT_A_ID,
      });

      expect(updated).toBeDefined();
      expect(updated.clientId).toBe(CLIENT_A_ID);
      expect(updated.organizationId).toBe(ORG_A);

      // Verify stored state in mock database
      const proj = state.projects.find((p) => p.projectId === PROJECT_A_ID);
      expect(proj?.clientId).toBe(CLIENT_A_ID);
    });

    // TEST 3: Org A updates project to Org B client -> DENIED
    it("TEST 3: Org A updates project to Org B client -> DENIED (generic client-not-found)", async () => {
      setSession(ORG_A, "owner");

      await expect(
        updateProject(PROJECT_A_ID, {
          clientId: CLIENT_B_ID, // Foreign tenant client
        }),
      ).rejects.toThrow("Client not found");

      // Verify project in DB was NOT modified with Client B's ID
      const proj = state.projects.find((p) => p.projectId === PROJECT_A_ID);
      expect(proj?.clientId).not.toBe(CLIENT_B_ID);
    });

    // TEST 4: Org A updates project to soft-deleted Org A client -> DENIED
    it("TEST 4: Org A updates project to soft-deleted Org A client -> DENIED", async () => {
      setSession(ORG_A, "owner");

      await expect(
        updateProject(PROJECT_A_ID, {
          clientId: CLIENT_A_ARCHIVED_ID, // Soft-deleted same-org client
        }),
      ).rejects.toThrow("Client not found");

      const proj = state.projects.find((p) => p.projectId === PROJECT_A_ID);
      expect(proj?.clientId).not.toBe(CLIENT_A_ARCHIVED_ID);
    });

    // TEST 5: Org A updates project using nonexistent clientId -> DENIED
    it("TEST 5: Org A updates project using nonexistent clientId -> DENIED", async () => {
      setSession(ORG_A, "owner");

      await expect(
        updateProject(PROJECT_A_ID, {
          clientId: NONEXISTENT_CLIENT_ID,
        }),
      ).rejects.toThrow("Client not found");
    });

    // TEST 6: Org A supplies tampered organizationId = Org B -> server-derived Org A remains authoritative
    it("TEST 6: Org A supplies tampered organizationId = Org B -> server-derived Org A remains authoritative", async () => {
      setSession(ORG_A, "owner");

      const tamperedPayload = {
        projectName: "Tampered Update",
        organizationId: ORG_B,
      } as any;

      const updated = await updateProject(PROJECT_A_ID, tamperedPayload);

      expect(updated.organizationId).toBe(ORG_A);
      expect(updated.organizationId).not.toBe(ORG_B);

      const proj = state.projects.find((p) => p.projectId === PROJECT_A_ID);
      expect(proj?.organizationId).toBe(ORG_A);
    });

    // TEST 7: User without projects.update permission attempts update -> PermissionDeniedError
    it("TEST 7: User without projects.update permission attempts update -> PermissionDeniedError", async () => {
      // finance role does not possess projects.update
      setSession(ORG_A, "finance");

      await expect(
        updateProject(PROJECT_A_ID, {
          projectName: "Unauthorized Update",
        }),
      ).rejects.toThrow(PermissionDeniedError);
    });

    // TEST 8: Unauthenticated update -> Authentication required
    it("TEST 8: Unauthenticated update -> Authentication required", async () => {
      state.currentUser = null;

      await expect(
        updateProject(PROJECT_A_ID, {
          projectName: "Anonymous Update",
        }),
      ).rejects.toThrow(/Authentication required/);
    });
  });

  // ==========================================================================
  // NEXOS-SEC-06: createProject User Reference Object-Level Authorization
  // ==========================================================================
  describe("NEXOS-SEC-06: createProject() User References Authorization", () => {
    // TEST 9: Org A creates project with Org A projectManager -> SUCCESS
    it("TEST 9: Org A creates project with Org A projectManager -> SUCCESS", async () => {
      const userA = setSession(ORG_A, "owner");

      const project = await createProject(
        makeProjectPayload({
          projectName: "PM Assigned Project",
          projectManager: USER_A_PM,
        }),
      );

      expect(project).toBeDefined();
      expect(project.projectManager).toBe(USER_A_PM);
      expect(project.organizationId).toBe(userA.organizationId);

      const saved = state.projects.find((p) => p.projectId === project.projectId);
      expect(saved?.projectManager).toBe(USER_A_PM);
    });

    // TEST 10: Org A creates project with Org A creativeDirector -> SUCCESS
    it("TEST 10: Org A creates project with Org A creativeDirector -> SUCCESS", async () => {
      const userA = setSession(ORG_A, "owner");

      const project = await createProject(
        makeProjectPayload({
          projectName: "CD Assigned Project",
          creativeDirector: USER_A_CD,
        }),
      );

      expect(project).toBeDefined();
      expect(project.creativeDirector).toBe(USER_A_CD);
      expect(project.organizationId).toBe(userA.organizationId);

      const saved = state.projects.find((p) => p.projectId === project.projectId);
      expect(saved?.creativeDirector).toBe(USER_A_CD);
    });

    // TEST 11: Org A creates project with Org B projectManager -> DENIED
    it("TEST 11: Org A creates project with Org B projectManager -> DENIED", async () => {
      setSession(ORG_A, "owner");

      await expect(
        createProject(
          makeProjectPayload({
            projectName: "Foreign PM Project",
            projectManager: USER_B_PM, // Org B user
          }),
        ),
      ).rejects.toThrow("User not found");

      // Verify no project was created
      const rogue = state.projects.find((p) => p.projectName === "Foreign PM Project");
      expect(rogue).toBeUndefined();
    });

    // TEST 12: Org A creates project with Org B creativeDirector -> DENIED
    it("TEST 12: Org A creates project with Org B creativeDirector -> DENIED", async () => {
      setSession(ORG_A, "owner");

      await expect(
        createProject(
          makeProjectPayload({
            projectName: "Foreign CD Project",
            creativeDirector: USER_B_CD, // Org B user
          }),
        ),
      ).rejects.toThrow("User not found");

      const rogue = state.projects.find((p) => p.projectName === "Foreign CD Project");
      expect(rogue).toBeUndefined();
    });

    // TEST 13: Org A supplies nonexistent projectManager UUID -> DENIED without object-existence leakage
    it("TEST 13: Org A supplies nonexistent projectManager UUID -> DENIED without object-existence leakage", async () => {
      setSession(ORG_A, "owner");

      await expect(
        createProject(
          makeProjectPayload({
            projectName: "Nonexistent PM Project",
            projectManager: NONEXISTENT_USER_ID,
          }),
        ),
      ).rejects.toThrow("User not found");
    });

    // TEST 14: Org A supplies nonexistent creativeDirector UUID -> DENIED without object-existence leakage
    it("TEST 14: Org A supplies nonexistent creativeDirector UUID -> DENIED without object-existence leakage", async () => {
      setSession(ORG_A, "owner");

      await expect(
        createProject(
          makeProjectPayload({
            projectName: "Nonexistent CD Project",
            creativeDirector: NONEXISTENT_USER_ID,
          }),
        ),
      ).rejects.toThrow("User not found");
    });

    // TEST 15: Org A supplies deleted/inactive user reference -> DENIED
    it("TEST 15: Org A supplies deleted/inactive user reference -> DENIED", async () => {
      setSession(ORG_A, "owner");

      // Attempt 1: Inactive user in same organization
      await expect(
        createProject(
          makeProjectPayload({
            projectName: "Inactive User Project",
            projectManager: USER_A_INACTIVE,
          }),
        ),
      ).rejects.toThrow("User not found");

      // Attempt 2: Soft-deleted user in same organization
      await expect(
        createProject(
          makeProjectPayload({
            projectName: "Deleted User Project",
            creativeDirector: USER_A_DELETED,
          }),
        ),
      ).rejects.toThrow("User not found");
    });

    // TEST 16: Org A tampers with organizationId in payload -> ignored/overridden by server context
    it("TEST 16: Org A tampers with organizationId in payload -> ignored/overridden by server context", async () => {
      const userA = setSession(ORG_A, "owner");

      const tamperedPayload = makeProjectPayload({
        projectName: "Tampered Org User Assignment",
        projectManager: USER_A_PM,
      }) as any;
      tamperedPayload.organizationId = ORG_B;

      const project = await createProject(tamperedPayload);

      expect(project.organizationId).toBe(userA.organizationId);
      expect(project.organizationId).toBe(ORG_A);
      expect(project.organizationId).not.toBe(ORG_B);
    });

    // TEST 17: User without projects.create permission attempts assignment -> PermissionDeniedError
    it("TEST 17: User without projects.create permission attempts assignment -> PermissionDeniedError", async () => {
      setSession(ORG_A, "finance");

      await expect(
        createProject(
          makeProjectPayload({
            projectName: "Unauthorized User Assignment",
            projectManager: USER_A_PM,
          }),
        ),
      ).rejects.toThrow(PermissionDeniedError);
    });

    // TEST 18: Unauthenticated caller -> Authentication required
    it("TEST 18: Unauthenticated caller -> Authentication required", async () => {
      state.currentUser = null;

      await expect(
        createProject(
          makeProjectPayload({
            projectName: "Anonymous Assignment",
            projectManager: USER_A_PM,
          }),
        ),
      ).rejects.toThrow(/Authentication required/);
    });
  });
});
