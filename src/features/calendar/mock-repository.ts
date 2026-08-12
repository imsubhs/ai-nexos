/**
 * DemoStore-backed CalendarRepository. Reads the same three seeded collections
 * the Meetings, Timelines and Tasks demo screens read, so a demo calendar shows
 * the demo project's actual schedule rather than a parallel fixture.
 */
import { getDemoStore } from "@/lib/demo/store";
import type { CalendarRepository } from "./repository";
import type { CalendarEntry, CalendarSource } from "./types";

type DemoMeeting = {
  meetingId: string;
  organizationId: string;
  title: string;
  status: string;
  startTime: Date | string | null;
  endTime: Date | string | null;
};

type DemoMilestone = {
  milestoneId: string;
  organizationId: string;
  timelineId: string;
  name: string;
  status: string;
  startDate: Date | string | null;
  endDate: Date | string | null;
};

type DemoTask = {
  taskId: string;
  organizationId: string;
  name: string;
  status: string;
  dueDate: Date | string | null;
  isTemplate: boolean;
};

type DemoTimeline = { timelineId: string; projectId: string };

function toDate(value: Date | string | null): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayOf(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function inRange(day: string, range: { from: string; to: string }): boolean {
  return day >= range.from && day <= range.to;
}

export const mockCalendarRepository: CalendarRepository = {
  async listEntries(organizationId, range, sources) {
    if (sources.length === 0) return [];
    const wanted = new Set<CalendarSource>(sources);
    const store = getDemoStore();
    const entries: CalendarEntry[] = [];

    if (wanted.has("meeting")) {
      for (const m of store.meetings as DemoMeeting[]) {
        if (m.organizationId !== organizationId) continue;
        const start = toDate(m.startTime);
        if (!start || !inRange(dayOf(start), range)) continue;
        const end = toDate(m.endTime);
        entries.push({
          entryId: `meeting:${m.meetingId}`,
          source: "meeting",
          title: m.title,
          date: dayOf(start),
          at: start.toISOString(),
          endAt: end ? end.toISOString() : null,
          status: m.status,
          href: "/meetings",
        });
      }
    }

    if (wanted.has("milestone")) {
      const projectOf = new Map(
        (store.timelines as DemoTimeline[]).map((t) => [
          t.timelineId,
          t.projectId,
        ]),
      );
      for (const ms of store.milestones as DemoMilestone[]) {
        if (ms.organizationId !== organizationId) continue;
        const observed = toDate(ms.endDate) ?? toDate(ms.startDate);
        if (!observed || !inRange(dayOf(observed), range)) continue;
        const projectId = projectOf.get(ms.timelineId);
        entries.push({
          entryId: `milestone:${ms.milestoneId}`,
          source: "milestone",
          title: ms.name,
          date: dayOf(observed),
          at: null,
          endAt: null,
          status: ms.status,
          href: projectId ? `/projects/${projectId}/timeline` : "/timeline",
        });
      }
    }

    if (wanted.has("task")) {
      for (const t of store.tasks as DemoTask[]) {
        if (t.organizationId !== organizationId || t.isTemplate) continue;
        const due = toDate(t.dueDate);
        if (!due || !inRange(dayOf(due), range)) continue;
        entries.push({
          entryId: `task:${t.taskId}`,
          source: "task",
          title: t.name,
          date: dayOf(due),
          at: null,
          endAt: null,
          status: t.status,
          href: "/tasks",
        });
      }
    }

    return entries;
  },
};
