/**
 * Attendance L3 domain-event names (merge doc 14 §11.1). Published through
 * the platform publisher (features/events/domain-publisher) on the mandated
 * side-effect order; M12 notification templates and the Phase 5 search
 * indexer are *consumers* of these events, never called directly by actions
 * (doc 14 §11.3 / §11.5).
 *
 * Per doc 14 §11.3, clock events carry NO notification recipients in V1 —
 * only `attendance.amended` (Corrections slice, out of Sprint 3A scope)
 * notifies the affected user. The events are emitted regardless so the
 * timeline projection (§11.4) and future consumers have the full record.
 */
export const ATTENDANCE_EVENTS = {
  /** AttendanceClockedIn — a session opened (C-1). */
  clockedIn: "workforce.attendance.clocked_in",
  /** AttendanceClockedOut — a session finalized (C-2). */
  clockedOut: "workforce.attendance.clocked_out",
  breakStarted: "workforce.attendance.break_started",
  breakEnded: "workforce.attendance.break_ended",
  /** AttendanceCreated — a new AttendanceDay row was written (accompanies clock-in). */
  created: "workforce.attendance.created",
  /** AttendanceUpdated — an existing AttendanceDay row changed (finalize/break). */
  updated: "workforce.attendance.updated",
  /**
   * AttendanceAmended (Sprint 4B, doc 14 §11.3) — an approved correction
   * re-derived a day's metrics via the frozen engine. Carries the recomputed
   * metrics + the validation snapshot for the read-model projection handler.
   */
  amended: "workforce.attendance.amended",
  /** AttendanceArchived — an AttendanceDay was soft-archived (lifecycle). */
  archived: "workforce.attendance.archived",
} as const;

export type AttendanceEventName =
  (typeof ATTENDANCE_EVENTS)[keyof typeof ATTENDANCE_EVENTS];
