import { z } from "zod";

export const createFolderSchema = z.object({
  organizationId: z.string().uuid(),
  projectId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(255),
  color: z.string().optional(),
});

export const initializeUploadSchema = z.object({
  organizationId: z.string().uuid(),
  projectId: z.string().uuid(),
  folderId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  fileType: z.enum(["image", "video", "audio", "document", "archive", "3d_model", "font", "code", "other"]),
  originalFilename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().positive(),
  extension: z.string().min(1),
  clientHash: z.string().min(1).optional(), // Preliminary hash for deduplication
});

export const finalizeUploadSchema = z.object({
  fileId: z.string().uuid(),
  versionId: z.string().uuid(),
  sha256Hash: z.string().min(1),
});

export const linkFileSchema = z.object({
  fileId: z.string().uuid(),
  entityType: z.enum(["task", "milestone", "project", "client", "meeting", "deliverable", "comment", "approval", "prompt", "brand_asset"]),
  entityId: z.string().uuid(),
});

export const createShareLinkSchema = z.object({
  fileId: z.string().uuid(),
  versionId: z.string().uuid(),
  accessLevel: z.enum(["preview", "download", "metadata", "comment", "version_upload", "delete"]),
  expiresInDays: z.number().positive().max(365).optional(),
  maxDownloads: z.number().positive().optional(),
  password: z.string().optional(),
});
