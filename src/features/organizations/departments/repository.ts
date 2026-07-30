/**
 * DepartmentReadRepository (Sprint 2 / WP-105A) — read-only projection over
 * the Organizations-owned `departments` collection, joined with platform
 * users for headcount. Mirrors the EmployeeReadRepository boundary style
 * (merge doc 14 §13.1): no write methods; department administration belongs
 * to the Organizations context.
 */
import type { z } from "zod";
import type { listDepartmentsSchema } from "./schemas";
import type { DepartmentEntry, DepartmentListResult } from "./types";

export type DepartmentListFilters = z.output<typeof listDepartmentsSchema>;

export interface DepartmentReadRepository {
  list(
    organizationId: string,
    filters: DepartmentListFilters,
  ): Promise<DepartmentListResult>;
  findById(
    organizationId: string,
    departmentId: string,
  ): Promise<DepartmentEntry | null>;
}
