/**
 * Real ValidationResultRepository (Sprint 4B) — compile-safe placeholder.
 *
 * The rich engine-result read model has no dedicated table in the doc 14 §3
 * schema authored so far, and Supabase/persistence wiring is explicitly OUT of
 * Sprint 4B scope. Rather than author a migration here, the real path is a
 * no-op writer that returns empty reads, mirroring the "compile-safe now, live
 * in Phase 7" posture of the other real adapters. The demo path (mock) is the
 * behavioral source of truth for this slice until Phase 7 lands the
 * `attendance_validation_results` table (or an events-derived read view).
 *
 * This keeps the DEMO_MODE integration fully exercised while the real binding
 * stays type-correct and side-effect-free.
 */
import type {
  AttendanceValidationSnapshot,
  ValidationResultRepository,
} from "./validation-result-repository";

export const realValidationResultRepository: ValidationResultRepository = {
  async save(): Promise<void> {
    // Phase 7: persist to `attendance_validation_results` (or an events view).
    return;
  },

  async findByAttendance(): Promise<AttendanceValidationSnapshot | null> {
    return null;
  },

  async listForRange(): Promise<AttendanceValidationSnapshot[]> {
    return [];
  },
};
