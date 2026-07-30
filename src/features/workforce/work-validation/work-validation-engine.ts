// ============================================================
// WORK VALIDATION ENGINE (Sprint 4A · doc 14 §6 · PRD §23)
// ------------------------------------------------------------
// The canonical orchestrator. Composes the pure sub-engines into a
// single deterministic transform:
//
//   segments ─▶ SessionBuilder    ─▶ session spans
//   breaks   ─▶ BreakProcessor    ─▶ breaks ⊆ session
//   idle     ─▶ IdleDetector      ─▶ idle ⊆ session, idle ∩ break = ∅
//              EffectiveCalculator ─▶ effective = session − break − idle
//   focus    ─▶ FocusCalculator   ─▶ focus = visible ∩ session − break − idle
//              ValidationResult    ─▶ timeline + derived + findings
//
// Attendance is presence, not productivity (PRD §23): effective/idle/
// focus are reported separately and carry NO payroll/performance
// meaning. The engine performs no interpretation.
//
// PURE DOMAIN SERVICE — deterministic, no side effects, no I/O, no
// persistence, no logging, no infrastructure imports. `now` is
// injected so the transform is a pure function of its inputs.
// ============================================================

import { type EngineConfig, resolveConfig } from "./config";
import { calculateEffective, verifyInvariant, verifyMinuteInvariant } from "./effective-calculator";
import { calculateFocus } from "./focus-calculator";
import { detectIdle } from "./idle-detector";
import { buildSession } from "./session-builder";
import { processBreaks } from "./break-processor";
import type {
  Finding,
  ValidationResult,
  WorkSessionInput,
  WorkValidationInput,
  WorkValidationMetrics,
} from "./types";
import { buildTimeline, computeDerived, partitionMinutes, toTimelineEntries } from "./validation-result";
import { msToMinutes } from "./value-objects";

/**
 * Validate a work day end to end.
 *
 * @param input The day's clock segments, breaks, idle and focus periods.
 * @param now   Current instant (epoch ms) — closes open periods and bounds an
 *              in-progress session. Injected for determinism.
 * @returns The full {@link ValidationResult} (metrics + timeline + findings).
 *
 * Guarantees, by construction:
 *  - every duration is clamped to the session and is non-negative;
 *  - idle and focus never overlap breaks (breaks pause both timers, PRD §25);
 *  - `sessionMs === effectiveMs + idleMs + breakMs` (verified);
 *  - the minute-rounded parts preserve the same invariant and are all ≥ 0.
 */
export function validateWorkDay(input: WorkValidationInput, now: number): ValidationResult {
  const config: EngineConfig = resolveConfig(input.config);

  const session = buildSession(input.segments, now, config);
  const breaks = processBreaks(input.breaks, session, now, config);
  const idle = detectIdle(input.idlePeriods, session, breaks.intervals, now, config);
  const effective = calculateEffective(session.intervals, breaks.intervals, idle.intervals);
  const focus = calculateFocus(
    input.focusPeriods,
    session,
    breaks.intervals,
    idle.intervals,
    now,
    config,
  );

  // ---- Invariant (ms) — a self-check on the engine's own arithmetic. --------
  verifyInvariant(session.sessionMs, effective.effectiveMs, idle.idleMs, breaks.breakMs);

  // ---- Partition-safe minute rounding (preserves the minute invariant). -----
  const [breakMinutes, idleMinutes, effectiveMinutes] = partitionMinutes(session.sessionMs, [
    breaks.breakMs,
    idle.idleMs,
    effective.effectiveMs,
  ]);
  const sessionMinutes = msToMinutes(session.sessionMs);
  verifyMinuteInvariant(sessionMinutes, effectiveMinutes, idleMinutes, breakMinutes);

  // ---- Findings, split by severity. -----------------------------------------
  const allFindings: Finding[] = [
    ...session.findings,
    ...breaks.findings,
    ...idle.findings,
  ];
  const violations = allFindings.filter((f) => f.severity === "violation");
  const warnings = allFindings.filter((f) => f.severity === "warning");

  return {
    sessionMs: session.sessionMs,
    effectiveMs: effective.effectiveMs,
    breakMs: breaks.breakMs,
    idleMs: idle.idleMs,
    focusMs: focus.focusMs,

    sessionMinutes,
    effectiveMinutes,
    breakMinutes,
    idleMinutes,
    focusMinutes: msToMinutes(focus.focusMs),

    timeline: buildTimeline(effective.intervals, breaks.intervals, idle.intervals),
    focusBlocks: toTimelineEntries(focus.intervals, "WORK"),

    violations,
    warnings,
    derived: computeDerived(
      session.sessionMs,
      effective.effectiveMs,
      idle.idleMs,
      breaks.breakMs,
      focus.focusMs,
      breaks.intervals.length,
      idle.intervals.length,
      focus.intervals,
      config.idleThresholdMs,
    ),
    isOngoing: session.isOngoing,
  };
}

/**
 * Legacy single-session entry point (ported W1 contract). Delegates to
 * {@link validateWorkDay} and projects the result onto the historical
 * {@link WorkValidationMetrics} shape so existing callers and the interim
 * finalizer are unaffected. `logoutAt === null` marks an in-progress session.
 */
export function computeWorkValidation(input: WorkSessionInput, now: number): WorkValidationMetrics {
  const result = validateWorkDay(
    {
      segments: [{ clockIn: input.loginAt, clockOut: input.logoutAt }],
      breaks: input.breaks,
      idlePeriods: input.idlePeriods,
      focusPeriods: input.focusPeriods,
    },
    now,
  );

  return {
    sessionMs: result.sessionMs,
    breakMs: result.breakMs,
    idleMs: result.idleMs,
    focusMs: result.focusMs,
    effectiveMs: result.effectiveMs,

    sessionMinutes: result.sessionMinutes,
    breakMinutes: result.breakMinutes,
    idleMinutes: result.idleMinutes,
    focusMinutes: result.focusMinutes,
    effectiveMinutes: result.effectiveMinutes,

    isOngoing: result.isOngoing,
  };
}

export { msToMinutes };
