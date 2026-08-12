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
import { and, asc, eq, gte, isNotNull, lte, sql } from "drizzle-orm";
import type { CalendarRepository } from "./repository";
import type { CalendarEntry, CalendarSource } from "./types";

/** Widest window a single read will serve — a year of entries. */
const MAX_ENTRIES = 2_000;

/** Inclusive ISO date → the exclusive UTC instant just past its end. */
function endExclusive(isoDate: string): Date {
  return new Date(Date.parse(`${isoDate}T00:00:00.000Z`) + 86_400_000);
}

function startInstant(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
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
        lte(meetings.startTime, endExclusive(range.to)),
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
        isNotNull(observed),
        gte(observed, startInstant(range.from)),
        lte(observed, endExclusive(range.to)),
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
        lte(tasks.dueDate, endExclusive(range.to)),
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
