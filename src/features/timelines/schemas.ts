import { z } from "zod";

export const insertTimelineSchema = z.object({
  projectId: z.string().uuid(),
  status: z
    .enum([
      "planning",
      "research",
      "ready",
      "in_progress",
      "blocked",
      "review",
      "client_review",
      "revision",
      "approved",
      "completed",
      "cancelled",
      "archived",
    ])
    .default("planning"),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
});

export const updateTimelineSchema = insertTimelineSchema.partial().extend({
  timelineId: z.string().uuid(),
});

export const insertProjectPhaseSchema = z.object({
  timelineId: z.string().uuid(),
  name: z.enum([
    "planning",
    "pre_production",
    "production",
    "post_production",
    "delivery",
  ]),
  orderIndex: z.number().int(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
});

export const updateProjectPhaseSchema = insertProjectPhaseSchema
  .partial()
  .extend({
    phaseId: z.string().uuid(),
    status: z
      .enum(["not_started", "in_progress", "blocked", "completed", "cancelled"])
      .optional(),
  });

export const insertMilestoneSchema = z.object({
  timelineId: z.string().uuid(),
  phaseId: z.string().uuid(),
  name: z.string().min(1, "Milestone name is required"),
  description: z.string().optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
});

export const updateMilestoneSchema = insertMilestoneSchema.partial().extend({
  milestoneId: z.string().uuid(),
  status: z
    .enum(["not_started", "in_progress", "blocked", "completed", "cancelled"])
    .optional(),
});

export const insertTimelineDependencySchema = z.object({
  timelineId: z.string().uuid(),
  predecessorId: z.string().uuid(),
  successorId: z.string().uuid(),
  dependencyType: z.enum(["FS", "SS", "FF", "SF"]).default("FS"),
});
