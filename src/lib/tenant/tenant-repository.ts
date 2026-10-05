import { and, eq, isNull, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  clients,
  deliverables,
  organizationMemberships,
  projects,
  tasks,
} from "@/db/schema";
import type { TenantContext } from "@/features/auth/membership-service";

export class SecurityViolationError extends Error {
  readonly code = "SECURITY_VIOLATION";

  constructor(message: string) {
    super(message);
    this.name = "SecurityViolationError";
  }
}

/**
 * Tenant-Bound Repository (Phase 3 & Tenant Security Design §5).
 *
 * Implements Layer 3 of the Four-Layer Defense-in-Depth model:
 * 1. Carries authorized organization context internally.
 * 2. Injects `eq(table.organizationId, this.orgId)` automatically into all data operations.
 * 3. Prevents callers from supplying arbitrary organization IDs to data queries.
 */
export class TenantRepository {
  private readonly orgId: string;
  private readonly uid: string;
  public readonly context: TenantContext;

  constructor(context: TenantContext) {
    if (
      !context ||
      !context.organizationId ||
      !context.userId ||
      !context.membershipId
    ) {
      throw new SecurityViolationError(
        "SECURITY_VIOLATION: Invalid or missing TenantContext supplied to repository",
      );
    }
    this.orgId = context.organizationId;
    this.uid = context.userId;
    this.context = context;
  }

  public get organizationId(): string {
    return this.orgId;
  }

  public get userId(): string {
    return this.uid;
  }

  /**
   * Helper returning an equality predicate binding a table to the authorized organization.
   */
  public withScope<T extends { organizationId: any }>(table: T): SQL {
    return eq(table.organizationId, this.orgId);
  }

  /**
   * Tenant-scoped projects operations.
   */
  public readonly projects = {
    findMany: async (filter?: SQL) => {
      const conditions: SQL[] = [
        eq(projects.organizationId, this.orgId),
        isNull(projects.deletedAt),
      ];
      if (filter) conditions.push(filter);

      return db
        .select()
        .from(projects)
        .where(and(...conditions));
    },

    findById: async (projectId: string) => {
      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.projectId, projectId),
            eq(projects.organizationId, this.orgId),
            isNull(projects.deletedAt),
          ),
        );
      return project ?? null;
    },

    create: async (data: any) => {
      const [record] = await db
        .insert(projects)
        .values({
          ...data,
          organizationId: this.orgId,
          createdBy: this.uid,
          updatedBy: this.uid,
        })
        .returning();
      return record;
    },

    update: async (projectId: string, data: any) => {
      const [record] = await db
        .update(projects)
        .set({
          ...data,
          updatedAt: new Date(),
          updatedBy: this.uid,
        })
        .where(
          and(
            eq(projects.projectId, projectId),
            eq(projects.organizationId, this.orgId),
            isNull(projects.deletedAt),
          ),
        )
        .returning();
      return record ?? null;
    },
  };

  /**
   * Tenant-scoped tasks operations.
   */
  public readonly tasks = {
    findMany: async (filter?: SQL) => {
      const conditions: SQL[] = [
        eq(tasks.organizationId, this.orgId),
        isNull(tasks.deletedAt),
      ];
      if (filter) conditions.push(filter);

      return db
        .select()
        .from(tasks)
        .where(and(...conditions));
    },

    findById: async (taskId: string) => {
      const [task] = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.taskId, taskId),
            eq(tasks.organizationId, this.orgId),
            isNull(tasks.deletedAt),
          ),
        );
      return task ?? null;
    },

    create: async (data: any) => {
      const [record] = await db
        .insert(tasks)
        .values({
          ...data,
          organizationId: this.orgId,
          createdBy: this.uid,
          updatedBy: this.uid,
        })
        .returning();
      return record;
    },

    update: async (taskId: string, data: any) => {
      const [record] = await db
        .update(tasks)
        .set({
          ...data,
          updatedAt: new Date(),
          updatedBy: this.uid,
        })
        .where(
          and(
            eq(tasks.taskId, taskId),
            eq(tasks.organizationId, this.orgId),
            isNull(tasks.deletedAt),
          ),
        )
        .returning();
      return record ?? null;
    },
  };

  /**
   * Tenant-scoped deliverables operations.
   */
  public readonly deliverables = {
    findMany: async (filter?: SQL) => {
      const conditions: SQL[] = [
        eq(deliverables.organizationId, this.orgId),
        isNull(deliverables.deletedAt),
      ];
      if (filter) conditions.push(filter);

      return db
        .select()
        .from(deliverables)
        .where(and(...conditions));
    },

    findById: async (deliverableId: string) => {
      const [deliverable] = await db
        .select()
        .from(deliverables)
        .where(
          and(
            eq(deliverables.deliverableId, deliverableId),
            eq(deliverables.organizationId, this.orgId),
            isNull(deliverables.deletedAt),
          ),
        );
      return deliverable ?? null;
    },
  };

  /**
   * Tenant-scoped clients operations.
   */
  public readonly clients = {
    findMany: async (filter?: SQL) => {
      const conditions: SQL[] = [
        eq(clients.organizationId, this.orgId),
        isNull(clients.deletedAt),
      ];
      if (filter) conditions.push(filter);

      return db
        .select()
        .from(clients)
        .where(and(...conditions));
    },

    findById: async (clientId: string) => {
      const [client] = await db
        .select()
        .from(clients)
        .where(
          and(
            eq(clients.clientId, clientId),
            eq(clients.organizationId, this.orgId),
            isNull(clients.deletedAt),
          ),
        );
      return client ?? null;
    },
  };

  /**
   * Tenant-scoped members operations.
   */
  public readonly members = {
    findMany: async () => {
      return db
        .select()
        .from(organizationMemberships)
        .where(
          and(
            eq(organizationMemberships.organizationId, this.orgId),
            isNull(organizationMemberships.deletedAt),
          ),
        );
    },

    findByUserId: async (userId: string) => {
      const [membership] = await db
        .select()
        .from(organizationMemberships)
        .where(
          and(
            eq(organizationMemberships.organizationId, this.orgId),
            eq(organizationMemberships.userId, userId),
            isNull(organizationMemberships.deletedAt),
          ),
        );
      return membership ?? null;
    },
  };
}

/**
 * Factory creating an authorized, tenant-bound repository instance.
 */
export function createTenantRepository(
  context: TenantContext,
): TenantRepository {
  return new TenantRepository(context);
}

/**
 * Utility helper for applying tenant predicate to any organization-scoped table.
 */
export function withTenantScope<T extends { organizationId: any }>(
  table: T,
  organizationId: string,
): SQL {
  if (!organizationId) {
    throw new SecurityViolationError(
      "SECURITY_VIOLATION: Attempted to construct tenant scope without organizationId",
    );
  }
  return eq(table.organizationId, organizationId);
}
