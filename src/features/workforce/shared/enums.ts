/**
 * Workforce bounded-context enums (merge doc 14 §3).
 * Canonical vocabulary for attendance, corrections, and exports; mirrored as
 * pgEnums in src/db/schema/enums.ts when the write models are authored (WP-106).
 */

/**
 * LEAVE and HOLIDAY are reserved for forward-compat (leave/shifts/payroll are
 * deferred scope, mapping W21) — no V1 writer may set them.
 */
export const ATTENDANCE_STATUSES = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "WFH",
  "HALF_DAY",
  "WORKING",
  "LEAVE",
  "HOLIDAY",
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

/** Statuses a STATUS_CHANGE correction may request (doc 14 §14). */
export const CORRECTION_REQUESTABLE_STATUSES = [
  "PRESENT",
  "LATE",
  "WFH",
  "HALF_DAY",
] as const satisfies readonly AttendanceStatus[];

/** Canonical correction types (WorkTrack types/index.ts, normalized — doc 14 §3). */
export const CORRECTION_TYPES = [
  "LOGIN_TIME",
  "LOGOUT_TIME",
  "BOTH",
  "STATUS_CHANGE",
  "OTHER",
] as const;
export type CorrectionType = (typeof CORRECTION_TYPES)[number];

export const CORRECTION_STATUSES = [
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;
export type CorrectionStatus = (typeof CORRECTION_STATUSES)[number];

export const EXPORT_FORMATS = ["CSV", "EXCEL", "PDF"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];
