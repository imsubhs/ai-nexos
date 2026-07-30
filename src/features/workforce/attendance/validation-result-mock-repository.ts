/**
 * DemoStore-backed ValidationResultRepository (Sprint 4B, merge doc 15 §0 demo
 * contract). Persists the engine's rich result into the live
 * `attendanceValidations` collection so timeline-metric and report read models
 * behave like a real projection store. Upsert semantics: one snapshot per
 * attendanceId (the latest engine run wins).
 */
import { getDemoStore } from "@/lib/demo/store";
import type {
  AttendanceValidationSnapshot,
  ValidationResultRepository,
} from "./validation-result-repository";

function snapshots(): AttendanceValidationSnapshot[] {
  return getDemoStore().attendanceValidations as AttendanceValidationSnapshot[];
}

export const mockValidationResultRepository: ValidationResultRepository = {
  async save(snapshot) {
    const rows = snapshots();
    const idx = rows.findIndex(
      (s) =>
        s.organizationId === snapshot.organizationId &&
        s.attendanceId === snapshot.attendanceId,
    );
    if (idx >= 0) rows[idx] = snapshot;
    else rows.push(snapshot);
  },

  async findByAttendance(organizationId, attendanceId) {
    return (
      snapshots().find(
        (s) =>
          s.organizationId === organizationId &&
          s.attendanceId === attendanceId,
      ) ?? null
    );
  },

  async listForRange(organizationId, from, to) {
    return snapshots().filter(
      (s) =>
        s.organizationId === organizationId &&
        s.date >= from &&
        s.date <= to,
    );
  },
};
