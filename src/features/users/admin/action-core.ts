/**
 * Shared employee-admin action pipeline (Sprint 2 / WP-105B): auth
 * preamble → permission gate → DTO validation → repository → path
 * revalidation. real-actions/mock-actions differ only in the repository
 * they bind, so the pipeline lives once here (no-duplicate-logic rule).
 */
import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/features/auth/current-user";
import { requirePermission, type Action } from "@/features/permissions";
import { EmployeeAdminError, type EmployeeAdminRepository } from "./repository";
import {
  archiveEmployeeSchema,
  assignDepartmentSchema,
  assignManagerSchema,
  createEmployeeSchema,
  restoreEmployeeSchema,
  setEmployeeStatusSchema,
  updateEmployeeSchema,
  type ArchiveEmployeeInput,
  type AssignDepartmentInput,
  type AssignManagerInput,
  type CreateEmployeeInput,
  type EmployeeAdminResult,
  type RestoreEmployeeInput,
  type SetEmployeeStatusInput,
  type UpdateEmployeeInput,
} from "./schemas";

function revalidateEmployeePaths(userId: string): void {
  revalidatePath("/workforce/employees");
  revalidatePath(`/workforce/employees/${userId}`);
}

async function run(
  action: Action,
  execute: (
    organizationId: string,
    actorUserId: string,
  ) => Promise<{ userId: string }>,
): Promise<EmployeeAdminResult> {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "users", action);
  try {
    const { userId } = await execute(user.organizationId, user.userId);
    revalidateEmployeePaths(userId);
    return { ok: true, userId };
  } catch (error) {
    if (error instanceof EmployeeAdminError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export function buildEmployeeAdminActions(repo: EmployeeAdminRepository) {
  return {
    createEmployee(input: CreateEmployeeInput): Promise<EmployeeAdminResult> {
      return run("create", (orgId, actorId) =>
        repo.create(orgId, actorId, createEmployeeSchema.parse(input)),
      );
    },
    updateEmployee(input: UpdateEmployeeInput): Promise<EmployeeAdminResult> {
      return run("update", (orgId, actorId) =>
        repo.update(orgId, actorId, updateEmployeeSchema.parse(input)),
      );
    },
    setEmployeeStatus(
      input: SetEmployeeStatusInput,
    ): Promise<EmployeeAdminResult> {
      return run("update", (orgId, actorId) =>
        repo.setStatus(orgId, actorId, setEmployeeStatusSchema.parse(input)),
      );
    },
    archiveEmployee(input: ArchiveEmployeeInput): Promise<EmployeeAdminResult> {
      return run("archive", (orgId, actorId) =>
        repo.archive(orgId, actorId, archiveEmployeeSchema.parse(input)),
      );
    },
    restoreEmployee(input: RestoreEmployeeInput): Promise<EmployeeAdminResult> {
      return run("restore", (orgId, actorId) =>
        repo.restore(orgId, actorId, restoreEmployeeSchema.parse(input).userId),
      );
    },
    /** Department assignment routes through update() — one write surface. */
    assignDepartment(
      input: AssignDepartmentInput,
    ): Promise<EmployeeAdminResult> {
      const parsed = assignDepartmentSchema.parse(input);
      return run("update", (orgId, actorId) =>
        repo.update(orgId, actorId, {
          userId: parsed.userId,
          departmentId: parsed.departmentId,
        }),
      );
    },
    /** Manager assignment routes through update() — one write surface. */
    assignManager(input: AssignManagerInput): Promise<EmployeeAdminResult> {
      const parsed = assignManagerSchema.parse(input);
      return run("update", (orgId, actorId) =>
        repo.update(orgId, actorId, {
          userId: parsed.userId,
          managerId: parsed.managerId,
        }),
      );
    },
  };
}
