// ============================================================
// WORK VALIDATION — INTERVAL ALGEBRA ENGINE (Sprint 4A)
// ------------------------------------------------------------
// The correctness core. Idle / break / focus durations are computed
// by normalizing, sorting, merging, intersecting and subtracting
// half-open intervals so nothing is ever double-counted.
//
// Every function is pure and total. Intervals are half-open
// [start, end): zero/negative-length spans carry no duration and are
// dropped by `normalize`. All other operations assume — and preserve
// — the "merged" canonical form (disjoint, sorted, positive-length).
//
// Time complexity is O(n log n) for the sort in `normalize`/`merge`
// and O(n + m) for the two-pointer `subtract`/`intersect` on already
// merged inputs. Memory is O(n) — a new array per operation, inputs
// are never mutated.
// ============================================================

import type { Interval } from "./value-objects";

/**
 * Normalize a raw interval set into canonical form: each interval's `end` is
 * pinned to at least its `start`, zero/negative-length intervals are dropped,
 * and the rest is sorted by `start` (ties broken by `end`). Does NOT merge
 * overlaps — that is {@link merge}'s job.
 */
function normalize(intervals: readonly Interval[]): Interval[] {
  return intervals
    .map((iv): Interval => ({ start: iv.start, end: Math.max(iv.start, iv.end) }))
    .filter((iv) => iv.end > iv.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
}

/**
 * Merge a set into the minimal set of disjoint, sorted intervals covering the
 * same time. Intervals whose gap is `≤ gapMs` are joined (default 0 → only
 * touching/overlapping intervals merge). Overlaps are always collapsed.
 */
function merge(intervals: readonly Interval[], gapMs = 0): Interval[] {
  const sorted = normalize(intervals);
  const merged: Interval[] = [];
  for (const iv of sorted) {
    const last = merged[merged.length - 1];
    if (last && iv.start <= last.end + gapMs) {
      if (iv.end > last.end) merged[merged.length - 1] = { start: last.start, end: iv.end };
    } else {
      merged.push(iv);
    }
  }
  return merged;
}

/** Alias of {@link normalize} exposed for callers that only need sorting. */
function sort(intervals: readonly Interval[]): Interval[] {
  return normalize(intervals);
}

/** Intersect a single interval with the bounds `[lo, hi)`; null when empty. */
function clamp(iv: Interval, lo: number, hi: number): Interval | null {
  const start = Math.max(iv.start, lo);
  const end = Math.min(iv.end, hi);
  return end > start ? { start, end } : null;
}

/**
 * Intersect two interval sets, returning the merged set of spans covered by
 * BOTH. Used to clamp breaks/idle/focus to the (possibly multi-segment)
 * session. Two-pointer sweep over the merged inputs — O(n + m).
 */
function intersect(a: readonly Interval[], b: readonly Interval[]): Interval[] {
  const left = merge(a);
  const right = merge(b);
  const result: Interval[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    const start = Math.max(left[i].start, right[j].start);
    const end = Math.min(left[i].end, right[j].end);
    if (end > start) result.push({ start, end });
    if (left[i].end < right[j].end) i += 1;
    else j += 1;
  }
  return result;
}

/**
 * Subtract `holes` from `base`, returning the portions of `base` not covered
 * by any hole. Both inputs are merged first, so the result is always disjoint
 * and sorted. Two-pointer sweep — O(n + m).
 */
function subtract(base: readonly Interval[], holes: readonly Interval[]): Interval[] {
  const mergedBase = merge(base);
  const mergedHoles = merge(holes);
  const result: Interval[] = [];

  for (const segment of mergedBase) {
    let cursor = segment.start;
    for (const hole of mergedHoles) {
      if (hole.end <= cursor) continue; // hole entirely before the cursor
      if (hole.start >= segment.end) break; // holes sorted; none can overlap now
      if (hole.start > cursor) {
        result.push({ start: cursor, end: Math.min(hole.start, segment.end) });
      }
      cursor = Math.max(cursor, hole.end);
      if (cursor >= segment.end) break;
    }
    if (cursor < segment.end) result.push({ start: cursor, end: segment.end });
  }
  return result;
}

/**
 * Split each interval at the given instants (each cut inside an interval breaks
 * it into adjacent pieces). Cuts outside an interval are ignored. Result stays
 * sorted; total covered duration is unchanged. O((n + k) log …) via normalize.
 */
function split(intervals: readonly Interval[], cuts: readonly number[]): Interval[] {
  const sortedCuts = [...new Set(cuts)].sort((a, b) => a - b);
  const pieces: Interval[] = [];
  for (const iv of normalize(intervals)) {
    let cursor = iv.start;
    for (const cut of sortedCuts) {
      if (cut <= cursor) continue;
      if (cut >= iv.end) break;
      pieces.push({ start: cursor, end: cut });
      cursor = cut;
    }
    pieces.push({ start: cursor, end: iv.end });
  }
  return pieces;
}

/** Total covered duration (ms). Overlaps counted once — inputs are merged. */
function totalDuration(intervals: readonly Interval[]): number {
  return merge(intervals).reduce((sum, iv) => sum + (iv.end - iv.start), 0);
}

/**
 * Detect overlapping intervals in a set (before merging). Returns the pairs of
 * adjacent-in-sort-order intervals that overlap — enough to flag "overlapping
 * breaks" without enumerating every transitive pair.
 */
function findOverlaps(intervals: readonly Interval[]): Array<[Interval, Interval]> {
  const sorted = normalize(intervals);
  const overlaps: Array<[Interval, Interval]> = [];
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].start < sorted[i - 1].end) overlaps.push([sorted[i - 1], sorted[i]]);
  }
  return overlaps;
}

/** True when the set is already in canonical merged form (disjoint & sorted). */
function isDisjointSorted(intervals: readonly Interval[]): boolean {
  for (let i = 1; i < intervals.length; i += 1) {
    if (intervals[i].start < intervals[i - 1].end) return false;
    if (intervals[i].start < intervals[i - 1].start) return false;
  }
  return true;
}

/**
 * The Interval Algebra Engine — the single home for all interval math in the
 * Work Validation bounded context. No other module re-implements these.
 */
export const IntervalEngine = {
  normalize,
  merge,
  sort,
  clamp,
  intersect,
  subtract,
  split,
  totalDuration,
  findOverlaps,
  isDisjointSorted,
} as const;
