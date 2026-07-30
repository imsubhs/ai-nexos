/**
 * DemoStore-backed EmployeeReadRepository (merge doc 15 §0 demo contract).
 * Reads live store state — never hardcoded results (report 09 §C1 rule).
 *
 * Null-safe by design against not-yet-seeded data (doc 17 WP-102 acceptance):
 * - employeeCode / managerId / location arrive with WP-103's seed extension;
 * - todayStatus lights up when WP-108 adds the attendanceRecords collection.
 */
import { getDemoStore, type DemoStore } from "@/lib/demo/store";
import type { AttendanceStatus } from "../shared/enums";
import type { EmployeeListFilters, EmployeeReadRepository } from "./repository";
import type { EmployeeDirectoryEntry } from "./types";

type DemoUser = {
  userId: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string | null;
  avatarUrl: string | null;
  designation: string | null;
  departmentId: string | null;
  status: string;
  deletedAt: unknown;
  // WP-103 seed-extension fields (absent until then):
  employeeCode?: string | null;
  managerId?: string | null;
  location?: string | null;
  employmentType?: string | null;
  // Sprint 2 (WP-105B) lifecycle fields:
  hireDate?: string | null;
  terminationDate?: string | null;
  isArchived?: boolean;
};

type DemoDepartment = { departmentId: string; name: string };
type DemoAttendanceRecord = {
  userId: string;
  date: string;
  status: AttendanceStatus;
};

/** Collections that later WPs register on the DemoStore type (WP-103/WP-108). */
type FutureCollections = {
  departments?: DemoDepartment[];
  attendanceRecords?: DemoAttendanceRecord[];
};

function fullName(user: DemoUser): string {
  return [user.firstName, user.lastName].filter(Boolean).join(" ");
}

function isArchivedUser(user: DemoUser): boolean {
  return user.status === "archived" || user.isArchived === true;
}

function toEntry(
  user: DemoUser,
  usersById: Map<string, DemoUser>,
  departmentsById: Map<string, DemoDepartment>,
  todayStatusByUserId: Map<string, AttendanceStatus>,
): EmployeeDirectoryEntry {
  const manager = user.managerId ? usersById.get(user.managerId) : undefined;
  const department = user.departmentId
    ? departmentsById.get(user.departmentId)
    : undefined;
  return {
    userId: user.userId,
    employeeCode: user.employeeCode ?? null,
    firstName: user.firstName,
    lastName: user.lastName ?? "",
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    designation: user.designation ?? null,
    departmentId: user.departmentId ?? null,
    departmentName: department?.name ?? null,
    managerId: user.managerId ?? null,
    managerName: manager ? fullName(manager) : null,
    location: user.location ?? null,
    employmentType: user.employmentType ?? null,
    hireDate: user.hireDate ?? null,
    terminationDate: user.terminationDate ?? null,
    entityStatus: isArchivedUser(user)
      ? "archived"
      : user.status === "active"
        ? "active"
        : "inactive",
    todayStatus: todayStatusByUserId.get(user.userId) ?? null,
  };
}

function loadOrgUsers(organizationId: string) {
  const store = getDemoStore() as DemoStore & FutureCollections;
  const users = (store.users as DemoUser[]).filter(
    (u) => u.organizationId === organizationId && u.deletedAt == null,
  );
  const usersById = new Map(users.map((u) => [u.userId, u]));
  const departmentsById = new Map(
    (store.departments ?? []).map((d) => [d.departmentId, d]),
  );
  const today = new Date().toISOString().slice(0, 10);
  const todayStatusByUserId = new Map(
    (store.attendanceRecords ?? [])
      .filter((r) => r.date === today)
      .map((r) => [r.userId, r.status]),
  );
  return { users, usersById, departmentsById, todayStatusByUserId };
}

export const mockEmployeeReadRepository: EmployeeReadRepository = {
  async list(organizationId: string, filters: EmployeeListFilters) {
    const { users, usersById, departmentsById, todayStatusByUserId } =
      loadOrgUsers(organizationId);

    let rows = users;
    if (filters.status === "archived") {
      rows = rows.filter(isArchivedUser);
    } else if (filters.status === "active") {
      rows = rows.filter((u) => u.status === "active");
    } else if (filters.status === "inactive") {
      rows = rows.filter((u) => u.status !== "active" && !isArchivedUser(u));
    } else {
      // Unfiltered directory excludes archived employees by default.
      rows = rows.filter((u) => !isArchivedUser(u));
    }
    if (filters.departmentId) {
      rows = rows.filter((u) => u.departmentId === filters.departmentId);
    }
    if (filters.search) {
      const needle = filters.search.toLowerCase();
      rows = rows.filter((u) =>
        [fullName(u), u.email, u.employeeCode ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      );
    }

    rows = [...rows].sort((a, b) => fullName(a).localeCompare(fullName(b)));
    const total = rows.length;
    const start = (filters.page - 1) * filters.pageSize;
    const pageRows = rows.slice(start, start + filters.pageSize);

    return {
      rows: pageRows.map((u) =>
        toEntry(u, usersById, departmentsById, todayStatusByUserId),
      ),
      total,
    };
  },

  async findById(organizationId: string, userId: string) {
    const { usersById, departmentsById, todayStatusByUserId } =
      loadOrgUsers(organizationId);
    const user = usersById.get(userId);
    if (!user) return null;
    return toEntry(user, usersById, departmentsById, todayStatusByUserId);
  },

  async listDirectReports(organizationId: string, managerId: string) {
    const { users, usersById, departmentsById, todayStatusByUserId } =
      loadOrgUsers(organizationId);
    return users
      .filter((u) => u.managerId === managerId && !isArchivedUser(u))
      .sort((a, b) => fullName(a).localeCompare(fullName(b)))
      .map((u) => toEntry(u, usersById, departmentsById, todayStatusByUserId));
  },
};
