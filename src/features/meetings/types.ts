import { z } from "zod";
import {
  createMeetingSchema,
  updateMeetingSchema,
  createDecisionSchema,
  createActionItemSchema,
  createMeetingOutcomeSchema,
} from "./schemas";
import { InferSelectModel } from "drizzle-orm";
import {
  meetings,
  meetingAttendees,
  meetingOutcomes,
  meetingDecisions,
  meetingActionItems,
  meetingRecordings,
  meetingTranscripts,
} from "@/db/schema/meetings";

export type Meeting = InferSelectModel<typeof meetings>;
export type MeetingAttendee = InferSelectModel<typeof meetingAttendees>;
export type MeetingOutcome = InferSelectModel<typeof meetingOutcomes>;
export type MeetingDecision = InferSelectModel<typeof meetingDecisions>;
export type MeetingActionItem = InferSelectModel<typeof meetingActionItems>;
export type MeetingRecording = InferSelectModel<typeof meetingRecordings>;
export type MeetingTranscript = InferSelectModel<typeof meetingTranscripts>;

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;
export type CreateMeetingOutcomeInput = z.infer<
  typeof createMeetingOutcomeSchema
>;
export type CreateDecisionInput = z.infer<typeof createDecisionSchema>;
export type CreateActionItemInput = z.infer<typeof createActionItemSchema>;
