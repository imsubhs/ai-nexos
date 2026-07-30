// ============================================================
// WORK VALIDATION — EFFECTIVE WORK CALCULATOR (Sprint 4A)
// ------------------------------------------------------------
// Derives effective work time and GUARDS the canonical invariant:
//
//        Session Time = Effective Time + Idle Time + Break Time
//
// Effective work is the session with break and idle carved out:
//        effective = session − break − idle
//
// Because the break processor guarantees breaks ⊆ session and the
// idle detector guarantees idle ⊆ session and idle ∩ break = ∅, the
// three sets partition the session exactly — so the invariant holds
// by construction. `verifyInvariant` is a self-check on that claim;
// if it ever fails the engine has a bug (InvariantViolationError).
// ============================================================

import { InvariantViolationError } from "./errors";
import { IntervalEngine } from "./interval-engine";
import type { Interval } from "./value-objects";

export interface EffectiveResult {
  /** Ordered, disjoint effective-work spans (session minus break minus idle). */
  readonly intervals: Interval[];
  readonly effectiveMs: number;
}

export function calculateEffective(
  session: readonly Interval[],
  breaks: readonly Interval[],
  idle: readonly Interval[],
): EffectiveResult {
  const carved = IntervalEngine.merge([...breaks, ...idle]);
  const effective = IntervalEngine.subtract(session, carved);
  return { intervals: effective, effectiveMs: IntervalEngine.totalDuration(effective) };
}

/**
 * Assert the millisecond invariant `session === effective + idle + break`.
 * Breaks and idle are disjoint by construction, so their durations add. Throws
 * {@link InvariantViolationError} on any mismatch — a guard on the engine's own
 * arithmetic, never a caller-input condition.
 */
export function verifyInvariant(
  sessionMs: number,
  effectiveMs: number,
  idleMs: number,
  breakMs: number,
): void {
  const sum = effectiveMs + idleMs + breakMs;
  if (sum !== sessionMs) {
    throw new InvariantViolationError(
      `session (${sessionMs}ms) ≠ effective (${effectiveMs}) + idle (${idleMs}) + break (${breakMs}) = ${sum}`,
    );
  }
}

/**
 * Assert the minute-rounded invariant. Effective minutes are *derived*
 * (session − break − idle) rather than independently rounded, so this always
 * holds; the check documents and protects that guarantee.
 */
export function verifyMinuteInvariant(
  sessionMinutes: number,
  effectiveMinutes: number,
  idleMinutes: number,
  breakMinutes: number,
): void {
  const sum = effectiveMinutes + idleMinutes + breakMinutes;
  if (sum !== sessionMinutes) {
    throw new InvariantViolationError(
      `sessionMinutes (${sessionMinutes}) ≠ effective (${effectiveMinutes}) + idle (${idleMinutes}) + break (${breakMinutes}) = ${sum}`,
    );
  }
}
