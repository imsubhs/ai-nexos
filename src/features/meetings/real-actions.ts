"use server";

import { db } from "@/db";
import {
  meetings,
  meetingAttendees,
  meetingAgenda,
  meetingOutcomes,
  meetingDecisions,
  meetingActionItems,
  meetingActivity
} from "@/db/schema/meetings";
import { tasks } from "@/db/schema/tasks";
import { and, eq, sql } from "drizzle-orm";
import { requireCurrentUser } from "@/features/auth/current-user";
import { requirePermission } from "@/features/permissions";
import {
  createMeetingSchema,
  createDecisionSchema,
  createActionItemSchema,
  promoteActionItemSchema,
  updateMeetingSchema,
  addMeetingAttendeeSchema,
  updateMeetingAttendeeSchema,
  addAgendaItemSchema,
  updateAgendaItemSchema
} from "./schemas";
import { canTransitionMeeting, humanizeToken } from "./constants";
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

/**
 * Sprint 12B — the meeting write surface the aggregate always supported but
 * never exposed. `updateMeetingSchema` has existed since Sprint 11; this is the
 * action behind it, plus the two lifecycle shortcuts the UI needs.
 *
 * Status changes are guarded by MEETING_STATUS_TRANSITIONS rather than accepted
 * blindly — the enum already implies the lifecycle, and a silent illegal
 * transition is the kind of thing that only shows up in a customer's audit log.
 */
async function loadMeetingForWrite(meetingId: string, organizationId: string) {
  const meeting = await db.query.meetings.findFirst({
    where: and(
      eq(meetings.meetingId, meetingId),
      eq(meetings.organizationId, organizationId)
    ),
  });
  if (!meeting) throw new Error("Meeting not found");
  return meeting;
}

export async function updateMeeting(
  meetingId: string,
  input: z.infer<typeof updateMeetingSchema>
) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "meetings", "update");

  const validatedData = updateMeetingSchema.parse(input);
  const existing = await loadMeetingForWrite(meetingId, user.organizationId);

  if (validatedData.status && !canTransitionMeeting(existing.status, validatedData.status)) {
    throw new Error(
      `A ${humanizeToken(existing.status)} meeting cannot become ${humanizeToken(validatedData.status)}.`
    );
  }

  const { notes, ...rest } = validatedData;

  const [updated] = await db
    .update(meetings)
    .set({
      ...rest,
      ...(notes !== undefined ? { notes: { text: notes } } : {}),
      updatedAt: new Date(),
      updatedBy: user.userId,
    })
    .where(eq(meetings.meetingId, meetingId))
    .returning();

  if (validatedData.status && validatedData.status !== existing.status) {
    await db.insert(meetingActivity).values({
      organizationId: user.organizationId,
      projectId: updated.projectId,
      meetingId,
      eventType: "meeting_status_changed",
      metadata: { from: existing.status, to: updated.status },
      createdBy: user.userId,
    });
  } else {
    await db.insert(meetingActivity).values({
      organizationId: user.organizationId,
      projectId: updated.projectId,
      meetingId,
      eventType: "meeting_updated",
      metadata: { fields: Object.keys(validatedData) },
      createdBy: user.userId,
    });
  }

  return updated;
}

export async function cancelMeeting(meetingId: string, reason?: string) {
  const updated = await updateMeeting(meetingId, { status: "cancelled" });
  if (reason) {
    const user = await requireCurrentUser();
    await db.insert(meetingActivity).values({
      organizationId: user.organizationId,
      projectId: updated.projectId,
      meetingId,
      eventType: "meeting_cancelled",
      metadata: { reason },
      createdBy: user.userId,
    });
  }
  return updated;
}

export async function completeMeeting(meetingId: string) {
  return updateMeeting(meetingId, { status: "completed" });
}

/**
 * ATTENDEES
 */
export async function addMeetingAttendee(input: z.infer<typeof addMeetingAttendeeSchema>) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "meetings", "update");

  const validatedData = addMeetingAttendeeSchema.parse(input);
  const meeting = await loadMeetingForWrite(validatedData.meetingId, user.organizationId);

  const [attendee] = await db
    .insert(meetingAttendees)
    .values({
      organizationId: user.organizationId,
      meetingId: validatedData.meetingId,
      userId: validatedData.userId ?? null,
      externalEmail: validatedData.externalEmail || null,
      role: validatedData.role,
      rsvpStatus: validatedData.rsvpStatus,
      createdBy: user.userId,
      updatedBy: user.userId,
    })
    .returning();

  await db.insert(meetingActivity).values({
    organizationId: user.organizationId,
    projectId: meeting.projectId,
    meetingId: validatedData.meetingId,
    eventType: "attendee_added",
    metadata: { attendeeId: attendee.attendeeId, role: attendee.role },
    createdBy: user.userId,
  });

  return attendee;
}

