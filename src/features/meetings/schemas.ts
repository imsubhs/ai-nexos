import { z } from "zod";
import {
  meetingTypeEnum,
  meetingStatusEnum,
  meetingOutcomeTypeEnum,
  decisionStatusEnum,
  decisionTypeEnum,
  actionItemStatusEnum,
  taskPriorityEnum,
  meetingRecordingStatusEnum,
  meetingProviderEnum,
} from "@/db/schema/enums";

export const createMeetingSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  meetingType: z.enum(meetingTypeEnum.enumValues).default("other"),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  timezone: z.string().optional(),
  location: z.string().optional(),
  meetingUrl: z.string().url().optional().or(z.literal("")),
  provider: z.enum(meetingProviderEnum.enumValues).optional(),
  isPrivate: z.boolean().default(false),
  isConfidential: z.boolean().default(false),
});

/**
 * Sprint 12B: `projectId` is omitted — moving a meeting between projects would
 * orphan its outcomes, activity and attendees, all of which carry their own
 * projectId. `notes` is accepted as plain text and persisted into the `notes`
 * jsonb column as `{ text }`, matching how tasks store their description.
 */
export const updateMeetingSchema = createMeetingSchema
  .omit({ projectId: true })
  .partial()
  .extend({
    status: z.enum(meetingStatusEnum.enumValues).optional(),
    notes: z.string().optional(),
  });

/**
 * ATTENDEES — meeting_attendees supports either an internal user or an
 * external email, which is why neither is required on its own.
 */
export const meetingAttendeeRoleValues = [
  "organizer",
  "participant",
  "optional",
] as const;
export const meetingAttendeeRsvpValues = [
  "pending",
  "accepted",
  "declined",
  "tentative",
] as const;

export const addMeetingAttendeeSchema = z
  .object({
    meetingId: z.string().uuid(),
    userId: z.string().uuid().optional(),
    externalEmail: z.string().email().optional().or(z.literal("")),
    role: z.enum(meetingAttendeeRoleValues).default("participant"),
    rsvpStatus: z.enum(meetingAttendeeRsvpValues).default("pending"),
  })
  .refine((value) => Boolean(value.userId) || Boolean(value.externalEmail), {
    message: "Select a team member or supply an external email address.",
    path: ["userId"],
  });

export const updateMeetingAttendeeSchema = z.object({
  attendeeId: z.string().uuid(),
  role: z.enum(meetingAttendeeRoleValues).optional(),
  rsvpStatus: z.enum(meetingAttendeeRsvpValues).optional(),
});

/**
 * AGENDA — meeting_agenda rows are ordered by `orderIndex` and can be ticked
 * off during the meeting (`isCompleted`).
 */
export const addAgendaItemSchema = z.object({
  meetingId: z.string().uuid(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  orderIndex: z.number().int().nonnegative().optional(),
  timeAllottedMins: z.number().int().positive().optional(),
  speakerId: z.string().uuid().optional(),
});

export const updateAgendaItemSchema = z.object({
  agendaItemId: z.string().uuid(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  orderIndex: z.number().int().nonnegative().optional(),
  timeAllottedMins: z.number().int().positive().optional(),
  isCompleted: z.boolean().optional(),
});

export const createMeetingOutcomeSchema = z.object({
  meetingId: z.string().uuid(),
  outcomeType: z.enum(meetingOutcomeTypeEnum.enumValues),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  ownerId: z.string().uuid().optional(),
});

export const createDecisionSchema = createMeetingOutcomeSchema.extend({
  outcomeType: z.literal("decision"),
  decisionType: z.enum(decisionTypeEnum.enumValues).default("other"),
  status: z.enum(decisionStatusEnum.enumValues).default("open"),
  priority: z.enum(taskPriorityEnum.enumValues).default("medium"),
  reason: z.string().optional(),
  impactDescription: z.string().optional(),
  riskLevel: z.string().optional(),
});

export const createActionItemSchema = createMeetingOutcomeSchema.extend({
  outcomeType: z.literal("action_item"),
  status: z.enum(actionItemStatusEnum.enumValues).default("open"),
  priority: z.enum(taskPriorityEnum.enumValues).default("medium"),
  dueDate: z.date().optional(),
  estimatedDurationMins: z.number().int().nonnegative().optional(),
});

export const promoteActionItemSchema = z.object({
  actionItemId: z.string().uuid(),
  projectId: z.string().uuid(),
  timelineId: z.string().uuid(),
  phaseId: z.string().uuid(),
  milestoneId: z.string().uuid(),
});
