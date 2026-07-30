import { z } from "zod";

export const insertProjectSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
  description: z.string().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  projectManager: z.string().uuid().optional().nullable(),
  creativeDirector: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  priority: z.enum(["critical", "high", "medium", "low"]).default("medium"),
  status: z
    .enum([
      "planning",
      "research",
      "brief_received",
      "in_progress",
      "internal_review",
      "client_review",
      "revision",
      "approved",
      "completed",
      "on_hold",
      "cancelled",
      "archived",
    ])
    .default("planning"),
  startDate: z.coerce.date().optional().nullable(),
  estimatedEndDate: z.coerce.date().optional().nullable(),
  actualEndDate: z.coerce.date().optional().nullable(),
  completionPercentage: z.number().min(0).max(100).default(0),
  budget: z.string().optional().nullable(), // numeric
  healthStatus: z
    .enum(["on_track", "at_risk", "delayed", "blocked", "completed"])
    .default("on_track"),
  visibility: z
    .enum(["private", "internal", "client_shared"])
    .default("internal"),
  tags: z.array(z.string()).default([]),
});

export const updateProjectSchema = insertProjectSchema.partial();

export const insertProjectMemberSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.string().min(1).default("member"),
});

export const updateProjectMemberSchema = insertProjectMemberSchema.partial();
