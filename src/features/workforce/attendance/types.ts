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
