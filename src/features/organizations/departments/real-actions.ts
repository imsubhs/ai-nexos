/**
 * Department slice server actions (Sprint 2 / WP-105A) — real path.
 * Permission gate: departments.read (merge doc 14 §9 vocabulary).
 */
import { requireCurrentUser } from "@/features/auth/current-user";
import { requirePermission } from "@/features/permissions";
import { realDepartmentReadRepository } from "./real-repository";
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
  return realDepartmentReadRepository.list(user.organizationId, filters);
}

export async function getDepartmentAction(
  input: GetDepartmentInput,
): Promise<DepartmentEntry | null> {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "departments", "read");

  const { departmentId } = getDepartmentSchema.parse(input);
  return realDepartmentReadRepository.findById(
    user.organizationId,
    departmentId,
  );
}
