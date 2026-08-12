/**
 * Calendar read models.
 *
 * The Calendar is a LENS, not a domain. Merge doc 13 §2 registers `/calendar`
 * as a platform nav destination with no owning context, no permission of its
 * own, and no read model — because it has no records of its own. Everything it
 * shows is already stored by the module that owns it: a meeting belongs to
 * Meetings, a milestone to Timelines, a task to Tasks.
 *
 * So there is no `calendar_events` table and there must never be one. A second
 * home for "when is this happening" would immediately disagree with the first,
 * and the disagreement would be invisible. Every entry below therefore carries
 * an `href` back to the module that owns the truth.
 */

/** The dated platform records this lens reads, in legend order. */
export const CALENDAR_SOURCES = ["meeting", "milestone", "task"] as const;
export type CalendarSource = (typeof CALENDAR_SOURCES)[number];

/** Which module permission each source is gated on (composed per viewer). */
export const CALENDAR_SOURCE_PERMISSION = {
  meeting: "meetings",
  milestone: "timeline",
  task: "tasks",
} as const;

/** Human labels — used by the legend and by each entry's accessible name. */
export const CALENDAR_SOURCE_LABEL: Record<CalendarSource, string> = {
  meeting: "Meeting",
  milestone: "Milestone",
  task: "Task due",
};

export interface CalendarEntry {
  /** `${source}:${id}` — unique across sources, stable across reads. */
  entryId: string;
  source: CalendarSource;
  title: string;
  /** The UTC day this entry occupies in the grid (YYYY-MM-DD). */
  date: string;
  /** Start instant when the source records a time; null for date-only records. */
  at: string | null;
  endAt: string | null;
  /** The owning module's own status value, shown verbatim. */
  status: string | null;
  /** Deep link to the record's owning module — where the truth lives. */
  href: string;
}

export interface CalendarDay {
  date: string;
  /** False for the leading/trailing days that pad the grid to whole weeks. */
  inMonth: boolean;
  isToday: boolean;
  entries: CalendarEntry[];
}

export interface CalendarMonth {
  /** YYYY-MM. */
  month: string;
  /** First and last day of the month itself, not of the padded grid. */
  from: string;
  to: string;
  /** Monday-first weeks, each exactly seven days. */
  weeks: CalendarDay[][];
  /** Entries inside the month — padding days are not counted. */
  totalEntries: number;
  /**
   * The sources this viewer was permitted to read. An empty array is a real
   * answer (a viewer with none of the three read permissions), and the UI says
   * so rather than showing an empty month as if nothing were scheduled.
   */
  sources: CalendarSource[];
}
