// ============================================================
// WORK VALIDATION — SESSION BUILDER (Sprint 4A)
// ------------------------------------------------------------
// Turns raw clock segments into the canonical set of session
// intervals the rest of the engine measures against. Handles:
//   - clock in / clock out pairing
//   - partial (open) sessions — bounded at `now`
//   - cross-midnight sessions — trivial with epoch-ms bounds
//   - multiple sessions per day — merged into disjoint spans
//   - invalid segments (clock-out ≤ clock-in) — dropped, flagged
//
// Pure & total. Session TIME is the sum of the disjoint session
// spans, so overlapping re-clocks are never double-counted.
// ============================================================

import type { EngineConfig } from "./config";
import { IntervalEngine } from "./interval-engine";
import type { ClockSegment, Finding } from "./types";
import type { Interval } from "./value-objects";

export interface BuiltSession {
  /** Disjoint, sorted session spans. Effective/break/idle live inside these. */
  readonly intervals: Interval[];
  /** Total session duration (ms) — sum of the disjoint spans. */
  readonly sessionMs: number;
  /** Earliest clock-in across all valid segments (null when none). */
  readonly startedAt: number | null;
  /** Latest bound across all valid segments (null when none). */
  readonly endedAt: number | null;
  /** True when any segment had no clock-out. */
  readonly isOngoing: boolean;
  readonly findings: Finding[];
}

/**
 * Build the session model from clock segments.
 *
 * @param segments Raw clock in/out pairs (one or many).
 * @param now      Instant used to close open segments (injected for determinism).
 * @param config   Resolved engine policy.
 */
export function buildSession(
  segments: readonly ClockSegment[],
  now: number,
  config: EngineConfig,
): BuiltSession {
  const findings: Finding[] = [];
  const raw: Interval[] = [];
  let isOngoing = false;

  for (const segment of segments) {
    const open = segment.clockOut === null;
    if (open) isOngoing = true;

    const end = open
      ? config.autoCloseOpenSession
        ? now
        : Math.max(segment.clockIn, now)
      : (segment.clockOut as number);

    if (open) {
      findings.push({
        code: "open-session",
        severity: "warning",
        message: "Session has no clock-out; bounded at the current time.",
        interval: { start: segment.clockIn, end },
      });
    }

    if (end <= segment.clockIn) {
      findings.push({
        code: "negative-session",
        severity: "violation",
        message: "Clock-out is not after clock-in; segment ignored.",
        interval: { start: segment.clockIn, end },
      });
      continue;
    }
    raw.push({ start: segment.clockIn, end });
  }

  const intervals = IntervalEngine.merge(raw);
  const sessionMs = IntervalEngine.totalDuration(intervals);
  const startedAt = intervals.length > 0 ? intervals[0].start : null;
  const endedAt =
    intervals.length > 0 ? intervals[intervals.length - 1].end : null;

  return { intervals, sessionMs, startedAt, endedAt, isOngoing, findings };
}
