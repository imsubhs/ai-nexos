// ============================================================
// WORK VALIDATION — INPUT & RESULT TYPES (Sprint 4A)
// ------------------------------------------------------------
// The public data contract of the engine. Inputs are epoch-ms
// TimePeriods (decoupled from persistence); outputs are the full
// ValidationResult model (metrics + timeline + violations +
// warnings + derived metrics).
// ============================================================

import type { PartialEngineConfig } from "./config";
import type { TimelineEntry, TimePeriod } from "./value-objects";

/** One clock-in / clock-out pair. `clockOut === null` → open (in progress). */
export interface ClockSegment {
  readonly clockIn: number;
  readonly clockOut: number | null;
}

/**
 * Everything the engine needs to validate a day. Supports one *or many* clock
 * segments (WorkTrack allows re-clocking); a single-segment day is the common
 * case. Breaks/idle/focus periods are produced by the break module and the
 * activity tracker respectively.
 */
export interface WorkValidationInput {
  /** One or more clock segments. Overlaps are merged; invalid ones dropped. */
  readonly segments: ClockSegment[];
  /** Employee-declared break periods (PRD §25). */
  readonly breaks: TimePeriod[];
  /** Detected inactivity periods (PRD §24). */
  readonly idlePeriods: TimePeriod[];
  /** Browser-tab-visible periods (PRD §23 "Focus Duration"). */
  readonly focusPeriods: TimePeriod[];
  /** Optional per-call policy overrides. */
  readonly config?: PartialEngineConfig;
}

/**
 * Legacy single-session input (ported W1 shape). Retained so the historical
 * `computeWorkValidation` contract and its 22 tests keep passing verbatim.
 */
export interface WorkSessionInput {
  readonly loginAt: number;
  readonly logoutAt: number | null;
  readonly breaks: TimePeriod[];
  readonly idlePeriods: TimePeriod[];
  readonly focusPeriods: TimePeriod[];
}

/** Severity of a structured finding on the result. */
export type Severity = "violation" | "warning";

/** Stable codes for engine findings (never thrown — reported on the result). */
export type FindingCode =
  | "negative-session" // clockOut ≤ clockIn — segment dropped
  | "open-session" // no clock-out — bounded at `now`
  | "clock-out-before-break-end" // break extends past session end — clamped
  | "overlapping-breaks" // raw breaks overlapped — merged
  | "invalid-break" // zero/negative-length break — dropped
  | "break-outside-session" // break fully outside the session — dropped
  | "idle-exceeds-threshold" // a single idle block far exceeds the policy idle threshold
  | "idle-below-threshold-reclassified"; // short idle span counted as effective

/** A structured, non-fatal finding surfaced on the {@link ValidationResult}. */
export interface Finding {
  readonly code: FindingCode;
  readonly severity: Severity;
  readonly message: string;
  /** The offending span, when the finding is spatial. */
  readonly interval?: { start: number; end: number };
}

/**
 * Ratios and counts derived from the core metrics. All ratios are in `[0, 1]`
 * and computed against session time (0 when the session is empty).
 */
export interface DerivedMetrics {
  readonly effectiveRatio: number;
  readonly idleRatio: number;
  readonly breakRatio: number;
  /** Focus is an independent axis → ratio is focus / session. */
  readonly focusRatio: number;
  readonly breakCount: number;
  readonly idleCount: number;
  readonly focusBlockCount: number;
  readonly longestFocusMs: number;
  readonly averageFocusMs: number;
  /** Echo of the policy idle threshold that governed this run. */
  readonly idleThresholdMs: number;
}

/**
 * The complete validated output.
 *
 * `*Ms` fields are the exact source of truth. `*Minutes` are display-friendly
 * and preserve the minute invariant
 * `sessionMinutes === breakMinutes + idleMinutes + effectiveMinutes`.
 *
 * Canonical invariant (ms and minutes): **session = effective + idle + break**.
 * Focus is a separate axis and never participates in the invariant.
 */
export interface ValidationResult {
  readonly sessionMs: number;
  readonly effectiveMs: number;
  readonly breakMs: number;
  readonly idleMs: number;
  readonly focusMs: number;

  readonly sessionMinutes: number;
  readonly effectiveMinutes: number;
  readonly breakMinutes: number;
  readonly idleMinutes: number;
  readonly focusMinutes: number;

  /** Ordered slices that partition the session into WORK / BREAK / IDLE. */
  readonly timeline: TimelineEntry[];
  /** Ordered, disjoint focus blocks (excludes break, idle and non-working). */
  readonly focusBlocks: TimelineEntry[];

  readonly violations: Finding[];
  readonly warnings: Finding[];
  readonly derived: DerivedMetrics;

  /** True while at least one clock segment is still open. */
  readonly isOngoing: boolean;
}

/**
 * The finalized minute metrics historically returned by `computeWorkValidation`
 * (W1). A projection of {@link ValidationResult} for backward compatibility.
 */
export interface WorkValidationMetrics {
  readonly sessionMs: number;
  readonly breakMs: number;
  readonly idleMs: number;
  readonly focusMs: number;
  readonly effectiveMs: number;

  readonly sessionMinutes: number;
  readonly breakMinutes: number;
  readonly idleMinutes: number;
  readonly focusMinutes: number;
  readonly effectiveMinutes: number;

  readonly isOngoing: boolean;
}
