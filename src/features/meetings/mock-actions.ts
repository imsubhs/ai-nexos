/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  createMeeting as real_createMeeting,
  createDecision as real_createDecision,
  createActionItem as real_createActionItem,
  promoteActionItemToTask as real_promoteActionItemToTask,
  updateMeeting as real_updateMeeting,
  cancelMeeting as real_cancelMeeting,
  completeMeeting as real_completeMeeting,
  addMeetingAttendee as real_addMeetingAttendee,
  updateMeetingAttendee as real_updateMeetingAttendee,
  removeMeetingAttendee as real_removeMeetingAttendee,
  addAgendaItem as real_addAgendaItem,
  updateAgendaItem as real_updateAgendaItem,
  removeAgendaItem as real_removeAgendaItem,
} from "./real-actions";
import {
  getDemoStore,
  nextDemoId,
  nextDemoCode,
  DEMO_USER_ID,
  DEMO_ORG_ID,
} from "@/lib/demo/store";
import {
  createMeetingSchema,
  createDecisionSchema,
  createActionItemSchema,
  promoteActionItemSchema,
  updateMeetingSchema,
  addMeetingAttendeeSchema,
  updateMeetingAttendeeSchema,
  addAgendaItemSchema,
  updateAgendaItemSchema,
} from "./schemas";
import { canTransitionMeeting, humanizeToken } from "./constants";

function auditFields() {
  return {
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    deletedAt: null,
    deletedBy: null,
    isArchived: false,
  };
}

function meetingCollections(store: any) {
  store.meetingOutcomes = store.meetingOutcomes || [];
  store.meetingDecisions = store.meetingDecisions || [];
  store.meetingActionItems = store.meetingActionItems || [];
  store.meetingActivity = store.meetingActivity || [];
  store.meetingAttendees = store.meetingAttendees || [];
  store.meetingAgenda = store.meetingAgenda || [];
  return store;
}

function requireMeeting(store: any, meetingId: string) {
  const meeting = store.meetings.find((m: any) => m.meetingId === meetingId);
  if (!meeting) throw new Error("Meeting not found");
  return meeting;
}

function logMeetingActivity(
  store: any,
  projectId: string,
  meetingId: string,
  eventType: string,
  metadata: Record<string, unknown>,
) {
  store.meetingActivity.push({
    activityId: nextDemoId(store),
    organizationId: DEMO_ORG_ID,
    projectId,
    meetingId,
    eventType,
    metadata,
    createdBy: DEMO_USER_ID,
    createdAt: new Date(),
  });
}

export async function createMeeting(
  ...args: Parameters<typeof real_createMeeting>
): Promise<Awaited<ReturnType<typeof real_createMeeting>>> {
  const [input] = args;
  const store = meetingCollections(getDemoStore());

  const validatedData = createMeetingSchema.parse(input);

  const newMeeting = {
    meetingId: nextDemoId(store),
    organizationId: DEMO_ORG_ID,
    projectId: validatedData.projectId,
    title: validatedData.title,
    description: validatedData.description ?? null,
    meetingType: validatedData.meetingType,
    startTime: validatedData.startTime ?? null,
    endTime: validatedData.endTime ?? null,
    timezone: validatedData.timezone ?? null,
    location: validatedData.location ?? null,
    meetingUrl: validatedData.meetingUrl ?? null,
    provider: validatedData.provider ?? null,
    isPrivate: validatedData.isPrivate,
    isConfidential: validatedData.isConfidential,
    status: "scheduled",
    ...auditFields(),
  };
  store.meetings.push(newMeeting);

  logMeetingActivity(
    store,
    validatedData.projectId,
    newMeeting.meetingId,
    "meeting_created",
    { title: newMeeting.title },
  );

  return newMeeting as any;
}

