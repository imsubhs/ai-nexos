/**
 * Employee slice DTO validation (merge doc 15 §3, contracts E-1/E-2).
 */
import { z } from "zod";

export const listEmployeesSchema = z.object({
  search: z.string().max(200).optional(),
  departmentId: z.string().uuid().optional(),
  // "archived" opts in to the archived lens; unfiltered lists exclude them.
  status: z.enum(["active", "inactive", "archived"]).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.union([
    z.literal(10),
    z.literal(25),
    z.literal(50),
    z.literal(100),
  ]).default(25),
});

export type ListEmployeesInput = z.input<typeof listEmployeesSchema>;

export const getEmployeeSchema = z.object({
  userId: z.string().uuid(),
});

export type GetEmployeeInput = z.input<typeof getEmployeeSchema>;

export const listDirectReportsSchema = z.object({
  managerId: z.string().uuid(),
});

export type ListDirectReportsInput = z.input<typeof listDirectReportsSchema>;
