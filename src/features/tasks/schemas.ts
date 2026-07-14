import { z } from "zod";

export const insertTaskSchema = z.object({
  projectId: z.string().uuid(),
  timelineId: z.string().uuid(),
  phaseId: z.string().uuid(),
  milestoneId: z.string().uuid(),
  parentTaskId: z.string().uuid().optional().nullable(),
  name: z.string().min(1, "Task name is required"),
  description: z.any().optional().nullable(),
  status: z.enum([
    "backlog", "todo", "ready", "in_progress", "blocked", 
    "waiting", "review", "client_review", "approved", 
    "completed", "cancelled", "archived"
  ]).default("backlog"),
  priority: z.enum(["critical", "high", "medium", "low"]).default("medium"),
  taskType: z.enum([
    "creative", "design", "video_editing", "motion_graphics", 
    "prompt_engineering", "ai_generation", "qa", "review", 
    "documentation", "meeting", "development", "research", 
    "marketing", "other"
  ]).default("other"),
  startDate: z.coerce.date().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  estimatedDurationMins: z.number().int().min(0).default(0),
  actualDurationMins: z.number().int().min(0).default(0),
  progress: z.number().int().min(0).max(100).default(0),
  isTemplate: z.boolean().default(false),
  recurrenceRule: z.string().optional().nullable(),
  isPrivate: z.boolean().default(false),
});

export const updateTaskSchema = insertTaskSchema.partial();

export const insertTaskCommentSchema = z.object({
  content: z.any(), // JSONB
});

export const insertTaskChecklistSchema = z.object({
  name: z.string().min(1),
  orderIndex: z.number().int().default(0),
});

export const insertTaskChecklistItemSchema = z.object({
  checklistId: z.string().uuid(),
  content: z.string().min(1),
  isCompleted: z.boolean().default(false),
  orderIndex: z.number().int().default(0),
});

export const insertTaskTimeEntrySchema = z.object({
  startTime: z.coerce.date(),
  endTime: z.coerce.date().optional().nullable(),
  durationMins: z.number().int().optional().nullable(),
  isManual: z.boolean().default(false),
  notes: z.string().optional().nullable(),
});
