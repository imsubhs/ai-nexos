/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  getMeetingsForProject as real_getMeetingsForProject,
  getMeetingById as real_getMeetingById,
  getMeetingDecisions as real_getMeetingDecisions,
  getMeetingActionItems as real_getMeetingActionItems,
  getMeetings as real_getMeetings,
  getMeetingAttendees as real_getMeetingAttendees,
  getMeetingAgenda as real_getMeetingAgenda,
  getMeetingOutcomes as real_getMeetingOutcomes,
  getMeetingActivity as real_getMeetingActivity,
} from "./real-queries";
import { getDemoStore } from "@/lib/demo/store";

/** Nullable startTime sorts last, matching the SQL `DESC NULLS LAST` (TD-12). */
function byStartTimeDesc(a: any, b: any): number {
  const left = a.startTime ? new Date(a.startTime).getTime() : Number.NEGATIVE_INFINITY;
  const right = b.startTime ? new Date(b.startTime).getTime() : Number.NEGATIVE_INFINITY;
  return right - left;
}

/**
 * PUBLIC READ LAYER — reads directly from the DemoStore.
 *
 * Sprint 12B closed technical-debt item 5: `getMeetingsForProject`,
 * `getMeetingById`, `getMeetingDecisions` and `getMeetingActionItems` were
 * hardcoded stubs returning `[]` / a fake row, so any project-scoped meeting
 * surface rendered empty in demo mode no matter what was seeded or created.
 * They now read the store like every other mock query.
 */
export async function getMeetings(...args: Parameters<typeof real_getMeetings>): Promise<Awaited<ReturnType<typeof real_getMeetings>>> {
  const [cursorOffset = 0, limit = 50] = args;
  const store = getDemoStore();

  return store.meetings
    .slice()
    .sort(byStartTimeDesc)
    .slice(cursorOffset, cursorOffset + limit) as any;
}

export async function getMeetingsForProject(...args: Parameters<typeof real_getMeetingsForProject>): Promise<Awaited<ReturnType<typeof real_getMeetingsForProject>>> {
  const [projectId] = args;
  const store = getDemoStore();

  return store.meetings
    .filter((m: any) => m.projectId === projectId)
    .sort(byStartTimeDesc) as any;
}

export async function getMeetingById(...args: Parameters<typeof real_getMeetingById>): Promise<Awaited<ReturnType<typeof real_getMeetingById>>> {
  const [meetingId] = args;
  const store = getDemoStore();

  return store.meetings.find((m: any) => m.meetingId === meetingId) as any;
}

export async function getMeetingDecisions(...args: Parameters<typeof real_getMeetingDecisions>): Promise<Awaited<ReturnType<typeof real_getMeetingDecisions>>> {
  const [projectId] = args;
  const store = getDemoStore();

  return (store.meetingDecisions ?? [])
    .map((decision: any) => {
      const outcome = (store.meetingOutcomes ?? []).find(
        (o: any) => o.outcomeId === decision.outcomeId,
      );
      return outcome ? { meeting_decisions: decision, meeting_outcomes: outcome } : null;
    })
    .filter((row: any) => row && row.meeting_outcomes.projectId === projectId) as any;
}

export async function getMeetingActionItems(...args: Parameters<typeof real_getMeetingActionItems>): Promise<Awaited<ReturnType<typeof real_getMeetingActionItems>>> {
  const [projectId] = args;
  const store = getDemoStore();

  return (store.meetingActionItems ?? [])
    .map((actionItem: any) => {
      const outcome = (store.meetingOutcomes ?? []).find(
        (o: any) => o.outcomeId === actionItem.outcomeId,
      );
      return outcome ? { meeting_action_items: actionItem, meeting_outcomes: outcome } : null;
    })
    .filter((row: any) => row && row.meeting_outcomes.projectId === projectId) as any;
}

/**
 * MEETING-SCOPED READS (Sprint 12B)
 */
export async function getMeetingAttendees(...args: Parameters<typeof real_getMeetingAttendees>): Promise<Awaited<ReturnType<typeof real_getMeetingAttendees>>> {
  const [meetingId] = args;
  const store = getDemoStore();

  return (store.meetingAttendees ?? [])
    .filter((a: any) => a.meetingId === meetingId)
    .sort((a: any, b: any) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((attendee: any) => {
      const user = store.users.find((u: any) => u.userId === attendee.userId);
      return {
        attendeeId: attendee.attendeeId,
        meetingId: attendee.meetingId,
        userId: attendee.userId,
        externalEmail: attendee.externalEmail,
        role: attendee.role,
        rsvpStatus: attendee.rsvpStatus,
        firstName: user?.firstName ?? null,
        lastName: user?.lastName ?? null,
        email: user?.email ?? null,
      };
    }) as any;
}

export async function getMeetingAgenda(...args: Parameters<typeof real_getMeetingAgenda>): Promise<Awaited<ReturnType<typeof real_getMeetingAgenda>>> {
  const [meetingId] = args;
  const store = getDemoStore();

  return (store.meetingAgenda ?? [])
    .filter((a: any) => a.meetingId === meetingId)
    .sort((a: any, b: any) => a.orderIndex - b.orderIndex) as any;
}

export async function getMeetingOutcomes(...args: Parameters<typeof real_getMeetingOutcomes>): Promise<Awaited<ReturnType<typeof real_getMeetingOutcomes>>> {
  const [meetingId] = args;
  const store = getDemoStore();

  const outcomes = (store.meetingOutcomes ?? []).filter((o: any) => o.meetingId === meetingId);
  const outcomeById = new Map(outcomes.map((o: any) => [o.outcomeId, o]));

  const decisions = (store.meetingDecisions ?? [])
    .filter((d: any) => outcomeById.has(d.outcomeId))
    .map((decision: any) => {
      const outcome: any = outcomeById.get(decision.outcomeId);
      return {
        outcomeId: outcome.outcomeId,
        decisionId: decision.decisionId,
        title: outcome.title,
        description: outcome.description,
        decisionType: decision.decisionType,
        status: decision.status,
        priority: decision.priority,
        createdAt: outcome.createdAt,
      };
    });

  const actionItems = (store.meetingActionItems ?? [])
    .filter((a: any) => outcomeById.has(a.outcomeId))
    .map((actionItem: any) => {
      const outcome: any = outcomeById.get(actionItem.outcomeId);
      return {
        outcomeId: outcome.outcomeId,
        actionItemId: actionItem.actionItemId,
        title: outcome.title,
        description: outcome.description,
        status: actionItem.status,
        priority: actionItem.priority,
        dueDate: actionItem.dueDate,
        promotedToTaskId: actionItem.promotedToTaskId,
        createdAt: outcome.createdAt,
      };
    });

  return { decisions, actionItems } as any;
}

export async function getMeetingActivity(...args: Parameters<typeof real_getMeetingActivity>): Promise<Awaited<ReturnType<typeof real_getMeetingActivity>>> {
  const [meetingId, limit = 50] = args;
  const store = getDemoStore();

  return (store.meetingActivity ?? [])
    .filter((a: any) => a.meetingId === meetingId)
    .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit) as any;
}
