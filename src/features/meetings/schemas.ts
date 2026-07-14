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
  meetingProviderEnum
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
  meetingUrl: z.string().url().optional().or(z.literal('')),
  provider: z.enum(meetingProviderEnum.enumValues).optional(),
  isPrivate: z.boolean().default(false),
  isConfidential: z.boolean().default(false),
});

export const updateMeetingSchema = createMeetingSchema.partial().extend({
  status: z.enum(meetingStatusEnum.enumValues).optional(),
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
