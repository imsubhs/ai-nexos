"use server";

/**
 * Employee slice server actions — DEMO_MODE adapter.
 * Identical contract to real-actions.ts (auth preamble, validation, org
 * scoping) over the DemoStore-backed repository, so demo parity is
 * behavioral, not cosmetic (doc 15 §0).
 */
import { requireCurrentUser } from "@/features/auth/current-user";
import { requirePermission } from "@/features/permissions";
import { mockEmployeeReadRepository } from "./mock-repository";
import {
  getEmployeeSchema,
  listDirectReportsSchema,
  listEmployeesSchema,
  type GetEmployeeInput,
  type ListDirectReportsInput,
  type ListEmployeesInput,
} from "./schemas";
import type { EmployeeDirectoryEntry, EmployeeListResult } from "./types";

export async function listEmployeesAction(
  input: ListEmployeesInput = {},
): Promise<EmployeeListResult> {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "users", "read");

  const filters = listEmployeesSchema.parse(input);
  return mockEmployeeReadRepository.list(user.organizationId, filters);
}

export async function getEmployeeAction(
  input: GetEmployeeInput,
): Promise<EmployeeDirectoryEntry | null> {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "users", "read");

  const { userId } = getEmployeeSchema.parse(input);
  return mockEmployeeReadRepository.findById(user.organizationId, userId);
}

export async function listDirectReportsAction(
  input: ListDirectReportsInput,
): Promise<EmployeeDirectoryEntry[]> {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "users", "read");

  const { managerId } = listDirectReportsSchema.parse(input);
  return mockEmployeeReadRepository.listDirectReports(
    user.organizationId,
    managerId,
  );
}
