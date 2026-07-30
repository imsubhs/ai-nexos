// ============================================================
// WORK VALIDATION — VALUE OBJECTS (Sprint 4A, doc 14 §5/§6)
// ------------------------------------------------------------
// Immutable, framework-free value objects shared across every
// sub-engine. All timestamps are epoch milliseconds (numbers),
// never ISO strings or Date objects — the engine is decoupled
// from persistence shapes so it stays pure and portable.
//
// PURE DOMAIN CODE. No imports from React / Next.js / DemoStore /
// repositories / Drizzle / Supabase / infrastructure of any kind.
// ============================================================

/** Milliseconds in one minute — the persistence granularity (doc 14 §5). */
export const MINUTE_MS = 60_000;

/**
 * A half-open time interval `[start, end)` in epoch milliseconds.
 * Zero-length intervals carry no duration and are dropped by the algebra.
 */
export interface Interval {
  readonly start: number;
  readonly end: number;
}

/**
 * A span of time as produced by upstream trackers. `endAt === null` means the
 * period is still open (in progress); the engine closes it against `now`.
 * Ported verbatim from the workforce shared VOs (W1) for input compatibility.
 */
export interface TimePeriod {
  readonly startAt: number;
  readonly endAt: number | null;
}

/** Classification of a slice of session time in the derived timeline. */
export type TimelineKind = "WORK" | "BREAK" | "IDLE";

/** One ordered, labelled slice of the session. Slices partition the session. */
export interface TimelineEntry {
  readonly start: number;
  readonly end: number;
  readonly durationMs: number;
  readonly kind: TimelineKind;
}

/** Round milliseconds to whole minutes (the persistence granularity). */
export function msToMinutes(ms: number): number {
  return Math.round(ms / MINUTE_MS);
}

/** Duration of an interval in ms (always ≥ 0 for a valid interval). */
export function intervalDuration(interval: Interval): number {
  return Math.max(0, interval.end - interval.start);
}

/**
 * Close a (possibly open) {@link TimePeriod} into a concrete {@link Interval}
 * against `now`. An open period ends at `now`; the end is never before start.
 */
export function periodToInterval(period: TimePeriod, now: number): Interval {
  const end = period.endAt ?? now;
  return { start: period.startAt, end: Math.max(period.startAt, end) };
}
