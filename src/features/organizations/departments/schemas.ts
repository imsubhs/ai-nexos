/**
 * Department slice DTO validation (Sprint 2 / WP-105A query contracts).
 * No departments-list contract existed in merge doc 15 (WP-105 tech-debt
 * note 1); these contracts close that gap. Read-only — no write DTOs.
 */
import { z } from "zod";

export const listDepartmentsSchema = z.object({
  search: z.string().max(200).optional(),
  status: z.enum(["active", "inactive", "archived"]).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z
    .union([z.literal(10), z.literal(25), z.literal(50), z.literal(100)])
    .default(100),
});

export type ListDepartmentsInput = z.input<typeof listDepartmentsSchema>;

export const getDepartmentSchema = z.object({
  departmentId: z.string().uuid(),
});

export type GetDepartmentInput = z.input<typeof getDepartmentSchema>;
