/**
 * Department read models (Sprint 2 / WP-105A).
 * Departments belong to the Organizations context (merge doc 14 §4 —
 * deliberately NOT a Workforce aggregate). This slice is read-only:
 * department administration (create/rename/archive) stays with
 * Organizations settings; Workforce only lists and references them.
 */

export interface DepartmentEntry {
  departmentId: string;
  name: string;
  description: string | null;
  departmentHeadId: string | null;
  status: "active" | "inactive" | "archived";
  /** Active member headcount, resolved from platform users. */
  memberCount: number;
}

export interface DepartmentListResult {
  rows: DepartmentEntry[];
  total: number;
}
