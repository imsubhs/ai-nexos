/**
 * Employee read models (merge doc 14 §12.1).
 * Employees ARE platform users — this slice is a read-only projection over
 * users ⋈ departments ⋈ today's attendance. No write model exists here.
 */
import type { AttendanceStatus } from "../shared/enums";

export interface EmployeeDirectoryEntry {
  userId: string;
  /** Per-org employee code, e.g. "AIC-0001" (minted by Identity, Phase 2). */
  employeeCode: string | null;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  designation: string | null;
  departmentId: string | null;
  departmentName: string | null;
  managerId: string | null;
  managerName: string | null;
  location: string | null;
  employmentType: string | null;
  /** ISO date the employee joined (users.joining_date / demo hireDate). */
  hireDate: string | null;
  /** ISO date employment ended; set when the employee is archived. */
  terminationDate: string | null;
  entityStatus: "active" | "inactive" | "archived";
  /** Today's presence, when attendance data exists (populated from WP-108 on). */
  todayStatus: AttendanceStatus | null;
}

export interface EmployeeListResult {
  rows: EmployeeDirectoryEntry[];
  total: number;
}
