/**
 * Drizzle-backed EmployeeReadRepository. Compile-safe now; becomes the live
 * runtime path when Supabase is wired in Phase 7 (merge doc 11 v2).
 *
 * Column availability (doc 17 WP-102 acceptance — null-safe by design):
 * - users.employee_code / manager_id / location are AUTHORED in Phase 2
 *   (doc 11 v2 §2.1); until that migration lands in the schema file, the
 *   corresponding read-model fields map to null here.
 * - todayStatus joins attendance_records once WP-106/WP-108 land.
 */
import { db } from "@/db";
import { departments, users } from "@/db/schema";
import { and, count, eq, ilike, isNull, ne, or } from "drizzle-orm";
import type { EmployeeListFilters, EmployeeReadRepository } from "./repository";
import type { EmployeeDirectoryEntry } from "./types";

type EmployeeRow = {
  user: typeof users.$inferSelect;
  departmentName: string | null;
};

function toEntry(row: EmployeeRow): EmployeeDirectoryEntry {
  const u = row.user;
  return {
    userId: u.userId,
    employeeCode: null, // Phase 2 §2.1 column, then u.employeeCode
    firstName: u.firstName,
    lastName: u.lastName ?? "",
    email: u.email,
    avatarUrl: u.avatarUrl,
    designation: u.designation,
    departmentId: u.departmentId,
    departmentName: row.departmentName,
    managerId: null, // Phase 2 §2.1 column, then u.managerId (+ self-join for name)
    managerName: null,
    location: null, // Phase 2 §2.1 column
    employmentType: u.employmentType,
    hireDate: u.joiningDate, // users.joining_date; termination_date is Phase 2
    terminationDate: null,
    entityStatus: u.status,
    todayStatus: null, // joins attendance_records after WP-108
  };
}

function buildFilters(organizationId: string, filters: EmployeeListFilters) {
  const conditions = [
    eq(users.organizationId, organizationId),
    isNull(users.deletedAt),
  ];
  if (filters.status) {
    conditions.push(eq(users.status, filters.status));
  } else {
    // Unfiltered directory excludes archived employees by default.
    conditions.push(ne(users.status, "archived"));
  }
  if (filters.departmentId) {
    conditions.push(eq(users.departmentId, filters.departmentId));
  }
  if (filters.search) {
    const needle = `%${filters.search}%`;
    const searchCondition = or(
      ilike(users.firstName, needle),
      ilike(users.lastName, needle),
      ilike(users.email, needle),
      // + ilike(users.employeeCode, needle) once the Phase 2 column exists
    );
    if (searchCondition) conditions.push(searchCondition);
  }
  return and(...conditions);
}

export const realEmployeeReadRepository: EmployeeReadRepository = {
  async list(organizationId: string, filters: EmployeeListFilters) {
    const where = buildFilters(organizationId, filters);

    const [rows, totals] = await Promise.all([
      db
        .select({ user: users, departmentName: departments.departmentName })
        .from(users)
        .leftJoin(departments, eq(users.departmentId, departments.departmentId))
        .where(where)
        .orderBy(users.firstName, users.lastName)
        .limit(filters.pageSize)
        .offset((filters.page - 1) * filters.pageSize),
      db.select({ value: count() }).from(users).where(where),
    ]);

    return {
      rows: rows.map(toEntry),
      total: totals[0]?.value ?? 0,
    };
  },

  async findById(organizationId: string, userId: string) {
    const rows = await db
      .select({ user: users, departmentName: departments.departmentName })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.departmentId))
      .where(
        and(
          eq(users.organizationId, organizationId),
          eq(users.userId, userId),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    const row = rows[0];
    return row ? toEntry(row) : null;
  },

  async listDirectReports() {
    // users.manager_id is a Phase 2 §2.1 column; until it lands the real
    // path has no reporting edge to query. Empty is the null-safe answer.
    return [];
  },
};
