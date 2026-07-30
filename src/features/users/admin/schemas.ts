/**
 * Employee administration DTOs (Sprint 2 / WP-105B).
 *
 * Lives in the Identity (users) context — merge doc 14 §13.1 keeps the
 * Workforce EmployeeReadRepository read-only; employees ARE platform users,
 * so employee administration writes user rows here.
 */
import { z } from "zod";

export const EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "intern",
] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");

const employeeCore = {
  firstName: z.string().min(1, "First name is required").max(100).optional(),
  lastName: z.string().max(100).optional(),
  designation: z.string().max(150).optional(),
  departmentId: z.string().uuid().nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
  location: z.string().max(150).optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  hireDate: isoDate.optional(),
};

export const createEmployeeSchema = z.object({
  email: z.string().email("Valid email is required").max(255),
  ...employeeCore,
  firstName: z.string().min(1, "First name is required").max(100),
});

export type CreateEmployeeInput = z.input<typeof createEmployeeSchema>;

/** Email is identity — changing it belongs to auth flows, not employee admin. */
export const updateEmployeeSchema = z.object({
  userId: z.string().uuid(),
  ...employeeCore,
});

export type UpdateEmployeeInput = z.input<typeof updateEmployeeSchema>;

export const setEmployeeStatusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(["active", "inactive"]),
});

export type SetEmployeeStatusInput = z.input<typeof setEmployeeStatusSchema>;

export const archiveEmployeeSchema = z.object({
  userId: z.string().uuid(),
  terminationDate: isoDate.optional(),
});

export type ArchiveEmployeeInput = z.input<typeof archiveEmployeeSchema>;

export const restoreEmployeeSchema = z.object({
  userId: z.string().uuid(),
});

export type RestoreEmployeeInput = z.input<typeof restoreEmployeeSchema>;

export const assignDepartmentSchema = z.object({
  userId: z.string().uuid(),
  departmentId: z.string().uuid().nullable(),
});

export type AssignDepartmentInput = z.input<typeof assignDepartmentSchema>;

export const assignManagerSchema = z.object({
  userId: z.string().uuid(),
  managerId: z.string().uuid().nullable(),
});

export type AssignManagerInput = z.input<typeof assignManagerSchema>;

/** Form-facing action result — validation failures surface as messages. */
export type EmployeeAdminResult =
  { ok: true; userId: string } | { ok: false; error: string };
