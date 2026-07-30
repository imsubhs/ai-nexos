"use server";

/**
 * Employee admin server actions (Sprint 2 / WP-105B) — DEMO_MODE adapter.
 * Same pipeline as real-actions.ts bound to the DemoStore repository, so
 * demo parity is behavioral (doc 15 §0).
 */
import { buildEmployeeAdminActions } from "./action-core";
import { mockEmployeeAdminRepository } from "./mock-repository";
import type {
  ArchiveEmployeeInput,
  AssignDepartmentInput,
  AssignManagerInput,
  CreateEmployeeInput,
  EmployeeAdminResult,
  RestoreEmployeeInput,
  SetEmployeeStatusInput,
  UpdateEmployeeInput,
} from "./schemas";

const actions = buildEmployeeAdminActions(mockEmployeeAdminRepository);

export async function createEmployeeAction(
  input: CreateEmployeeInput,
): Promise<EmployeeAdminResult> {
  return actions.createEmployee(input);
}

export async function updateEmployeeAction(
  input: UpdateEmployeeInput,
): Promise<EmployeeAdminResult> {
  return actions.updateEmployee(input);
}

export async function setEmployeeStatusAction(
  input: SetEmployeeStatusInput,
): Promise<EmployeeAdminResult> {
  return actions.setEmployeeStatus(input);
}

export async function archiveEmployeeAction(
  input: ArchiveEmployeeInput,
): Promise<EmployeeAdminResult> {
  return actions.archiveEmployee(input);
}

export async function restoreEmployeeAction(
  input: RestoreEmployeeInput,
): Promise<EmployeeAdminResult> {
  return actions.restoreEmployee(input);
}

export async function assignDepartmentAction(
  input: AssignDepartmentInput,
): Promise<EmployeeAdminResult> {
  return actions.assignDepartment(input);
}

export async function assignManagerAction(
  input: AssignManagerInput,
): Promise<EmployeeAdminResult> {
  return actions.assignManager(input);
}
