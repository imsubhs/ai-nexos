// ============================================================
// WORK VALIDATION — RESULT ASSEMBLY (Sprint 4A)
// ------------------------------------------------------------
// Pure helpers that assemble the presentation layer of the
// ValidationResult from the calculators' interval sets:
//   - the ordered WORK/BREAK/IDLE timeline that partitions the session
//   - partition-safe minute rounding (guarantees the minute invariant
//     AND non-negative parts via largest-remainder allocation)
//   - the derived ratios & counts
// ============================================================

import { IntervalEngine } from "./interval-engine";
import type { DerivedMetrics } from "./types";
import {
  type Interval,
  intervalDuration,
  msToMinutes,
  type TimelineEntry,
  type TimelineKind,
} from "./value-objects";

/**
 * Build the ordered timeline. `effective`, `breaks` and `idle` are disjoint and
 * together partition the session, so the concatenated, sorted entries cover the
 * session exactly with no gaps or overlaps.
 */
export function buildTimeline(
  effective: readonly Interval[],
  breaks: readonly Interval[],
  idle: readonly Interval[],
): TimelineEntry[] {
  const label = (intervals: readonly Interval[], kind: TimelineKind): TimelineEntry[] =>
    intervals.map((iv) => ({ start: iv.start, end: iv.end, durationMs: intervalDuration(iv), kind }));

  return [...label(effective, "WORK"), ...label(breaks, "BREAK"), ...label(idle, "IDLE")].sort(
    (a, b) => a.start - b.start || a.end - b.end,
  );
}

/** Present a set of blocks as ordered timeline entries of one kind. */
export function toTimelineEntries(
  intervals: readonly Interval[],
  kind: TimelineKind,
): TimelineEntry[] {
  return IntervalEngine.sort(intervals).map((iv) => ({
    start: iv.start,
    end: iv.end,
    durationMs: intervalDuration(iv),
    kind,
  }));
}

/**
 * Round parts that sum to `totalMs` into whole minutes that sum EXACTLY to
 * `round(totalMs)` and are each ≥ 0 (largest-remainder / Hamilton method). This
 * is what preserves the minute invariant `session = break + idle + effective`
 * without ever producing a negative part.
 */
export function partitionMinutes(totalMs: number, partsMs: readonly number[]): number[] {
  const targetMinutes = msToMinutes(totalMs);
  const exact = partsMs.map((ms) => ms / 60_000);
  const floors = exact.map((value) => Math.floor(value));
  const floorSum = floors.reduce((sum, value) => sum + value, 0);

  let remainder = targetMinutes - floorSum;
  // Distribute the leftover minutes to the parts with the largest fraction.
  const order = exact
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac);

  const result = [...floors];
  for (const { index } of order) {
    if (remainder <= 0) break;
    result[index] += 1;
    remainder -= 1;
  }
  // If rounding of the total landed below the floor sum (all-fraction-zero
  // edge), trim from the smallest-fraction parts to keep the sum exact.
  for (let i = order.length - 1; i >= 0 && remainder < 0; i -= 1) {
    const { index } = order[i];
    if (result[index] > 0) {
      result[index] -= 1;
      remainder += 1;
    }
  }
  return result;
}

/** Derived ratios and counts. All ratios in `[0, 1]`, 0 for an empty session. */
export function computeDerived(
  sessionMs: number,
  effectiveMs: number,
  idleMs: number,
  breakMs: number,
  focusMs: number,
  breakCount: number,
  idleCount: number,
  focusBlocks: readonly Interval[],
  idleThresholdMs: number,
): DerivedMetrics {
  const ratio = (part: number): number => (sessionMs > 0 ? part / sessionMs : 0);
  const focusDurations = focusBlocks.map((block) => intervalDuration(block));
  const longestFocusMs = focusDurations.reduce((max, value) => Math.max(max, value), 0);
  const averageFocusMs =
    focusDurations.length > 0 ? Math.round(focusMs / focusDurations.length) : 0;

  return {
    effectiveRatio: ratio(effectiveMs),
    idleRatio: ratio(idleMs),
    breakRatio: ratio(breakMs),
    focusRatio: ratio(focusMs),
    breakCount,
    idleCount,
    focusBlockCount: focusBlocks.length,
    longestFocusMs,
    averageFocusMs,
    idleThresholdMs,
  };
}
