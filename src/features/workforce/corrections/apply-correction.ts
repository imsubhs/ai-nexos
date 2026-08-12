/**
 * C-9 apply-on-approve (Sprint 4B) — the correction → attendance recalculation
 * bridge. When a correction is APPROVED, this amends the target AttendanceDay
 * and re-derives its metrics through the FROZEN Work Validation engine, then
 * emits `attendance.amended` so the read-model projection handler updates the
 * validation snapshot.
 *
 * Pipeline (task flow / doc 14 §11.3):
 *   correction approved
 *     → load AttendanceDay (org, user, date)
 *     → apply requested clock-in/out/status
 *     → recomputeDay (engine, single pass)
 *     → repo.amendDay (persist metrics/status + L2 audit at write site)
 *     → publish attendance.amended (→ read-model projection handler)
 *     → appliedAt stamped on the correction (caller)
 *
 * This is INTEGRATION only: it never re-implements interval math (recomputeDay
 * owns the one engine pass) and never touches the engine's internals.
 */
import { publishDomainEvent } from "@/features/events/domain-publisher";
import { DEFAULT_WORKFORCE_POLICY, type TimePeriod } from "../shared/types";
import { deriveIsLate, recomputeDay } from "../attendance/clock-service";
import { ATTENDANCE_EVENTS } from "../attendance/events";
import type { AmendDayData } from "../attendance/repository";
import type {
  AttendanceDetail,
  TodayAttendanceView,
} from "../attendance/types";
import type { CorrectionDetail } from "./types";

/**
 * The subset of the AttendanceRepository the apply-on-approve step needs. Kept
 * as a focused port so the corrections slice depends on a capability, not the
 * whole attendance write surface.
 */
export interface AttendanceAmendPort {
  findDay(
    organizationId: string,
    userId: string,
    date: string,
  ): Promise<TodayAttendanceView | null>;
  findById(
    organizationId: string,
    attendanceId: string,
  ): Promise<AttendanceDetail | null>;
  amendDay(
    organizationId: string,
    actorUserId: string,
    attendanceId: string,
    data: AmendDayData,
  ): Promise<TodayAttendanceView>;
}

export interface ApplyCorrectionParams {
  organizationId: string;
  actorId: string;
  correction: CorrectionDetail;
  attendance: AttendanceAmendPort;
  /**
   * The organization's policy timezone. An amended day must re-derive lateness
   * against the same shift clock a live clock-in uses, or approving a
   * correction would silently re-stamp a day the attendance pipeline had
   * already judged correctly.
   */
  timeZone: string;
}

export interface ApplyCorrectionResult {
  /** True when the AttendanceDay was found and amended. */
  applied: boolean;
  /** ISO stamp when applied; null when the day could not be amended. */
  appliedAt: string | null;
  /** Machine reason when not applied (e.g. no day / not finalized). */
  reason?: "no-attendance-day" | "day-not-finalized";
}

function toPeriods(
  breaks: { startAt: string; endAt: string | null }[],
): TimePeriod[] {
  return breaks.map((b) => ({
    startAt: new Date(b.startAt).getTime(),
    endAt: b.endAt ? new Date(b.endAt).getTime() : null,
  }));
}

/**
 * Apply an approved correction to its AttendanceDay. Returns whether the day
 * was amended — approval succeeds even when there is no day to amend (the
 * correction is still recorded), so callers stamp `appliedAt` only on success.
 */
export async function applyApprovedCorrection(
  params: ApplyCorrectionParams,
): Promise<ApplyCorrectionResult> {
  const { organizationId, actorId, correction, attendance, timeZone } = params;
  const policy = DEFAULT_WORKFORCE_POLICY;

  const day = await attendance.findDay(
    organizationId,
    correction.userId,
    correction.date,
  );
  if (!day || !day.attendanceId || !day.clockInAt) {
    return { applied: false, appliedAt: null, reason: "no-attendance-day" };
  }

  const detail = await attendance.findById(organizationId, day.attendanceId);
  const breaks = detail ? toPeriods(detail.breaks) : [];
  const wfh = detail?.notes === "WFH";

  // Resolve the amended clock times from the request (doc 14 §14 shapes).
  let clockInIso = day.clockInAt;
  let clockOutIso = day.clockOutAt;
  const t = correction.correctionType;
  if ((t === "LOGIN_TIME" || t === "BOTH") && correction.requestedClockInAt) {
    clockInIso = correction.requestedClockInAt;
  }
  if ((t === "LOGOUT_TIME" || t === "BOTH") && correction.requestedClockOutAt) {
    clockOutIso = correction.requestedClockOutAt;
  }

  // The engine needs a closed day to partition the session. A STATUS_CHANGE on
  // a still-open day cannot recompute minutes — surface it rather than fabricate.
  if (!clockOutIso) {
    return { applied: false, appliedAt: null, reason: "day-not-finalized" };
  }

  const isLate = deriveIsLate(clockInIso, policy, timeZone);
  const {
    metrics,
    status: derivedStatus,
    validation,
  } = recomputeDay({
    clockInIso,
    clockOutIso,
    breaks,
    policy,
    isLate,
    wfh,
  });
  // A STATUS_CHANGE correction explicitly overrides the derived presence status.
  const status =
    t === "STATUS_CHANGE" && correction.requestedStatus
      ? correction.requestedStatus
      : derivedStatus;

  await attendance.amendDay(organizationId, actorId, day.attendanceId, {
    clockInAt: clockInIso,
    clockOutAt: clockOutIso,
    status,
    isLate,
    metrics,
    reason: correction.correctionCode,
  });

  // attendance.amended (doc 14 §11.3) — carries the engine result so the
  // read-model projection handler refreshes the validation snapshot.
  await publishDomainEvent({
    organizationId,
    eventType: "attendance",
    eventName: ATTENDANCE_EVENTS.amended,
    aggregateType: "attendance_record",
    aggregateId: day.attendanceId,
    actorId,
    correlationId: day.attendanceId,
    payload: {
      userId: correction.userId,
      date: correction.date,
      correctionId: correction.correctionId,
      status,
      metrics,
      validation,
    },
  });

  return { applied: true, appliedAt: new Date().toISOString() };
}
