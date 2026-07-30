/**
 * DemoStore-backed DepartmentReadRepository (Sprint 2 / WP-105A).
 * Reads live store state — never hardcoded results (report 09 §C1 rule).
 */
import { getDemoStore } from "@/lib/demo/store";
import type {
  DepartmentListFilters,
  DepartmentReadRepository,
} from "./repository";
import type { DepartmentEntry } from "./types";

type DemoDepartment = {
  departmentId: string;
  organizationId: string;
  name: string;
  description?: string | null;
  departmentHead?: string | null;
  status?: string;
  deletedAt: unknown;
};

type DemoUser = {
  organizationId: string;
  departmentId: string | null;
  status: string;
  deletedAt: unknown;
};

function toEntry(
  department: DemoDepartment,
  memberCountByDepartment: Map<string, number>,
): DepartmentEntry {
  const status = department.status ?? "active";
  return {
    departmentId: department.departmentId,
    name: department.name,
    description: department.description ?? null,
    departmentHeadId: department.departmentHead ?? null,
    status:
      status === "inactive" || status === "archived" ? status : "active",
    memberCount: memberCountByDepartment.get(department.departmentId) ?? 0,
  };
}

function loadOrgDepartments(organizationId: string) {
  const store = getDemoStore();
  const departments = (store.departments as DemoDepartment[]).filter(
    (d) => d.organizationId === organizationId && d.deletedAt == null,
  );
  const memberCountByDepartment = new Map<string, number>();
  for (const user of store.users as DemoUser[]) {
    if (
      user.organizationId !== organizationId ||
      user.deletedAt != null ||
      user.status !== "active" ||
      !user.departmentId
    ) {
      continue;
    }
    memberCountByDepartment.set(
      user.departmentId,
      (memberCountByDepartment.get(user.departmentId) ?? 0) + 1,
    );
  }
  return { departments, memberCountByDepartment };
}

export const mockDepartmentReadRepository: DepartmentReadRepository = {
  async list(organizationId: string, filters: DepartmentListFilters) {
    const { departments, memberCountByDepartment } =
      loadOrgDepartments(organizationId);

    let rows = departments;
    if (filters.status) {
      rows = rows.filter((d) => (d.status ?? "active") === filters.status);
    }
    if (filters.search) {
      const needle = filters.search.toLowerCase();
      rows = rows.filter((d) => d.name.toLowerCase().includes(needle));
    }

    rows = [...rows].sort((a, b) => a.name.localeCompare(b.name));
    const total = rows.length;
    const start = (filters.page - 1) * filters.pageSize;
    return {
      rows: rows
        .slice(start, start + filters.pageSize)
        .map((d) => toEntry(d, memberCountByDepartment)),
      total,
    };
  },

  async findById(organizationId: string, departmentId: string) {
    const { departments, memberCountByDepartment } =
      loadOrgDepartments(organizationId);
    const department = departments.find(
      (d) => d.departmentId === departmentId,
    );
    if (!department) return null;
    return toEntry(department, memberCountByDepartment);
  },
};
