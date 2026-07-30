// ============================================================
// WORK VALIDATION — IDLE DETECTION ENGINE (Sprint 4A)
// ------------------------------------------------------------
// Turns raw inactivity periods (from the activity tracker) into the
// canonical idle set the engine subtracts from the session:
//   - clamp idle to the session
//   - subtract approved breaks — idle *during* a break is not idle
//     (breaks already pause the clock; counting both double-charges)
//   - merge adjacent idle blocks (config gap)
//   - apply the configurable idle threshold: blocks shorter than
//     `minIdleBlockMs` are reclassified as effective work
//   - warn when a single block far exceeds `idleThresholdMs`
//
// Output is disjoint, sorted, inside the session and DISJOINT FROM
// BREAKS — the property the invariant depends on.
// ============================================================

import type { EngineConfig } from "./config";
import { IntervalEngine } from "./interval-engine";
import type { Finding } from "./types";
import type { BuiltSession } from "./session-builder";
import {
  type Interval,
  periodToInterval,
  type TimePeriod,
} from "./value-objects";

export interface DetectedIdle {
  /** Disjoint, sorted idle blocks: inside the session, outside every break. */
  readonly intervals: Interval[];
  readonly idleMs: number;
  readonly findings: Finding[];
}

export function detectIdle(
  idlePeriods: readonly TimePeriod[],
  session: BuiltSession,
  breaks: readonly Interval[],
  now: number,
  config: EngineConfig,
): DetectedIdle {
  const findings: Finding[] = [];

  const closed = idlePeriods.map((period) => periodToInterval(period, now));

  // Clamp to the session, then remove any overlap with breaks.
  const withinSession = IntervalEngine.intersect(closed, session.intervals);
  const outsideBreaks = IntervalEngine.subtract(withinSession, breaks);

  // Merge adjacent idle blocks (jitter smoothing via config gap).
  const merged = IntervalEngine.merge(outsideBreaks, config.mergeGapMs);

  // Threshold: keep long-enough blocks; reclassify short ones as effective.
  const kept: Interval[] = [];
  for (const block of merged) {
    const duration = block.end - block.start;
    if (config.minIdleBlockMs > 0 && duration < config.minIdleBlockMs) {
      findings.push({
        code: "idle-below-threshold-reclassified",
        severity: "warning",
        message:
          "Idle block shorter than the policy minimum; counted as effective work.",
        interval: { start: block.start, end: block.end },
      });
      continue;
    }
    if (duration >= config.idleThresholdMs * 3) {
      findings.push({
        code: "idle-exceeds-threshold",
        severity: "warning",
        message: "A single idle block greatly exceeds the idle threshold.",
        interval: { start: block.start, end: block.end },
      });
    }
    kept.push(block);
  }

  return {
    intervals: kept,
    idleMs: IntervalEngine.totalDuration(kept),
    findings,
  };
}
