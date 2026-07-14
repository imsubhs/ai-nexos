"use server";

import { db } from "@/db";
import { 
  meetings,
  meetingOutcomes,
  meetingDecisions,
  meetingActionItems,
  meetingActivity
} from "@/db/schema/meetings";
import { tasks } from "@/db/schema/tasks";
import { eq } from "drizzle-orm";
import { requireCurrentUser } from "@/features/auth/current-user";
import { 
  createMeetingSchema,
  createDecisionSchema,
  createActionItemSchema,
  promoteActionItemSchema
} from "./schemas";
import { z } from "zod";
import {
  CreateMeetingInput,
  CreateDecisionInput,
  CreateActionItemInput
} from "./types";

export async function createMeeting(input: CreateMeetingInput) {
  const user = await requireCurrentUser();

  const validatedData = createMeetingSchema.parse(input);

  const [newMeeting] = await db.insert(meetings).values({
    organizationId: user.organizationId,
    projectId: validatedData.projectId,
    title: validatedData.title,
    description: validatedData.description,
    meetingType: validatedData.meetingType,
    startTime: validatedData.startTime,
    endTime: validatedData.endTime,
    timezone: validatedData.timezone,
    location: validatedData.location,
    meetingUrl: validatedData.meetingUrl,
    provider: validatedData.provider,
    isPrivate: validatedData.isPrivate,
    isConfidential: validatedData.isConfidential,
    createdBy: user.userId,
  }).returning();

  await db.insert(meetingActivity).values({
    organizationId: user.organizationId,
    projectId: validatedData.projectId,
    meetingId: newMeeting.meetingId,
    eventType: "meeting_created",
    metadata: { title: newMeeting.title },
    createdBy: user.userId
  });

  return newMeeting;
}

export async function createDecision(input: CreateDecisionInput) {
  const user = await requireCurrentUser();

  const validatedData = createDecisionSchema.parse(input);

  const meeting = await db.query.meetings.findFirst({
    where: eq(meetings.meetingId, validatedData.meetingId)
  });
  if (!meeting) throw new Error("Meeting not found");

  const [outcome] = await db.insert(meetingOutcomes).values({
    organizationId: user.organizationId,
    projectId: meeting.projectId,
    meetingId: validatedData.meetingId,
    outcomeType: "decision",
    title: validatedData.title,
    description: validatedData.description,
    ownerId: validatedData.ownerId,
    raisedById: user.userId,
    createdBy: user.userId,
  }).returning();

  const [decision] = await db.insert(meetingDecisions).values({
    organizationId: user.organizationId,
    outcomeId: outcome.outcomeId,
    decisionType: validatedData.decisionType,
    status: validatedData.status,
    priority: validatedData.priority,
    reason: validatedData.reason,
    impactDescription: validatedData.impactDescription,
    riskLevel: validatedData.riskLevel,
    createdBy: user.userId,
  }).returning();

  return { outcome, decision };
}

export async function createActionItem(input: CreateActionItemInput) {
  const user = await requireCurrentUser();

  const validatedData = createActionItemSchema.parse(input);

  const meeting = await db.query.meetings.findFirst({
    where: eq(meetings.meetingId, validatedData.meetingId)
  });
  if (!meeting) throw new Error("Meeting not found");

  const [outcome] = await db.insert(meetingOutcomes).values({
    organizationId: user.organizationId,
    projectId: meeting.projectId,
    meetingId: validatedData.meetingId,
    outcomeType: "action_item",
    title: validatedData.title,
    description: validatedData.description,
    ownerId: validatedData.ownerId,
    raisedById: user.userId,
    createdBy: user.userId,
  }).returning();

  const [actionItem] = await db.insert(meetingActionItems).values({
    organizationId: user.organizationId,
    outcomeId: outcome.outcomeId,
    status: validatedData.status,
    priority: validatedData.priority,
    dueDate: validatedData.dueDate,
    estimatedDurationMins: validatedData.estimatedDurationMins,
    createdBy: user.userId,
  }).returning();

  return { outcome, actionItem };
}

export async function promoteActionItemToTask(input: z.infer<typeof promoteActionItemSchema>) {
  const user = await requireCurrentUser();
  const validatedData = promoteActionItemSchema.parse(input);

  const result = await db.select()
    .from(meetingActionItems)
    .innerJoin(meetingOutcomes, eq(meetingActionItems.outcomeId, meetingOutcomes.outcomeId))
    .where(eq(meetingActionItems.actionItemId, validatedData.actionItemId))
    .limit(1);

  if (!result || result.length === 0) {
    throw new Error("Action item not found");
  }

  const actionItemData = result[0];
  const actionItem = actionItemData.meeting_action_items;
  const outcome = actionItemData.meeting_outcomes;

  if (actionItem.promotedToTaskId) throw new Error("Action item already promoted");

  const taskCode = `AIC-T-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`;

  const [task] = await db.insert(tasks).values({
    organizationId: user.organizationId,
    projectId: validatedData.projectId,
    timelineId: validatedData.timelineId,
    phaseId: validatedData.phaseId,
    milestoneId: validatedData.milestoneId,
    taskCode,
    name: outcome.title,
    description: { text: outcome.description },
    status: "todo",
    priority: actionItem.priority,
    taskType: "other",
    dueDate: actionItem.dueDate,
    estimatedDurationMins: actionItem.estimatedDurationMins,
    createdBy: user.userId,
  }).returning();

  await db.update(meetingActionItems)
    .set({ promotedToTaskId: task.taskId, updatedBy: user.userId, updatedAt: new Date() })
    .where(eq(meetingActionItems.actionItemId, actionItem.actionItemId));

  return task;
}
