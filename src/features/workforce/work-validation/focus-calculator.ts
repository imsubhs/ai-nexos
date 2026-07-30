// ============================================================
// WORK VALIDATION — FOCUS TIME ENGINE (Sprint 4A)
// ------------------------------------------------------------
// Derives uninterrupted focus blocks from raw tab-visible periods.
// Focus is an INDEPENDENT axis (PRD §23): it never participates in
// the session = effective + idle + break invariant. A focus block is
// tab-visible time that is NOT break, NOT idle, and NOT non-working
// (outside the session).
//
//   focus = (visible ∩ session) − break − idle,  then merge & filter
//
// Pure & total. Returns ordered, disjoint focus blocks.
// ============================================================

import type { EngineConfig } from "./config";
import { IntervalEngine } from "./interval-engine";
import type { BuiltSession } from "./session-builder";
import {
  type Interval,
  periodToInterval,
  type TimePeriod,
} from "./value-objects";

export interface CalculatedFocus {
  /** Ordered, disjoint focus blocks (excludes break, idle & non-working). */
  readonly intervals: Interval[];
  readonly focusMs: number;
}

export function calculateFocus(
  focusPeriods: readonly TimePeriod[],
  session: BuiltSession,
  breaks: readonly Interval[],
  idle: readonly Interval[],
  now: number,
  config: EngineConfig,
): CalculatedFocus {
  const closed = focusPeriods.map((period) => periodToInterval(period, now));

  // Restrict to working time, then remove break and idle spans.
  const working = IntervalEngine.intersect(closed, session.intervals);
  const exclusions = IntervalEngine.merge([...breaks, ...idle]);
  const focused = IntervalEngine.subtract(working, exclusions);

  // Merge touching blocks, then drop blocks below the sustained-focus minimum.
  const merged = IntervalEngine.merge(focused, config.mergeGapMs);
  const kept =
    config.minFocusBlockMs > 0
      ? merged.filter(
          (block) => block.end - block.start >= config.minFocusBlockMs,
        )
      : merged;

  return { intervals: kept, focusMs: IntervalEngine.totalDuration(kept) };
}
