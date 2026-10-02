/**
 * Employee slice server actions — real (Drizzle) adapter.
 * Contracts E-1/E-2 (merge doc 15 §3): read-only over platform users;
 * no audit/notification/search side effects (reads).
 * Runtime wiring for the real path lands in Phase 7.
 */
import { requireCurrentUser } from "@/features/auth/current-user";
import { requirePermission } from "@/features/permissions";
import { realEmployeeReadRepository } from "./real-repository";
import {
  getEmployeeSchema,
  listDirectReportsSchema,
  listEmployeesSchema,
  type GetEmployeeInput,
  type ListDirectReportsInput,
  type ListEmployeesInput,
} from "./schemas";
import type { EmployeeDirectoryEntry, EmployeeListResult } from "./types";

/** E-1 `listEmployeesAction` (Q-9) — permission `users.read`. */
export async function listEmployeesAction(
  input: ListEmployeesInput = {},
): Promise<EmployeeListResult> {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "users", "read");

  const filters = listEmployeesSchema.parse(input);
  // Org scoping from CurrentUser — never from input (doc 15 §0).
  return realEmployeeReadRepository.list(user.organizationId, filters);
}

/** E-2 `getEmployeeAction` (Q-10) — permission `users.read`. */
export async function getEmployeeAction(
  input: GetEmployeeInput,
): Promise<EmployeeDirectoryEntry | null> {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "users", "read");

  const { userId } = getEmployeeSchema.parse(input);
  return realEmployeeReadRepository.findById(user.organizationId, userId);
}

/** Sprint 2 (WP-105C) direct-reports read — permission `users.read`. */
export async function listDirectReportsAction(
  input: ListDirectReportsInput,
): Promise<EmployeeDirectoryEntry[]> {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "users", "read");

  const { managerId } = listDirectReportsSchema.parse(input);
  return realEmployeeReadRepository.listDirectReports(
    user.organizationId,
    managerId,
  );
}
