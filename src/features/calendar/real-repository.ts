/**
 * Drizzle-backed CalendarRepository — three org-scoped SELECTs over tables that
 * already exist. Nothing is written, and no calendar table is read, because
 * none exists (see types.ts).
 *
 * Each query filters on the source's own scheduling column, so a record with no
 * date simply is not on the calendar rather than defaulting onto some day.
 */
import { db } from "@/db";
import { meetings, milestones, tasks, timelines } from "@/db/schema";
import { and, asc, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import type { CalendarRepository } from "./repository";
import type { CalendarEntry, CalendarSource } from "./types";

/** Widest window a single read will serve — a year of entries. */
const MAX_ENTRIES = 2_000;

/**
 * The range is half-open in UTC: `[from 00:00, to+1day 00:00)`.
 *
 * `to` is an inclusive *date* but the columns are instants, so an inclusive
 * upper bound would either drop everything after midnight on the last day or —
 * if written as `<= to+1day` — admit an entry at exactly 00:00:00.000 the
 * following morning and date it to the wrong day.
 */
function startInstant(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function endInstantExclusive(isoDate: string): Date {
  return new Date(Date.parse(`${isoDate}T00:00:00.000Z`) + 86_400_000);
}

function dayOf(value: Date): string {
  return value.toISOString().slice(0, 10);
}

async function meetingEntries(
  organizationId: string,
  range: { from: string; to: string },
): Promise<CalendarEntry[]> {
  const rows = await db
    .select({
      meetingId: meetings.meetingId,
      title: meetings.title,
      startTime: meetings.startTime,
      endTime: meetings.endTime,
      status: meetings.status,
    })
    .from(meetings)
    .where(
      and(
        eq(meetings.organizationId, organizationId),
        isNotNull(meetings.startTime),
        gte(meetings.startTime, startInstant(range.from)),
        lt(meetings.startTime, endInstantExclusive(range.to)),
      ),
    )
    .orderBy(asc(meetings.startTime))
    .limit(MAX_ENTRIES);

  return rows
    .filter((r) => r.startTime !== null)
    .map((r) => ({
      entryId: `meeting:${r.meetingId}`,
      source: "meeting" as const,
      title: r.title,
      date: dayOf(r.startTime as Date),
      at: (r.startTime as Date).toISOString(),
      endAt: r.endTime ? r.endTime.toISOString() : null,
      status: r.status,
      // Meetings have no detail route yet; the hub is the honest destination.
      href: "/meetings",
    }));
}

async function milestoneEntries(
  organizationId: string,
  range: { from: string; to: string },
): Promise<CalendarEntry[]> {
  // A milestone is a point, not a span: it lands on its end date, falling back
  // to its start date when only that is set.
  const observed = sql<Date>`coalesce(${milestones.endDate}, ${milestones.startDate})`;

  // The bounds are written as SQL fragments with explicit `::timestamptz` casts
  // rather than through gte()/lt(). Drizzle infers a parameter's type from the
  // *column* being compared, and `observed` is a raw expression with no column
  // to infer from — so a Date bound reached the driver untyped and postgres.js
  // rejected it ("must be of type string"). Caught by running the query against
  // the live database; a typecheck cannot see it.
  const lower = startInstant(range.from).toISOString();
  const upper = endInstantExclusive(range.to).toISOString();

  const rows = await db
    .select({
      milestoneId: milestones.milestoneId,
      name: milestones.name,
      status: milestones.status,
      projectId: timelines.projectId,
      observed,
    })
    .from(milestones)
    .innerJoin(timelines, eq(milestones.timelineId, timelines.timelineId))
    .where(
      and(
        eq(milestones.organizationId, organizationId),
        // coalesce is null only when both dates are, and a null fails both
        // comparisons below — so an undated milestone is simply not on the
        // calendar, with no separate null check needed.
        sql`${observed} >= ${lower}::timestamptz`,
        sql`${observed} < ${upper}::timestamptz`,
      ),
    )
    .limit(MAX_ENTRIES);

  return rows.map((r) => {
    const observedAt = new Date(r.observed);
    return {
      entryId: `milestone:${r.milestoneId}`,
      source: "milestone" as const,
      title: r.name,
      date: dayOf(observedAt),
      // A milestone is a day, not an appointment — no time is implied.
      at: null,
      endAt: null,
      status: r.status,
      href: `/projects/${r.projectId}/timeline`,
    };
  });
}

async function taskEntries(
  organizationId: string,
  range: { from: string; to: string },
): Promise<CalendarEntry[]> {
  const rows = await db
    .select({
      taskId: tasks.taskId,
      name: tasks.name,
      dueDate: tasks.dueDate,
      status: tasks.status,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.organizationId, organizationId),
        isNotNull(tasks.dueDate),
        gte(tasks.dueDate, startInstant(range.from)),
        lt(tasks.dueDate, endInstantExclusive(range.to)),
        eq(tasks.isTemplate, false),
      ),
    )
    .orderBy(asc(tasks.dueDate))
    .limit(MAX_ENTRIES);

  return rows
    .filter((r) => r.dueDate !== null)
    .map((r) => ({
      entryId: `task:${r.taskId}`,
      source: "task" as const,
      title: r.name,
      date: dayOf(r.dueDate as Date),
      at: null,
      endAt: null,
      status: r.status,
      href: "/tasks",
    }));
}

export const realCalendarRepository: CalendarRepository = {
  async listEntries(organizationId, range, sources) {
    if (sources.length === 0) return [];
    const wanted = new Set<CalendarSource>(sources);

    // Independent reads — awaited together rather than in sequence so the page
    // waits for the slowest source, not for their sum.
    const [meetingRows, milestoneRows, taskRows] = await Promise.all([
      wanted.has("meeting") ? meetingEntries(organizationId, range) : [],
      wanted.has("milestone") ? milestoneEntries(organizationId, range) : [],
      wanted.has("task") ? taskEntries(organizationId, range) : [],
    ]);

    return [...meetingRows, ...milestoneRows, ...taskRows];
  },
};
