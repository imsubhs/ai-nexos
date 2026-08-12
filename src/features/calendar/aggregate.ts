/**
 * Pure calendar grid assembly. No framework imports, no clock reads — `today`
 * is injected — so the layout is testable without a database or a fake timer.
 *
 * All date arithmetic is UTC. A month grid built with local-time helpers puts
 * the 1st in the wrong cell for anyone whose offset crosses midnight, and the
 * bug only shows up for some viewers on some days, which is the worst kind.
 */
import type {
  CalendarDay,
  CalendarEntry,
  CalendarMonth,
  CalendarSource,
} from "./types";

const DAY_MS = 86_400_000;

function utcDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number): string {
  return toIsoDate(new Date(utcDate(isoDate).getTime() + days * DAY_MS));
}

/** ISO weekday, 1 (Mon) – 7 (Sun). */
function isoWeekday(isoDate: string): number {
  const day = utcDate(isoDate).getUTCDay();
  return day === 0 ? 7 : day;
}

/** True for a well-formed YYYY-MM that names a real month. */
export function isCalendarMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** The inclusive first/last day of `month` (YYYY-MM). */
export function monthRange(month: string): { from: string; to: string } {
  const [year, mon] = month.split("-").map(Number);
  // Day 0 of the next month is the last day of this one — no month-length table.
  const lastDay = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

/** `month` shifted by whole months, for the previous/next controls. */
export function shiftMonth(month: string, delta: number): string {
  const [year, mon] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, mon - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * The padded grid range: whole Monday-first weeks covering `month`.
 *
 * The extra days are why the query range and the display range differ — a
 * calendar that queried only the month itself would render its first and last
 * weeks with visibly empty cells that are not actually empty.
 */
export function gridRange(month: string): { from: string; to: string } {
  const { from, to } = monthRange(month);
  return {
    from: addDays(from, -(isoWeekday(from) - 1)),
    to: addDays(to, 7 - isoWeekday(to)),
  };
}

/**
 * Lays entries out into weeks. Entries outside the padded grid are dropped
 * rather than forced into an edge cell, which would misdate them.
 *
 * Within a day, timed entries come first in chronological order and date-only
 * entries follow: a task due "on the 12th" has no time to sort against a 09:00
 * meeting, and interleaving them by an invented time would imply one.
 */
export function buildCalendarMonth(
  entries: CalendarEntry[],
  opts: { month: string; today: string; sources: CalendarSource[] },
): CalendarMonth {
  const { month, today, sources } = opts;
  const { from, to } = monthRange(month);
  const grid = gridRange(month);

  const byDate = new Map<string, CalendarEntry[]>();
  for (const entry of entries) {
    if (entry.date < grid.from || entry.date > grid.to) continue;
    const bucket = byDate.get(entry.date);
    if (bucket) bucket.push(entry);
    else byDate.set(entry.date, [entry]);
  }
  for (const bucket of byDate.values()) {
    bucket.sort((a, b) => {
      if (a.at && b.at) return a.at.localeCompare(b.at);
      if (a.at) return -1;
      if (b.at) return 1;
      return a.title.localeCompare(b.title);
    });
  }

  const weeks: CalendarDay[][] = [];
  let week: CalendarDay[] = [];
  let totalEntries = 0;

  for (let date = grid.from; date <= grid.to; date = addDays(date, 1)) {
    const dayEntries = byDate.get(date) ?? [];
    const inMonth = date >= from && date <= to;
    if (inMonth) totalEntries += dayEntries.length;
    week.push({ date, inMonth, isToday: date === today, entries: dayEntries });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  // gridRange is whole weeks by construction, so a partial trailing week would
  // mean the arithmetic above drifted. Keeping it rather than asserting means a
  // drift shows as a short row instead of a thrown error on a read-only page.
  if (week.length > 0) weeks.push(week);

  return { month, from, to, weeks, totalEntries, sources };
}
