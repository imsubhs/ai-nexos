// ============================================================
// WORK VALIDATION — BREAK PROCESSOR (Sprint 4A)
// ------------------------------------------------------------
// Cleans raw, employee-declared breaks into the canonical set the
// engine subtracts from the session:
//   - close open breaks against `now`
//   - drop zero/negative-length ("invalid") breaks
//   - detect & merge overlapping / adjacent breaks
//   - clamp breaks to the session (a break past clock-out is a
//     "clock-out before break end" — the overflow is clamped away)
//   - flag breaks fully outside the session (dropped)
//
// Pure & total. Output is disjoint, sorted, and wholly inside the
// session — the precondition every downstream calculator relies on.
// ============================================================

import type { EngineConfig } from "./config";
import { IntervalEngine } from "./interval-engine";
import type { Finding, WorkValidationInput } from "./types";
import type { BuiltSession } from "./session-builder";
import { type Interval, periodToInterval } from "./value-objects";

export interface ProcessedBreaks {
  /** Disjoint, sorted breaks, wholly inside the session. */
  readonly intervals: Interval[];
  readonly breakMs: number;
  readonly findings: Finding[];
}

export function processBreaks(
  breaks: WorkValidationInput["breaks"],
  session: BuiltSession,
  now: number,
  config: EngineConfig,
): ProcessedBreaks {
  const findings: Finding[] = [];

  // 1. Close open breaks and separate structurally-invalid ones.
  const closed: Interval[] = [];
  for (const period of breaks) {
    const iv = periodToInterval(period, now);
    if (iv.end <= iv.start) {
      findings.push({
        code: "invalid-break",
        severity: "warning",
        message: "Break has zero or negative length; ignored.",
        interval: { start: iv.start, end: iv.end },
      });
      continue;
    }
    closed.push(iv);
  }

  // 2. Flag overlaps (before merging) so the finding reflects the raw input.
  if (IntervalEngine.findOverlaps(closed).length > 0) {
    findings.push({
      code: "overlapping-breaks",
      severity: "warning",
      message: "Declared breaks overlap; merged so time is counted once.",
    });
  }

  // 3. Merge adjacent/overlapping breaks (config gap smooths jitter).
  const merged = IntervalEngine.merge(closed, config.mergeGapMs);

  // 4. Clamp to the session; anything trimmed or dropped is a boundary issue.
  const clamped = IntervalEngine.intersect(merged, session.intervals);
  const clampedMs = IntervalEngine.totalDuration(clamped);

  for (const brk of merged) {
    const inside = IntervalEngine.intersect([brk], session.intervals);
    if (inside.length === 0) {
      findings.push({
        code: "break-outside-session",
        severity: "warning",
        message: "Break falls entirely outside the session; ignored.",
        interval: { start: brk.start, end: brk.end },
      });
    } else if (IntervalEngine.totalDuration(inside) < brk.end - brk.start) {
      findings.push({
        code: "clock-out-before-break-end",
        severity: "violation",
        message:
          "Break extends beyond the session bounds; clamped to the session.",
        interval: { start: brk.start, end: brk.end },
      });
    }
  }

  return { intervals: clamped, breakMs: clampedMs, findings };
}
