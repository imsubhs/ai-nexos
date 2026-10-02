import { db } from "@/db";
import {
  meetings,
  meetingAttendees,
  meetingAgenda,
  meetingActivity,
  meetingOutcomes,
  meetingDecisions,
  meetingActionItems,
} from "@/db/schema/meetings";
import { users } from "@/db/schema/users";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import { requireCurrentUser } from "@/features/auth/current-user";
import { requirePermission } from "@/features/permissions";

export async function getMeetingsForProject(projectId: string) {
  const user = await requireCurrentUser();

  const meetingsList = await db.query.meetings.findMany({
    where: and(
      eq(meetings.projectId, projectId),
      eq(meetings.organizationId, user.organizationId),
    ),
    orderBy: [desc(meetings.startTime)],
    // with: { template: true } - omitting for now since relations aren't declared in meetings.ts yet
  });

  return meetingsList;
}

export async function getMeetingById(meetingId: string) {
  const user = await requireCurrentUser();

  const meeting = await db.query.meetings.findFirst({
    where: and(
      eq(meetings.meetingId, meetingId),
      eq(meetings.organizationId, user.organizationId),
    ),
  });

  return meeting;
}

export async function getMeetingDecisions(projectId: string) {
  const user = await requireCurrentUser();

  const decisions = await db
    .select()
    .from(meetingDecisions)
    .innerJoin(
      meetingOutcomes,
      eq(meetingDecisions.outcomeId, meetingOutcomes.outcomeId),
    )
    .where(
      and(
        eq(meetingOutcomes.projectId, projectId),
        eq(meetingDecisions.organizationId, user.organizationId),
      ),
    );

  return decisions;
}

/**
 * PUBLIC READ LAYER (Sprint 11B) — global, cross-project meeting listing.
 */
export async function getMeetings(
  cursorOffset: number = 0,
  limit: number = 50,
) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "meetings", "read");

  return db.query.meetings.findMany({
    where: eq(meetings.organizationId, user.organizationId),
    // Sprint 12B (TD-12): startTime is nullable, so an unscheduled meeting must
    // sort to the end rather than sink into an undefined comparison. The mock
    // sibling had the same bug and is fixed to match.
    orderBy: [sql`${meetings.startTime} DESC NULLS LAST`],
    offset: cursorOffset,
    limit,
  });
}

/**
 * MEETING-SCOPED READS (Sprint 12B)
 *
 * The pre-existing outcome reads are project-scoped, which is why the meeting
 * drawer could not show a decision it had just created. These are the same
 * joins keyed on meetingId.
 */
export async function getMeetingAttendees(meetingId: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "meetings", "read");

  return db
    .select({
      attendeeId: meetingAttendees.attendeeId,
      meetingId: meetingAttendees.meetingId,
      userId: meetingAttendees.userId,
      externalEmail: meetingAttendees.externalEmail,
      role: meetingAttendees.role,
      rsvpStatus: meetingAttendees.rsvpStatus,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    })
    .from(meetingAttendees)
    .leftJoin(users, eq(meetingAttendees.userId, users.userId))
    .where(
      and(
        eq(meetingAttendees.meetingId, meetingId),
        eq(meetingAttendees.organizationId, user.organizationId),
      ),
    )
    .orderBy(asc(meetingAttendees.createdAt));
}

export async function getMeetingAgenda(meetingId: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "meetings", "read");

  return db.query.meetingAgenda.findMany({
    where: and(
      eq(meetingAgenda.meetingId, meetingId),
      eq(meetingAgenda.organizationId, user.organizationId),
    ),
    orderBy: [asc(meetingAgenda.orderIndex)],
  });
}

/**
 * Decisions and action items for ONE meeting, flattened into the shape the
 * drawer renders: outcome fields (title/description/owner) merged with the
 * type-specific row.
 */
export async function getMeetingOutcomes(meetingId: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "meetings", "read");

  const decisionRows = await db
    .select()
    .from(meetingDecisions)
    .innerJoin(
      meetingOutcomes,
      eq(meetingDecisions.outcomeId, meetingOutcomes.outcomeId),
    )
    .where(
      and(
        eq(meetingOutcomes.meetingId, meetingId),
        eq(meetingDecisions.organizationId, user.organizationId),
      ),
    );

  const actionItemRows = await db
    .select()
    .from(meetingActionItems)
    .innerJoin(
      meetingOutcomes,
      eq(meetingActionItems.outcomeId, meetingOutcomes.outcomeId),
    )
    .where(
      and(
        eq(meetingOutcomes.meetingId, meetingId),
        eq(meetingActionItems.organizationId, user.organizationId),
      ),
    );

  return {
    decisions: decisionRows.map((row) => ({
      outcomeId: row.meeting_outcomes.outcomeId,
      decisionId: row.meeting_decisions.decisionId,
      title: row.meeting_outcomes.title,
      description: row.meeting_outcomes.description,
      decisionType: row.meeting_decisions.decisionType,
      status: row.meeting_decisions.status,
      priority: row.meeting_decisions.priority,
      createdAt: row.meeting_outcomes.createdAt,
    })),
    actionItems: actionItemRows.map((row) => ({
      outcomeId: row.meeting_outcomes.outcomeId,
      actionItemId: row.meeting_action_items.actionItemId,
      title: row.meeting_outcomes.title,
      description: row.meeting_outcomes.description,
      status: row.meeting_action_items.status,
      priority: row.meeting_action_items.priority,
      dueDate: row.meeting_action_items.dueDate,
      promotedToTaskId: row.meeting_action_items.promotedToTaskId,
      createdAt: row.meeting_outcomes.createdAt,
    })),
  };
}

export async function getMeetingActivity(
  meetingId: string,
  limit: number = 50,
) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "meetings", "read");

  return db.query.meetingActivity.findMany({
    where: and(
      eq(meetingActivity.meetingId, meetingId),
      eq(meetingActivity.organizationId, user.organizationId),
    ),
    orderBy: [desc(meetingActivity.createdAt)],
    limit,
  });
}

export async function getMeetingActionItems(projectId: string) {
  const user = await requireCurrentUser();

  const actionItems = await db
    .select()
    .from(meetingActionItems)
    .innerJoin(
      meetingOutcomes,
      eq(meetingActionItems.outcomeId, meetingOutcomes.outcomeId),
    )
    .where(
      and(
        eq(meetingOutcomes.projectId, projectId),
        eq(meetingActionItems.organizationId, user.organizationId),
      ),
    );

  return actionItems;
}
