/**
 * Department slice server actions (Sprint 2 / WP-105A) — DEMO_MODE adapter.
 * Identical contract to real-actions.ts (auth preamble, validation, org
 * scoping) over the DemoStore-backed repository (doc 15 §0 demo parity).
 */
import { requireCurrentUser } from "@/features/auth/current-user";
import { requirePermission } from "@/features/permissions";
import { mockDepartmentReadRepository } from "./mock-repository";
import {
  getDepartmentSchema,
  listDepartmentsSchema,
  type GetDepartmentInput,
  type ListDepartmentsInput,
} from "./schemas";
import type { DepartmentEntry, DepartmentListResult } from "./types";

export async function listDepartmentsAction(
  input: ListDepartmentsInput = {},
): Promise<DepartmentListResult> {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "departments", "read");

  const filters = listDepartmentsSchema.parse(input);
  return mockDepartmentReadRepository.list(user.organizationId, filters);
}

export async function getDepartmentAction(
  input: GetDepartmentInput,
): Promise<DepartmentEntry | null> {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "departments", "read");

  const { departmentId } = getDepartmentSchema.parse(input);
  return mockDepartmentReadRepository.findById(
    user.organizationId,
    departmentId,
  );
}
