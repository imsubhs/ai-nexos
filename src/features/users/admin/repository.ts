/**
 * EmployeeAdminRepository (Sprint 2 / WP-105B) — Identity-context writes
 * over platform user rows. This is the ONLY write surface for employee
 * administration; the Workforce EmployeeReadRepository stays read-only
 * (merge doc 14 §13.1 conformist boundary).
 *
 * Org-aware invariants enforced by every implementation:
 * - email unique within the organization (create);
 * - departmentId must reference a live department of the same org;
 * - managerId must reference a live, active user of the same org,
 *   never self, and never create a cycle in the manager chain;
 * - archived employees reject all writes except restore.
 */
import type { z } from "zod";
import type {
  archiveEmployeeSchema,
  createEmployeeSchema,
  setEmployeeStatusSchema,
  updateEmployeeSchema,
} from "./schemas";

export type CreateEmployeeData = z.output<typeof createEmployeeSchema>;
export type UpdateEmployeeData = z.output<typeof updateEmployeeSchema>;
export type SetEmployeeStatusData = z.output<typeof setEmployeeStatusSchema>;
export type ArchiveEmployeeData = z.output<typeof archiveEmployeeSchema>;

/** Invariant violations — actions surface `.message` to the form. */
export class EmployeeAdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmployeeAdminError";
  }
}

export interface EmployeeAdminRepository {
  create(
    organizationId: string,
    actorUserId: string,
    data: CreateEmployeeData,
  ): Promise<{ userId: string }>;
  update(
    organizationId: string,
    actorUserId: string,
    data: UpdateEmployeeData,
  ): Promise<{ userId: string }>;
  setStatus(
    organizationId: string,
    actorUserId: string,
    data: SetEmployeeStatusData,
  ): Promise<{ userId: string }>;
  archive(
    organizationId: string,
    actorUserId: string,
    data: ArchiveEmployeeData,
  ): Promise<{ userId: string }>;
  restore(
    organizationId: string,
    actorUserId: string,
    userId: string,
  ): Promise<{ userId: string }>;
}

/**
 * Walks the manager chain upward from `candidateManagerId`; assigning is a
 * cycle iff `userId` appears on that chain. Bounded to guard against
 * corrupt data producing an infinite walk.
 */
export async function wouldCreateManagerCycle(
  userId: string,
  candidateManagerId: string,
  getManagerId: (id: string) => Promise<string | null>,
): Promise<boolean> {
  let current: string | null = candidateManagerId;
  for (let hops = 0; current !== null && hops < 100; hops++) {
    if (current === userId) return true;
    current = await getManagerId(current);
  }
  return false;
}
