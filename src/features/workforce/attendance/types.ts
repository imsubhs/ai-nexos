/**
 * Attendance read models (merge doc 14 §12; Sprint 3A foundation).
 * Live idle/focus metrics arrive with the WP-107 work-validation engine —
 * until then those fields are persisted zeros (no ratio fabrication,
 * policy 10.9).
 */
import type { AttendanceStatus } from "../shared/enums";
import type { ClockContext } from "../shared/types";

/** §8.1 AttendanceDay state machine positions. */
export const ATTENDANCE_STATES = [
  "NOT_STARTED",
  "WORKING",
  "ON_BREAK",
  "COMPLETED",
] as const;
export type AttendanceState = (typeof ATTENDANCE_STATES)[number];

export interface BreakView {
  breakId: string;
  startAt: string; // ISO datetime
  endAt: string | null;
  kind: string;
}

/** Denormalized minute metrics (doc 14 §5 WorkValidationMetrics subset). */
export interface AttendanceMetrics {
  workingMinutes: number;
  breakMinutes: number;
  idleMinutes: number;
  focusMinutes: number;
  effectiveMinutes: number;
  overtimeMinutes: number;
}

/** Doc 14 §12.2 — /workforce/attendance + dashboard today card (Q-1). */
export interface TodayAttendanceView {
  state: AttendanceState;
  attendanceId: string | null;
  date: string; // ISO date
  status: AttendanceStatus | null;
  isLate: boolean;
  clockInAt: string | null;
  clockOutAt: string | null;
  openBreak: BreakView | null;
  metrics: AttendanceMetrics;
  /** True while the session is open — metrics keep ticking (A-5). */
  isOngoing: boolean;
  policy: { workStartTime: string; workEndTime: string };
}

/** Directory row — attendance day joined to its employee (doc 14 §12.5 subset). */
export interface AttendanceDirectoryRow {
  attendanceId: string;
  userId: string;
  employeeName: string;
  employeeCode: string | null;
  departmentId: string | null;
  departmentName: string | null;
  date: string;
  status: AttendanceStatus;
  isLate: boolean;
  clockInAt: string | null;
  clockOutAt: string | null;
  metrics: AttendanceMetrics;
  isArchived: boolean;
  /**
   * True while an `attendance_breaks` row for this day is still open. ON_BREAK
   * is a state, not a stored status (§8.1), so the T-1 `onBreak` KPI has no
   * column to read — it is derived from the break rows by the repository.
   */
  isOnBreak: boolean;
}

export interface AttendanceListResult {
  rows: AttendanceDirectoryRow[];
  total: number;
}

/** Detail view — directory row plus breaks, contexts, and notes. */
export interface AttendanceDetail extends AttendanceDirectoryRow {
  breaks: BreakView[];
  clockInContext: ClockContext | null;
  clockOutContext: ClockContext | null;
  notes: string | null;
}

/**
 * Doc 14 §12.3 — one row of the history table / month grid (A-6).
 *
 * Unlike the directory row this is single-employee and carries no identity
 * columns: A-6 is self-scoped and never accepts a userId, so repeating the
 * viewer's own name on every row would be noise.
 */
export interface AttendanceHistoryRow {
  /** Null on a derived ABSENT day — there is no stored record to link to. */
  attendanceId: string | null;
  date: string;
  status: AttendanceStatus;
  isLate: boolean;
  clockInAt: string | null;
  clockOutAt: string | null;
  metrics: AttendanceMetrics;
  /** An approved correction has been applied to this day (§12.3 marker). */
  wasCorrected: boolean;
  /**
   * True when this row was derived at read time rather than stored — an ABSENT
   * working day (§8.1/10.7). Surfaced so the UI never offers actions (detail,
   * timeline) that need an attendanceId.
   */
  isDerived: boolean;
}

/**
 * Doc 14 §12.4 — WorkTrack's summary shape kept verbatim, including the
 * leave/holiday fields that stay 0 until a leave module exists. They are
 * present rather than omitted so the shape does not change when it lands.
 */
export interface AttendanceSummary {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  wfhDays: number;
  halfDays: number;
  leaveDays: number;
  holidayDays: number;
  totalWorkingMinutes: number;
  totalOvertimeMinutes: number;
  /** presentDays / totalDays as a whole percent; 0 when the range is empty. */
  attendancePercentage: number;
  /** Session hours averaged over present days, one decimal place. */
  avgWorkingHours: number;
}

/** A-6 output (doc 15 §1). `summary` covers the whole range, not the page. */
export interface AttendanceHistoryResult {
  from: string;
  to: string;
  rows: AttendanceHistoryRow[];
  summary: AttendanceSummary;
  total: number;
}

/** T-1 day KPIs (doc 15 §4). */
export interface TeamAttendanceKpis {
  present: number;
  /** Active members with no attendance row for the day (derived, not stored). */
  absent: number;
  late: number;
  onBreak: number;
  avgEffectiveMinutes: number;
}

/** T-1 output — the day's directory rows plus its KPIs. */
export interface TeamAttendanceResult {
  date: string;
  rows: AttendanceDirectoryRow[];
  kpis: TeamAttendanceKpis;
  total: number;
}

/**
 * Attendance timeline entry (doc 14 §11.4) — a read projection of the L3
 * domain events for one AttendanceDay, correlated by attendanceId. No new
 * activity table: the events ARE the timeline (D-2).
 */
export interface AttendanceTimelineEntry {
  eventId: string;
  eventName: string;
  at: string; // ISO datetime
  actorId: string | null;
  payload: Record<string, unknown>;
}
