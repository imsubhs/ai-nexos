"use server";

import { db } from "@/db";
import { 
  meetings,
  meetingOutcomes,
  meetingDecisions,
  meetingActionItems,
} from "@/db/schema/meetings";
import { eq, and, desc } from "drizzle-orm";
import { requireCurrentUser } from "@/features/auth/current-user";

export async function getMeetingsForProject(projectId: string) {
  const user = await requireCurrentUser();

  const meetingsList = await db.query.meetings.findMany({
    where: and(
      eq(meetings.projectId, projectId),
      eq(meetings.organizationId, user.organizationId)
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
      eq(meetings.organizationId, user.organizationId)
    ),
  });

  return meeting;
}

export async function getMeetingDecisions(projectId: string) {
  const user = await requireCurrentUser();

  const decisions = await db
    .select()
    .from(meetingDecisions)
    .innerJoin(meetingOutcomes, eq(meetingDecisions.outcomeId, meetingOutcomes.outcomeId))
    .where(
      and(
        eq(meetingOutcomes.projectId, projectId),
        eq(meetingDecisions.organizationId, user.organizationId)
      )
    );

  return decisions;
}

export async function getMeetingActionItems(projectId: string) {
  const user = await requireCurrentUser();

  const actionItems = await db
    .select()
    .from(meetingActionItems)
    .innerJoin(meetingOutcomes, eq(meetingActionItems.outcomeId, meetingOutcomes.outcomeId))
    .where(
      and(
        eq(meetingOutcomes.projectId, projectId),
        eq(meetingActionItems.organizationId, user.organizationId)
      )
    );

  return actionItems;
}