export async function updateMeetingAttendee(
  input: z.infer<typeof updateMeetingAttendeeSchema>
) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "meetings", "update");

  const validatedData = updateMeetingAttendeeSchema.parse(input);

  const [attendee] = await db
    .update(meetingAttendees)
    .set({
      ...(validatedData.role ? { role: validatedData.role } : {}),
      ...(validatedData.rsvpStatus ? { rsvpStatus: validatedData.rsvpStatus } : {}),
      updatedAt: new Date(),
      updatedBy: user.userId,
    })
    .where(
      and(
        eq(meetingAttendees.attendeeId, validatedData.attendeeId),
        eq(meetingAttendees.organizationId, user.organizationId)
      )
    )
    .returning();

  if (!attendee) throw new Error("Attendee not found");

  const meeting = await loadMeetingForWrite(attendee.meetingId, user.organizationId);
  await db.insert(meetingActivity).values({
    organizationId: user.organizationId,
    projectId: meeting.projectId,
    meetingId: attendee.meetingId,
    eventType: "attendee_updated",
    metadata: { attendeeId: attendee.attendeeId, rsvpStatus: attendee.rsvpStatus },
    createdBy: user.userId,
  });

  return attendee;
}

export async function removeMeetingAttendee(attendeeId: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "meetings", "update");

  const [attendee] = await db
    .delete(meetingAttendees)
    .where(
      and(
        eq(meetingAttendees.attendeeId, attendeeId),
        eq(meetingAttendees.organizationId, user.organizationId)
      )
    )
    .returning();

  if (!attendee) throw new Error("Attendee not found");

  const meeting = await loadMeetingForWrite(attendee.meetingId, user.organizationId);
  await db.insert(meetingActivity).values({
    organizationId: user.organizationId,
    projectId: meeting.projectId,
    meetingId: attendee.meetingId,
    eventType: "attendee_removed",
    metadata: { attendeeId },
    createdBy: user.userId,
  });

  return { success: true };
}

/**
 * AGENDA
 */
export async function addAgendaItem(input: z.infer<typeof addAgendaItemSchema>) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "meetings", "update");

  const validatedData = addAgendaItemSchema.parse(input);
  const meeting = await loadMeetingForWrite(validatedData.meetingId, user.organizationId);

  // Append to the end unless the caller pinned a position, so two items added
  // in a row do not both land at index 0 and render in insertion-order limbo.
  let orderIndex = validatedData.orderIndex;
  if (orderIndex === undefined) {
    const [row] = await db
      .select({ maxIndex: sql<number>`coalesce(max(${meetingAgenda.orderIndex}), -1)` })
      .from(meetingAgenda)
      .where(eq(meetingAgenda.meetingId, validatedData.meetingId));
    orderIndex = Number(row?.maxIndex ?? -1) + 1;
  }

  const [item] = await db
    .insert(meetingAgenda)
    .values({
      organizationId: user.organizationId,
      meetingId: validatedData.meetingId,
      title: validatedData.title,
      description: validatedData.description,
      orderIndex,
      timeAllottedMins: validatedData.timeAllottedMins,
      speakerId: validatedData.speakerId,
      createdBy: user.userId,
      updatedBy: user.userId,
    })
    .returning();

  await db.insert(meetingActivity).values({
    organizationId: user.organizationId,
    projectId: meeting.projectId,
    meetingId: validatedData.meetingId,
    eventType: "agenda_item_added",
    metadata: { agendaItemId: item.agendaItemId, title: item.title },
    createdBy: user.userId,
  });

  return item;
}

export async function updateAgendaItem(input: z.infer<typeof updateAgendaItemSchema>) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "meetings", "update");

  const { agendaItemId, ...changes } = updateAgendaItemSchema.parse(input);

  const [item] = await db
    .update(meetingAgenda)
    .set({ ...changes, updatedAt: new Date(), updatedBy: user.userId })
    .where(
      and(
        eq(meetingAgenda.agendaItemId, agendaItemId),
        eq(meetingAgenda.organizationId, user.organizationId)
      )
    )
    .returning();

  if (!item) throw new Error("Agenda item not found");

  const meeting = await loadMeetingForWrite(item.meetingId, user.organizationId);
  await db.insert(meetingActivity).values({
    organizationId: user.organizationId,
    projectId: meeting.projectId,
    meetingId: item.meetingId,
    eventType: "agenda_item_updated",
    metadata: { agendaItemId, fields: Object.keys(changes) },
    createdBy: user.userId,
  });

  return item;
}

export async function removeAgendaItem(agendaItemId: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "meetings", "update");

  const [item] = await db
    .delete(meetingAgenda)
    .where(
      and(
        eq(meetingAgenda.agendaItemId, agendaItemId),
        eq(meetingAgenda.organizationId, user.organizationId)
      )
    )
    .returning();

  if (!item) throw new Error("Agenda item not found");

  const meeting = await loadMeetingForWrite(item.meetingId, user.organizationId);
  await db.insert(meetingActivity).values({
    organizationId: user.organizationId,
    projectId: meeting.projectId,
    meetingId: item.meetingId,
    eventType: "agenda_item_removed",
    metadata: { agendaItemId },
    createdBy: user.userId,
  });

  return { success: true };
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
