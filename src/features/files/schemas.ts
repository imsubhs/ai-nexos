import { z } from "zod";

// organizationId is optional in client schemas; server action always derives tenant from session
export const createFolderSchema = z.object({
  organizationId: z.string().uuid().optional(),
  projectId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(255),
  color: z.string().optional(),
});

/**
 * Sprint 12B — rename / move / recolour a folder. `parentId: null` moves it
 * back to the project root.
 */
export const updateFolderSchema = z.object({
  folderId: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  parentId: z.string().uuid().nullable().optional(),
  color: z.string().optional(),
});

/**
 * Sprint 12B — rename / move / describe a file. `folderId: null` moves it to
 * the project root. Storage-side fields are absent by design: those belong to a
 * version, not to the canonical file record.
 */
export const updateFileSchema = z.object({
  fileId: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().nullable().optional(),
  folderId: z.string().uuid().nullable().optional(),
});

export const initializeUploadSchema = z.object({
  organizationId: z.string().uuid().optional(),
  projectId: z.string().uuid(),
  folderId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1).max(500),
  description: z.string().max(5000).optional(),
  fileType: z.enum([
    "image",
    "video",
    "audio",
    "document",
    "archive",
    "3d_model",
    "font",
    "code",
    "other",
  ]),
  originalFilename: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(127),
  sizeBytes: z.number().positive(),
  extension: z.string().trim().min(1).max(32),
  clientHash: z.string().trim().min(1).max(128).optional(), // Preliminary hash for deduplication
});

export const finalizeUploadSchema = z.object({
  fileId: z.string().uuid(),
  versionId: z.string().uuid(),
  sha256Hash: z.string().min(1),
});

export const linkFileSchema = z.object({
  fileId: z.string().uuid(),
  entityType: z.enum([
    "task",
    "milestone",
    "project",
    "client",
    "meeting",
    "deliverable",
    "comment",
    "approval",
    "prompt",
    "brand_asset",
  ]),
  entityId: z.string().uuid(),
});

export const createShareLinkSchema = z.object({
  fileId: z.string().uuid(),
  versionId: z.string().uuid(),
  accessLevel: z.enum([
    "preview",
    "download",
    "metadata",
    "comment",
    "version_upload",
    "delete",
  ]),
  expiresInDays: z.number().positive().max(365).optional(),
  maxDownloads: z.number().positive().optional(),
  password: z.string().optional(),
});
