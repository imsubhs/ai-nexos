/**
 * Drizzle-backed EmployeeAdminRepository (Sprint 2 / WP-105B).
 * Compile-safe now; becomes the live runtime path when Supabase is wired
 * in Phase 7 (merge doc 11 v2).
 *
 * Column availability (same posture as the workforce read slice):
 * - users.manager_id / location / employee_code / termination_date are
 *   Phase 2 §2.1 columns — until that migration lands, manager/location
 *   writes are accepted but not persisted here (tracked tech debt);
 * - hireDate maps to the existing users.joining_date column;
 * - create() requires identity provisioning (auth.users mirror + role
 *   seed) which is a Phase 7 flow — it fails loudly rather than writing
 *   a half-provisioned user.
 */
import { db } from "@/db";
import { departments, users } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import {
  EmployeeAdminError,
  type ArchiveEmployeeData,
  type EmployeeAdminRepository,
  type SetEmployeeStatusData,
  type UpdateEmployeeData,
} from "./repository";

async function requireUser(organizationId: string, userId: string) {
  const [row] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.organizationId, organizationId),
        eq(users.userId, userId),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);
  if (!row) throw new EmployeeAdminError("Employee not found.");
  return row;
}

async function validateDepartment(
  organizationId: string,
  departmentId: string,
): Promise<void> {
  const [row] = await db
    .select({ departmentId: departments.departmentId })
    .from(departments)
    .where(
      and(
        eq(departments.organizationId, organizationId),
        eq(departments.departmentId, departmentId),
        isNull(departments.deletedAt),
      ),
    )
    .limit(1);
  if (!row) {
    throw new EmployeeAdminError(
      "Department does not belong to this organization.",
    );
  }
}

export const realEmployeeAdminRepository: EmployeeAdminRepository = {
  async create() {
    // Real-mode employee creation provisions an auth identity (Supabase
    // invite) before the users row exists — that flow lands in Phase 7.
    throw new EmployeeAdminError(
      "Employee creation requires identity provisioning, which is wired in Phase 7.",
    );
  },

  async update(organizationId, actorUserId, data: UpdateEmployeeData) {
    const user = await requireUser(organizationId, data.userId);
    if (user.status === "archived") {
      throw new EmployeeAdminError(
        "Employee is archived — restore them before making changes.",
      );
    }
    if (data.departmentId) {
      await validateDepartment(organizationId, data.departmentId);
    }
    // manager_id/location/employee_code are Phase 2 columns; manager-cycle
    // validation activates alongside them (see mock-repository parity).
    await db
      .update(users)
      .set({
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName ?? null }),
        ...(data.designation !== undefined && {
          designation: data.designation ?? null,
        }),
        ...(data.departmentId !== undefined && {
          departmentId: data.departmentId,
        }),
        ...(data.employmentType !== undefined &&
          data.employmentType && { employmentType: data.employmentType }),
        ...(data.hireDate !== undefined && {
          joiningDate: data.hireDate ?? null,
        }),
        updatedAt: new Date(),
        updatedBy: actorUserId,
      })
      .where(eq(users.userId, user.userId));
    return { userId: user.userId };
  },

  async setStatus(organizationId, actorUserId, data: SetEmployeeStatusData) {
    const user = await requireUser(organizationId, data.userId);
    if (user.status === "archived") {
      throw new EmployeeAdminError(
        "Employee is archived — restore them before making changes.",
      );
    }
    if (user.userId === actorUserId && data.status === "inactive") {
      throw new EmployeeAdminError("You cannot deactivate yourself.");
    }
    await db
      .update(users)
      .set({
        status: data.status,
        updatedAt: new Date(),
        updatedBy: actorUserId,
      })
      .where(eq(users.userId, user.userId));
    return { userId: user.userId };
  },

  async archive(organizationId, actorUserId, data: ArchiveEmployeeData) {
    const user = await requireUser(organizationId, data.userId);
    if (user.userId === actorUserId) {
      throw new EmployeeAdminError("You cannot archive yourself.");
    }
    if (user.status === "archived") {
      throw new EmployeeAdminError("Employee is already archived.");
    }
    await db
      .update(users)
      .set({
        status: "archived",
        updatedAt: new Date(),
        updatedBy: actorUserId,
      })
      .where(eq(users.userId, user.userId));
    return { userId: user.userId };
  },

  async restore(organizationId, actorUserId, userId) {
    const user = await requireUser(organizationId, userId);
    if (user.status !== "archived") {
      throw new EmployeeAdminError("Employee is not archived.");
    }
    await db
      .update(users)
      .set({ status: "active", updatedAt: new Date(), updatedBy: actorUserId })
      .where(eq(users.userId, user.userId));
    return { userId: user.userId };
  },
};
