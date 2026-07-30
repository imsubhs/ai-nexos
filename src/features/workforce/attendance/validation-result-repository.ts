/**
 * ValidationResultRepository (Sprint 4B) — the read-model store for the full
 * Work Validation result of an AttendanceDay (doc 14 §6/§12).
 *
 * The six denormalized minute columns on `attendance_records` are the hot-path
 * projection consumed by directory/detail views. This repository additionally
 * persists the ENGINE'S RICH OUTPUT — the ordered WORK/BREAK/IDLE timeline,
 * focus blocks, structured violations/warnings, and derived ratios — keyed by
 * attendanceId, so timeline-metric and report read models can consume the
 * engine result without re-running the engine (single calculation, projected).
 *
 * A snapshot is written by the event handler (features/workforce/events) in
 * response to `attendance.clocked_out` / `attendance.amended` — the engine runs
 * once in the action, the result flows through the L3 event, and the handler
 * projects it here. Implementations: mock (DemoStore) + real (compile-safe;
 * Supabase wiring is Phase 7, explicitly out of Sprint 4B scope).
 */
import type { ValidationResult } from "../work-validation";

/** How a snapshot came to be — the L3 event that produced it. */
export type ValidationSnapshotSource = "clock-out" | "correction";

/**
 * A persisted engine result for one AttendanceDay. `result` is the frozen
 * engine's full {@link ValidationResult} (metrics + timeline + focusBlocks +
 * violations + warnings + derived) — a serializable value object.
 */
export interface AttendanceValidationSnapshot {
  attendanceId: string;
  organizationId: string;
  userId: string;
  date: string;
  /** ISO datetime the engine produced this result. */
  computedAt: string;
  source: ValidationSnapshotSource;
  result: ValidationResult;
}

export interface ValidationResultRepository {
  /** Upsert the latest engine result for an AttendanceDay (idempotent by id). */
  save(snapshot: AttendanceValidationSnapshot): Promise<void>;
  /** The latest snapshot for an AttendanceDay, or null if none was projected. */
  findByAttendance(
    organizationId: string,
    attendanceId: string,
  ): Promise<AttendanceValidationSnapshot | null>;
  /** All snapshots for the org whose AttendanceDay falls in [from, to] (ISO dates). */
  listForRange(
    organizationId: string,
    from: string,
    to: string,
  ): Promise<AttendanceValidationSnapshot[]>;
}