export async function updateMeeting(
  ...args: Parameters<typeof real_updateMeeting>
): Promise<Awaited<ReturnType<typeof real_updateMeeting>>> {
  const [meetingId, input] = args;
  const store = meetingCollections(getDemoStore());

  const validatedData = updateMeetingSchema.parse(input);
  const meeting = requireMeeting(store, meetingId);

  if (
    validatedData.status &&
    !canTransitionMeeting(meeting.status, validatedData.status)
  ) {
    throw new Error(
      `A ${humanizeToken(meeting.status)} meeting cannot become ${humanizeToken(validatedData.status)}.`,
    );
  }

  const previousStatus = meeting.status;
  const { notes, ...rest } = validatedData;

  Object.assign(meeting, rest, {
    ...(notes !== undefined ? { notes: { text: notes } } : {}),
    updatedAt: new Date(),
    updatedBy: DEMO_USER_ID,
  });

  if (validatedData.status && validatedData.status !== previousStatus) {
    logMeetingActivity(
      store,
      meeting.projectId,
      meetingId,
      "meeting_status_changed",
      {
        from: previousStatus,
        to: meeting.status,
      },
    );
  } else {
    logMeetingActivity(store, meeting.projectId, meetingId, "meeting_updated", {
      fields: Object.keys(validatedData),
    });
  }

  return meeting as any;
}

export async function cancelMeeting(
  ...args: Parameters<typeof real_cancelMeeting>
): Promise<Awaited<ReturnType<typeof real_cancelMeeting>>> {
  const [meetingId, reason] = args;
  const meeting = await updateMeeting(meetingId, { status: "cancelled" });
  if (reason) {
    const store = meetingCollections(getDemoStore());
    logMeetingActivity(
      store,
      (meeting as any).projectId,
      meetingId,
      "meeting_cancelled",
      { reason },
    );
  }
  return meeting as any;
}

export async function completeMeeting(
  ...args: Parameters<typeof real_completeMeeting>
): Promise<Awaited<ReturnType<typeof real_completeMeeting>>> {
  const [meetingId] = args;
  return updateMeeting(meetingId, { status: "completed" }) as any;
}

export async function addMeetingAttendee(
  ...args: Parameters<typeof real_addMeetingAttendee>
): Promise<Awaited<ReturnType<typeof real_addMeetingAttendee>>> {
  const [input] = args;
  const store = meetingCollections(getDemoStore());

  const validatedData = addMeetingAttendeeSchema.parse(input);
  const meeting = requireMeeting(store, validatedData.meetingId);

  const attendee = {
    attendeeId: nextDemoId(store),
    organizationId: DEMO_ORG_ID,
    meetingId: validatedData.meetingId,
    userId: validatedData.userId ?? null,
    externalEmail: validatedData.externalEmail || null,
    role: validatedData.role,
    rsvpStatus: validatedData.rsvpStatus,
    ...auditFields(),
  };
  store.meetingAttendees.push(attendee);

  logMeetingActivity(
    store,
    meeting.projectId,
    validatedData.meetingId,
    "attendee_added",
    {
      attendeeId: attendee.attendeeId,
      role: attendee.role,
    },
  );

  return attendee as any;
}

export async function updateMeetingAttendee(
  ...args: Parameters<typeof real_updateMeetingAttendee>
): Promise<Awaited<ReturnType<typeof real_updateMeetingAttendee>>> {
  const [input] = args;
  const store = meetingCollections(getDemoStore());

  const validatedData = updateMeetingAttendeeSchema.parse(input);
  const attendee = store.meetingAttendees.find(
    (a: any) => a.attendeeId === validatedData.attendeeId,
  );
  if (!attendee) throw new Error("Attendee not found");

  if (validatedData.role) attendee.role = validatedData.role;
  if (validatedData.rsvpStatus) attendee.rsvpStatus = validatedData.rsvpStatus;
  attendee.updatedAt = new Date();
  attendee.updatedBy = DEMO_USER_ID;

  const meeting = requireMeeting(store, attendee.meetingId);
  logMeetingActivity(
    store,
    meeting.projectId,
    attendee.meetingId,
    "attendee_updated",
    {
      attendeeId: attendee.attendeeId,
      rsvpStatus: attendee.rsvpStatus,
    },
  );

  return attendee as any;
}

