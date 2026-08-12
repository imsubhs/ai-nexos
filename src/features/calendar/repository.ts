/**
 * CalendarRepository — the read-only boundary for the calendar lens.
 *
 * Read-only is a hard rule, not a phase: NO write method may ever be added
 * here. Every record the calendar shows is owned by another module, and a write
 * path through this interface would create the second source of truth the lens
 * exists to avoid.
 *
 * `organizationId` comes first, as it does on every repository in the codebase
 * — org scoping is an invariant of the boundary, never a caller's option.
 */
import type { CalendarEntry, CalendarSource } from "./types";

export interface CalendarRepository {
  /**
   * Every entry in `[range.from, range.to]` (inclusive ISO dates) drawn from
   * `sources` only. An empty `sources` returns no rows without querying —
   * the caller has already decided this viewer may read nothing.
   */
  listEntries(
    organizationId: string,
    range: { from: string; to: string },
    sources: CalendarSource[],
  ): Promise<CalendarEntry[]>;
}
