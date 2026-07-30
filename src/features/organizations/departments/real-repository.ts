/**
 * Drizzle-backed DepartmentReadRepository (Sprint 2 / WP-105A).
 * Compile-safe now; becomes the live runtime path when Supabase is wired
 * in Phase 7 (merge doc 11 v2) — same posture as the employees slice.
 */
import { db } from "@/db";
import { departments, users } from "@/db/schema";
import { and, count, eq, ilike, isNull } from "drizzle-orm";
import type {
  DepartmentListFilters,
  DepartmentReadRepository,
} from "./repository";
import type { DepartmentEntry } from "./types";

type DepartmentRow = typeof departments.$inferSelect & {
  memberCount: number;
};

function toEntry(row: DepartmentRow): DepartmentEntry {
  return {
    departmentId: row.departmentId,
    name: row.departmentName,
    description: row.description,
    departmentHeadId: row.departmentHead,
    status: row.status,
    memberCount: row.memberCount,
  };
}

function buildFilters(organizationId: string, filters: DepartmentListFilters) {
  const conditions = [
    eq(departments.organizationId, organizationId),
    isNull(departments.deletedAt),
  ];
  if (filters.status) {
    conditions.push(eq(departments.status, filters.status));
  }
  if (filters.search) {
    conditions.push(ilike(departments.departmentName, `%${filters.search}%`));
  }
  return and(...conditions);
}

async function loadMemberCounts(
  organizationId: string,
): Promise<Map<string, number>> {
  const rows = await db
    .select({ departmentId: users.departmentId, memberCount: count() })
    .from(users)
    .where(
      and(
        eq(users.organizationId, organizationId),
        eq(users.status, "active"),
        isNull(users.deletedAt),
      ),
    )
    .groupBy(users.departmentId);
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.departmentId) counts.set(row.departmentId, row.memberCount);
  }
  return counts;
}

export const realDepartmentReadRepository: DepartmentReadRepository = {
  async list(organizationId: string, filters: DepartmentListFilters) {
    const where = buildFilters(organizationId, filters);
    const [rows, [{ total }], memberCounts] = await Promise.all([
      db
        .select()
        .from(departments)
        .where(where)
        .orderBy(departments.departmentName)
        .limit(filters.pageSize)
        .offset((filters.page - 1) * filters.pageSize),
      db.select({ total: count() }).from(departments).where(where),
      loadMemberCounts(organizationId),
    ]);
    return {
      rows: rows.map((row) =>
        toEntry({
          ...row,
          memberCount: memberCounts.get(row.departmentId) ?? 0,
        }),
      ),
      total,
    };
  },

  async findById(organizationId: string, departmentId: string) {
    const [row] = await db
      .select()
      .from(departments)
      .where(
        and(
          eq(departments.organizationId, organizationId),
          eq(departments.departmentId, departmentId),
          isNull(departments.deletedAt),
        ),
      )
      .limit(1);
    if (!row) return null;
    const memberCounts = await loadMemberCounts(organizationId);
    return toEntry({
      ...row,
      memberCount: memberCounts.get(row.departmentId) ?? 0,
    });
  },
};
