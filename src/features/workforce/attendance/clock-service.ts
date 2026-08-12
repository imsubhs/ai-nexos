/**
 * AttendanceClockService (merge doc 14 §6) — the pure derivation kernel for
 * the clock lifecycle: status/isLate derivation (policy 10.1) and minute
 * finalization. Both the mock and real adapters call this so demo parity is
 * behavioral (doc 15 §0) and there is one derivation surface, not two.
 *
 * Sprint 4A landed the Work Validation engine (doc 14 §6) as the canonical
 * calculation surface. Sprint 4B completes the integration: EVERY attendance
 * calculation — clock-out finalize AND the C-9 correction recompute — now runs
 * through the SAME `runValidation` → `validateWorkDay` path. There is one
 * interval-algebra core and no duplicated minute math anywhere. The interim
 * `minutesBetween`/`sumBreakMinutes` helpers are removed (Sprint 4B): they were
 * dead (zero call sites) and duplicated the engine's `msToMinutes`/break
 * processing. Idle/focus stay 0 until the WP-114 tracker feeds real periods
 * (NOT fabricated ratios, policy 10.9); the invariant
 * `session = effective + idle + break` holds with idle = 0. `overtimeMinutes`
 * stays a policy derivation here (policy 10.1) — it is not an engine metric, so
 * it never re-implements engine arithmetic (it consumes engine output only).
 *
 * The engine is FROZEN (Sprint 4A). Nothing here reaches into it — it is only
 * called through the `validateWorkDay` public entry point.
 */
import { validateWorkDay, type ValidationResult } from "../work-validation";
import { businessDayIn, instantAtWallClock } from "../shared/business-day";
import type { AttendanceStatus } from "../shared/enums";
import type { TimePeriod, WorkforcePolicy } from "../shared/types";
import type { AttendanceMetrics } from "./types";

const MINUTE_MS = 60_000;

/**
 * True when clock-in is later than workStart + lateThreshold (policy 10.1).
 *
 * `workStartTime` is documented as "HH:mm in the resolved timezone", and this
 * measured it on the UTC clock instead: on a UTC host an Asia/Kolkata employee
 * arriving at 00:46 IST was compared against 09:00 UTC — 14:30 IST — and
 * stamped LATE for being eight hours early. Both the day the shift falls on and
 * the instant it starts are now read in the organization's zone, so lateness is
 * decided on the same clock the employee reads.
 */
export function deriveIsLate(
  clockInIso: string,
  policy: WorkforcePolicy,
  timeZone: string,
): boolean {
  const clockIn = new Date(clockInIso);
  const shiftStart = instantAtWallClock(
    businessDayIn(clockIn, timeZone),
    policy.workStartTime,
    timeZone,
  );
  return (
    clockIn.getTime() > shiftStart + policy.lateThresholdMinutes * MINUTE_MS
  );
}

/**
 * Terminal presence status on clock-out (policy 10.1). isLate is a separate
 * fact so a LATE + HALF_DAY day keeps both (LATE wins the stored status).
 */
export function deriveStatus(
  sessionMinutes: number,
  isLate: boolean,
  wfh: boolean,
  policy: WorkforcePolicy,
): AttendanceStatus {
  if (wfh && policy.allowWFH) return "WFH";
  if (isLate) return "LATE";
  if (sessionMinutes < (policy.workingHoursPerDay * 60) / 2) return "HALF_DAY";
  return "PRESENT";
}

export interface FinalizeInput {
  clockInIso: string;
  clockOutIso: string;
  /** Break periods; an open break is treated as ending at clock-out. */
  breaks: TimePeriod[];
  policy: WorkforcePolicy;
}

/**
 * The single engine entry point for the attendance slice. Every consumer that
 * needs a validated day — finalize, correction recompute, live read models —
 * calls THIS, so the engine runs through exactly one code path. Returns the
 * full {@link ValidationResult} (metrics + timeline + violations + derived) so
 * callers can persist the rich snapshot without re-running the engine.
 */
export function runValidation(input: FinalizeInput): ValidationResult {
  const clockIn = new Date(input.clockInIso).getTime();
  const clockOut = new Date(input.clockOutIso).getTime();
  // idle/focus empty until WP-114; invariant holds with idle = 0 (policy 10.9).
  return validateWorkDay(
    {
      segments: [{ clockIn, clockOut }],
      breaks: input.breaks,
      idlePeriods: [],
      focusPeriods: [],
    },
    clockOut,
  );
}

/**
 * Project a {@link ValidationResult} onto the persisted {@link AttendanceMetrics}
 * shape and append the policy-derived overtime (policy 10.1). Overtime consumes
 * the engine's `effectiveMinutes` — it does not recompute any interval math.
 */
export function toAttendanceMetrics(
  result: ValidationResult,
  policy: WorkforcePolicy,
): AttendanceMetrics {
  const standardMinutes = policy.workingHoursPerDay * 60;
  const rawOvertime = result.effectiveMinutes - standardMinutes;
  const overtimeMinutes =
    rawOvertime > policy.overtimeThresholdMinutes ? rawOvertime : 0;
  return {
    workingMinutes: result.sessionMinutes,
    breakMinutes: result.breakMinutes,
    idleMinutes: result.idleMinutes,
    focusMinutes: result.focusMinutes,
    effectiveMinutes: result.effectiveMinutes,
    overtimeMinutes,
  };
}

/** Denormalized minute metrics persisted at finalization (doc 14 §3). */
export function finalizeMetrics(input: FinalizeInput): AttendanceMetrics {
  return toAttendanceMetrics(runValidation(input), input.policy);
}

export interface RecomputeInput extends FinalizeInput {
  isLate: boolean;
  wfh: boolean;
}

/**
 * The canonical whole-day recompute (Sprint 4B). Given the (possibly amended)
 * clock-in/out + breaks, runs the frozen engine ONCE and derives the full
 * persisted picture: metrics, terminal status, and the rich validation result.
 * Used by clock-out AND by the C-9 correction apply-on-approve path so an
 * amended day is calculated identically to a freshly clocked-out one.
 */
export interface RecomputedDay {
  metrics: AttendanceMetrics;
  status: AttendanceStatus;
  isLate: boolean;
  validation: ValidationResult;
}

export function recomputeDay(input: RecomputeInput): RecomputedDay {
  const validation = runValidation(input);
  const metrics = toAttendanceMetrics(validation, input.policy);
  const isLate = input.isLate;
  const status = deriveStatus(
    metrics.workingMinutes,
    isLate,
    input.wfh,
    input.policy,
  );
  return { metrics, status, isLate, validation };
}