export async function removeMeetingAttendee(
  ...args: Parameters<typeof real_removeMeetingAttendee>
): Promise<Awaited<ReturnType<typeof real_removeMeetingAttendee>>> {
  const [attendeeId] = args;
  const store = meetingCollections(getDemoStore());

  const index = store.meetingAttendees.findIndex(
    (a: any) => a.attendeeId === attendeeId,
  );
  if (index === -1) throw new Error("Attendee not found");

  const [attendee] = store.meetingAttendees.splice(index, 1);
  const meeting = requireMeeting(store, attendee.meetingId);
  logMeetingActivity(
    store,
    meeting.projectId,
    attendee.meetingId,
    "attendee_removed",
    { attendeeId },
  );

  return { success: true } as any;
}

export async function addAgendaItem(
  ...args: Parameters<typeof real_addAgendaItem>
): Promise<Awaited<ReturnType<typeof real_addAgendaItem>>> {
  const [input] = args;
  const store = meetingCollections(getDemoStore());

  const validatedData = addAgendaItemSchema.parse(input);
  const meeting = requireMeeting(store, validatedData.meetingId);

  const siblings = store.meetingAgenda.filter(
    (a: any) => a.meetingId === validatedData.meetingId,
  );
  const orderIndex =
    validatedData.orderIndex ??
    siblings.reduce((max: number, a: any) => Math.max(max, a.orderIndex), -1) +
      1;

  const item = {
    agendaItemId: nextDemoId(store),
    organizationId: DEMO_ORG_ID,
    meetingId: validatedData.meetingId,
    title: validatedData.title,
    description: validatedData.description ?? null,
    orderIndex,
    timeAllottedMins: validatedData.timeAllottedMins ?? null,
    speakerId: validatedData.speakerId ?? null,
    isCompleted: false,
    ...auditFields(),
  };
  store.meetingAgenda.push(item);

  logMeetingActivity(
    store,
    meeting.projectId,
    validatedData.meetingId,
    "agenda_item_added",
    {
      agendaItemId: item.agendaItemId,
      title: item.title,
    },
  );

  return item as any;
}

export async function updateAgendaItem(
  ...args: Parameters<typeof real_updateAgendaItem>
): Promise<Awaited<ReturnType<typeof real_updateAgendaItem>>> {
  const [input] = args;
  const store = meetingCollections(getDemoStore());

  const { agendaItemId, ...changes } = updateAgendaItemSchema.parse(input);
  const item = store.meetingAgenda.find(
    (a: any) => a.agendaItemId === agendaItemId,
  );
  if (!item) throw new Error("Agenda item not found");

  Object.assign(item, changes, {
    updatedAt: new Date(),
    updatedBy: DEMO_USER_ID,
  });

  const meeting = requireMeeting(store, item.meetingId);
  logMeetingActivity(
    store,
    meeting.projectId,
    item.meetingId,
    "agenda_item_updated",
    {
      agendaItemId,
      fields: Object.keys(changes),
    },
  );

  return item as any;
}

export async function removeAgendaItem(
  ...args: Parameters<typeof real_removeAgendaItem>
): Promise<Awaited<ReturnType<typeof real_removeAgendaItem>>> {
  const [agendaItemId] = args;
  const store = meetingCollections(getDemoStore());

  const index = store.meetingAgenda.findIndex(
    (a: any) => a.agendaItemId === agendaItemId,
  );
  if (index === -1) throw new Error("Agenda item not found");

  const [item] = store.meetingAgenda.splice(index, 1);
  const meeting = requireMeeting(store, item.meetingId);
  logMeetingActivity(
    store,
    meeting.projectId,
    item.meetingId,
    "agenda_item_removed",
    { agendaItemId },
  );

  return { success: true } as any;
}

