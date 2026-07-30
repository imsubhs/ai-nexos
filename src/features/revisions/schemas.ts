import { z } from "zod";

export const insertRevisionSchema = z.object({
  projectId: z.string().uuid(),
  deliverableId: z.string().uuid(),
  taskId: z.string().uuid().optional().nullable(),
  name: z.string().min(1, "Revision name is required"),
  description: z.string().optional().nullable(),
  type: z
    .enum([
      "MINOR",
      "MAJOR",
      "CLIENT_REQUESTED",
      "INTERNAL",
      "CREATIVE",
      "TECHNICAL",
      "LEGAL",
      "EMERGENCY",
      "ROLLBACK",
      "HOTFIX",
    ])
    .default("MINOR"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  // Architectural overrides
  parentRevisionId: z.string().uuid().optional().nullable(),
  branchName: z.string().optional().nullable(),
});

export const updateRevisionStatusSchema = z.object({
  status: z.enum([
    "REQUESTED",
    "CREATED",
    "ASSIGNED",
    "WIP",
    "INTERNAL_REVIEW",
    "QA",
    "READY_FOR_APPROVAL",
    "APPROVED",
    "REJECTED",
    "MERGED",
    "ARCHIVED",
  ]),
});

export const assignRevisionSchema = z.object({
  userId: z.string().uuid(),
});

export const insertRevisionRequestSchema = z.object({
  projectId: z.string().uuid(),
  deliverableId: z.string().uuid(),
  requestDetails: z.string().min(1),
});

export const mergePreviewDataSchema = z.object({
  conflictsDetected: z.number().int().min(0),
  filesToOverwrite: z.array(z.string().uuid()),
  filesToAdd: z.array(z.string().uuid()),
  filesToRemove: z.array(z.string().uuid()),
  canMergeCleanly: z.boolean(),
});