export async function createDecision(
  ...args: Parameters<typeof real_createDecision>
): Promise<Awaited<ReturnType<typeof real_createDecision>>> {
  const [input] = args;
  const store = meetingCollections(getDemoStore());

  const validatedData = createDecisionSchema.parse(input);

  const meeting = store.meetings.find(
    (m: any) => m.meetingId === validatedData.meetingId,
  );
  if (!meeting) throw new Error("Meeting not found");

  const outcome = {
    outcomeId: nextDemoId(store),
    organizationId: DEMO_ORG_ID,
    projectId: meeting.projectId,
    meetingId: validatedData.meetingId,
    outcomeType: "decision",
    title: validatedData.title,
    description: validatedData.description ?? null,
    ownerId: validatedData.ownerId ?? null,
    raisedById: DEMO_USER_ID,
    ...auditFields(),
  };
  store.meetingOutcomes.push(outcome);

  const decision = {
    decisionId: nextDemoId(store),
    organizationId: DEMO_ORG_ID,
    outcomeId: outcome.outcomeId,
    decisionType: validatedData.decisionType,
    status: validatedData.status,
    priority: validatedData.priority,
    reason: validatedData.reason ?? null,
    impactDescription: validatedData.impactDescription ?? null,
    riskLevel: validatedData.riskLevel ?? null,
    ...auditFields(),
  };
  store.meetingDecisions.push(decision);

  return { outcome, decision } as any;
}

export async function createActionItem(
  ...args: Parameters<typeof real_createActionItem>
): Promise<Awaited<ReturnType<typeof real_createActionItem>>> {
  const [input] = args;
  const store = meetingCollections(getDemoStore());

  const validatedData = createActionItemSchema.parse(input);

  const meeting = store.meetings.find(
    (m: any) => m.meetingId === validatedData.meetingId,
  );
  if (!meeting) throw new Error("Meeting not found");

  const outcome = {
    outcomeId: nextDemoId(store),
    organizationId: DEMO_ORG_ID,
    projectId: meeting.projectId,
    meetingId: validatedData.meetingId,
    outcomeType: "action_item",
    title: validatedData.title,
    description: validatedData.description ?? null,
    ownerId: validatedData.ownerId ?? null,
    raisedById: DEMO_USER_ID,
    ...auditFields(),
  };
  store.meetingOutcomes.push(outcome);

  const actionItem = {
    actionItemId: nextDemoId(store),
    organizationId: DEMO_ORG_ID,
    outcomeId: outcome.outcomeId,
    status: validatedData.status,
    priority: validatedData.priority,
    dueDate: validatedData.dueDate ?? null,
    estimatedDurationMins: validatedData.estimatedDurationMins ?? null,
    promotedToTaskId: null as string | null,
    ...auditFields(),
  };
  store.meetingActionItems.push(actionItem);

  return { outcome, actionItem } as any;
}

export async function promoteActionItemToTask(
  ...args: Parameters<typeof real_promoteActionItemToTask>
): Promise<Awaited<ReturnType<typeof real_promoteActionItemToTask>>> {
  const [input] = args;
  const store = meetingCollections(getDemoStore());

  const validatedData = promoteActionItemSchema.parse(input);

  const actionItem = store.meetingActionItems.find(
    (a: any) => a.actionItemId === validatedData.actionItemId,
  );
  if (!actionItem) throw new Error("Action item not found");

  const outcome = store.meetingOutcomes.find(
    (o: any) => o.outcomeId === actionItem.outcomeId,
  );
  if (!outcome) throw new Error("Action item not found");

  if (actionItem.promotedToTaskId)
    throw new Error("Action item already promoted");

  const org = store.organizations.find(
    (o: { organizationId: string }) => o.organizationId === DEMO_ORG_ID,
  );
  const codePrefix = org?.codePrefix ?? "NEX";
  const taskCode = nextDemoCode(
    store,
    `${codePrefix}-T-${new Date().getFullYear()}`,
  );

  const task = {
    taskId: nextDemoId(store),
    taskCode,
    organizationId: DEMO_ORG_ID,
    projectId: validatedData.projectId,
    timelineId: validatedData.timelineId,
    phaseId: validatedData.phaseId,
    milestoneId: validatedData.milestoneId,
    name: outcome.title,
    description: { text: outcome.description },
    status: "todo",
    priority: actionItem.priority,
    taskType: "other",
    dueDate: actionItem.dueDate,
    estimatedDurationMins: actionItem.estimatedDurationMins,
    isPrivate: false,
    actualDurationMins: 0,
    assignees: [],
    ...auditFields(),
  };
  store.tasks.push(task);

  actionItem.promotedToTaskId = task.taskId;
  actionItem.updatedBy = DEMO_USER_ID;
  actionItem.updatedAt = new Date();

  return task as any;
}
