"use server";

import { db } from "@/db";
import { files, fileVersions, fileFolders, fileRelations, fileShares } from "@/db/schema/files";
import { activityLogs } from "@/db/schema/activity-logs";
import { projects } from "@/db/schema/projects";
import { CurrentUser, requireCurrentUser } from "@/features/auth/current-user";
import { requirePermission, Action as PermissionAction, PermissionDeniedError } from "@/features/permissions";
import { storageService } from "@/lib/storage/SupabaseStorageProvider";
import { eq, and, sql, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";
import { 
  createFolderSchema, 
  initializeUploadSchema, 
  finalizeUploadSchema, 
  linkFileSchema,
  createShareLinkSchema
} from "./schemas";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * ACTIVITY LOGGING
 */
async function logFileActivity(
  eventType: string,
  fileId: string | null,
  projectId: string,
  organizationId: string,
  user: CurrentUser,
  metadata?: Record<string, unknown>,
  tx: typeof db | DbTransaction = db
) {
  await tx.insert(activityLogs).values({
    organizationId,
    projectId,
    userId: user.userId,
    module: "files",
    action: eventType,
    entityType: "file",
    entityId: fileId,
    description: `File event: ${eventType}`,
    metadata,
  });
}

/**
 * AUTHORIZATION: Permission Inheritance & Project Membership
 */
async function validateProjectAccess(projectId: string, user: CurrentUser, tx: typeof db | DbTransaction = db) {
  const project = await tx.query.projects.findFirst({
    where: and(
      eq(projects.projectId, projectId),
      eq(projects.organizationId, user.organizationId)
    ),
    with: {
      members: true
    }
  });

  if (!project) throw new Error("Project not found.");

  if (project.visibility === "private" && user.roleKey !== "super_admin" && user.roleKey !== "owner") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isMember = (project as any).members?.some((m: any) => m.userId === user.userId);
    if (!isMember) {
      throw new PermissionDeniedError("projects", "read");
    }
  }
}

async function validateFileAccess(
  fileId: string,
  action: PermissionAction,
  user: CurrentUser,
  tx: typeof db | DbTransaction = db
) {
  // 1. Global Role-Based Access Check
  requirePermission(user.permissions, "files", action);

  // 2. Fetch File
  const file = await tx.query.files.findFirst({
    where: and(
      eq(files.fileId, fileId),
      eq(files.organizationId, user.organizationId)
    )
  });

  if (!file) throw new Error("File not found or access denied.");

  // 3. Project Membership Check
  await validateProjectAccess(file.projectId, user, tx);

  return file;
}

/**
 * Validates deep folder hierarchy to prevent nesting > 10 levels
 */
async function validateFolderDepth(projectId: string, parentId: string | null | undefined): Promise<void> {
  if (!parentId) return; // Root is depth 1
  
  const result = await db.execute(sql`
    WITH RECURSIVE folder_tree AS (
      SELECT folder_id, parent_id, 1 AS depth, ARRAY[folder_id] as path
      FROM file_folders
      WHERE folder_id = ${parentId} AND project_id = ${projectId}
      
      UNION ALL
      
      SELECT f.folder_id, f.parent_id, ft.depth + 1, ft.path || f.folder_id
      FROM file_folders f
      INNER JOIN folder_tree ft ON f.folder_id = ft.parent_id
      WHERE NOT f.folder_id = ANY(ft.path)
    )
    SELECT MAX(depth) as max_depth FROM folder_tree;
  `);

  const maxDepth = Number(result[0]?.max_depth || 0);
  if (maxDepth >= 10) {
    throw new Error("Folder nesting exceeds maximum allowed depth of 10 levels.");
  }
}

export async function createFolder(data: z.infer<typeof createFolderSchema>) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "files", "create");
  
  const validData = createFolderSchema.parse(data);
  await validateProjectAccess(validData.projectId, user);
  await validateFolderDepth(validData.projectId, validData.parentId);
  
  return await db.transaction(async (tx) => {
    const [folder] = await tx.insert(fileFolders).values({
      organizationId: validData.organizationId,
      projectId: validData.projectId,
      parentId: validData.parentId,
      name: validData.name,
      color: validData.color,
      createdBy: user.userId,
      updatedBy: user.userId,
    }).returning();
    
    await logFileActivity("Folder Created", null, validData.projectId, validData.organizationId, user, { folderId: folder.folderId, name: folder.name }, tx);
    return folder;
  });
}

export async function initializeFileUpload(data: z.infer<typeof initializeUploadSchema>) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "files", "upload");
  const validData = initializeUploadSchema.parse(data);
  
  await validateProjectAccess(validData.projectId, user);
  
  // Organization quota checks
  const ORG_QUOTA_BYTES = 500 * 1024 * 1024 * 1024; // 500 GB
  const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB
  
  if (validData.sizeBytes > MAX_UPLOAD_BYTES) {
    throw new Error("File exceeds maximum upload size of 10GB.");
  }

  const quotaResult = await db.execute(sql`
    SELECT SUM(total_size_bytes) as total_used 
    FROM files 
    WHERE organization_id = ${validData.organizationId} 
      AND status != 'deleted'
  `);
  const totalUsed = Number(quotaResult[0]?.total_used || 0);
  
  if (totalUsed + validData.sizeBytes > ORG_QUOTA_BYTES) {
    throw new Error("Organization storage quota exceeded (500GB).");
  }

  const fileId = randomUUID();
  const versionId = randomUUID();
  
  // 1. Client-Side Preliminary Hash Deduplication (Safe scope: same project only)
  let deduplicated = false;
  let storagePath = "";
  
  if (validData.clientHash) {
    const existingSafeBlob = await db.query.fileVersions.findFirst({
      where: and(
        eq(fileVersions.sha256Hash, validData.clientHash),
        eq(fileVersions.projectId, validData.projectId) // Project-scoped trust
      )
    });
    
    if (existingSafeBlob) {
      storagePath = existingSafeBlob.storagePath;
      deduplicated = true;
    }
  }

  if (!deduplicated) {
    storagePath = storageService.getStoragePath(
      validData.organizationId,
      validData.projectId,
      fileId,
      versionId,
      validData.extension
    );
  }

  return await db.transaction(async (tx) => {
    // 1. Create canonical File record
    await tx.insert(files).values({
      fileId,
      organizationId: validData.organizationId,
      projectId: validData.projectId,
      folderId: validData.folderId,
      title: validData.title,
      description: validData.description,
      fileType: validData.fileType,
      status: deduplicated ? "ready" : "uploading",
      totalSizeBytes: validData.sizeBytes,
      createdBy: user.userId,
      updatedBy: user.userId,
    });
    
    // 2. Create File Version record
    await tx.insert(fileVersions).values({
      versionId,
      organizationId: validData.organizationId,
      projectId: validData.projectId,
      fileId,
      versionNumber: 1,
      storagePath,
      originalFilename: validData.originalFilename,
      mimeType: validData.mimeType,
      sizeBytes: validData.sizeBytes,
      sha256Hash: deduplicated ? validData.clientHash! : "pending",
      uploadedBy: user.userId,
      createdBy: user.userId,
      updatedBy: user.userId,
    });
    
    // 3. Set currentVersionId
    await tx.update(files)
      .set({ currentVersionId: versionId })
      .where(eq(files.fileId, fileId));
      
    await logFileActivity("File Upload Initialized", fileId, validData.projectId, validData.organizationId, user, { versionId, deduplicated }, tx);
      
    if (deduplicated) {
      return { fileId, versionId, deduplicated: true, uploadUrl: null };
    }
      
    // 4. Generate Pre-signed URL via Provider
    const uploadUrlData = await storageService.createPreSignedUploadUrl({
      organizationId: validData.organizationId,
      projectId: validData.projectId,
      fileId,
      versionId,
      extension: validData.extension,
      settings: { maxSizeBytes: MAX_UPLOAD_BYTES }
    });
    
    return {
      fileId,
      versionId,
      deduplicated: false,
      uploadUrl: uploadUrlData.uploadUrl
    };
  });
}

export async function finalizeFileUpload(data: z.infer<typeof finalizeUploadSchema>) {
  const user = await requireCurrentUser();
  const validData = finalizeUploadSchema.parse(data);
  
  return await db.transaction(async (tx) => {
    const file = await validateFileAccess(validData.fileId, "upload", user, tx);
    
    // Server-side Deduplication: 
    const existingOrgBlob = await tx.query.fileVersions.findFirst({
      where: and(
        eq(fileVersions.sha256Hash, validData.sha256Hash)
      )
    });
    
    let finalStoragePath = undefined;
    if (existingOrgBlob && existingOrgBlob.versionId !== validData.versionId) {
      finalStoragePath = existingOrgBlob.storagePath;
    }
  
    // Update hash and status
    await tx.update(fileVersions)
      .set({ 
        sha256Hash: validData.sha256Hash, 
        updatedBy: user.userId,
        ...(finalStoragePath ? { storagePath: finalStoragePath } : {})
      })
      .where(eq(fileVersions.versionId, validData.versionId));
      
    // Advance lifecycle to 'queued' for background processing
    // Transactional transition
    await tx.update(files)
      .set({ status: "queued", updatedBy: user.userId })
      .where(eq(files.fileId, validData.fileId));
      
    await logFileActivity("File Upload Finalized", validData.fileId, file.projectId, file.organizationId, user, { versionId: validData.versionId, deduplicatedStorage: !!finalStoragePath }, tx);
    
    return { success: true, deduplicatedStorage: !!finalStoragePath };
  });
}

export async function linkFileToEntity(data: z.infer<typeof linkFileSchema>) {
  const user = await requireCurrentUser();
  const validData = linkFileSchema.parse(data);
  
  return await db.transaction(async (tx) => {
    const file = await validateFileAccess(validData.fileId, "update", user, tx);
    
    await tx.insert(fileRelations).values({
      organizationId: file.organizationId,
      projectId: file.projectId,
      fileId: validData.fileId,
      entityType: validData.entityType,
      entityId: validData.entityId,
      createdBy: user.userId,
      updatedBy: user.userId,
    }).onConflictDoNothing();
    
    await logFileActivity("File Linked", validData.fileId, file.projectId, file.organizationId, user, { entityType: validData.entityType, entityId: validData.entityId }, tx);
    return { success: true };
  });
}

export async function generateShareLink(data: z.infer<typeof createShareLinkSchema>) {
  const user = await requireCurrentUser();
  const validData = createShareLinkSchema.parse(data);
  
  return await db.transaction(async (tx) => {
    const versionRecord = await tx.query.fileVersions.findFirst({
      where: eq(fileVersions.versionId, validData.versionId)
    });
    
    if (!versionRecord) throw new Error("Version not found");
    
    const file = await validateFileAccess(versionRecord.fileId, "share", user, tx);
    
    const token = randomUUID().replace(/-/g, "");
    let expiresAt: Date | undefined;
    if (validData.expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + validData.expiresInDays);
    }
    
    const [share] = await tx.insert(fileShares).values({
      organizationId: versionRecord.organizationId,
      projectId: versionRecord.projectId,
      versionId: validData.versionId,
      token,
      accessLevel: validData.accessLevel,
      expiresAt,
      maxDownloads: validData.maxDownloads,
      passwordHash: validData.password ? "hashed_placeholder" : null,
      createdBy: user.userId,
      updatedBy: user.userId,
    }).returning();
    
    await logFileActivity("Share Link Created", file.fileId, file.projectId, file.organizationId, user, { shareId: share.shareId, accessLevel: validData.accessLevel }, tx);
    return share;
  });
}

/**
 * VERSION PROMOTION (Rollback / Restore)
 */
export async function promoteFileVersion(fileId: string, targetVersionId: string) {
  const user = await requireCurrentUser();
  
  return await db.transaction(async (tx) => {
    // 1. Authorize
    const file = await validateFileAccess(fileId, "upload", user, tx);
    
    // 2. Find target version to promote
    const targetVersion = await tx.query.fileVersions.findFirst({
      where: and(
        eq(fileVersions.versionId, targetVersionId),
        eq(fileVersions.fileId, fileId)
      )
    });
    
    if (!targetVersion) throw new Error("Target version not found");
    
    // 3. Find latest version number
    const latestVersion = await tx.query.fileVersions.findFirst({
      where: eq(fileVersions.fileId, fileId),
      orderBy: [desc(fileVersions.versionNumber)]
    });
    
    const nextVersionNumber = (latestVersion?.versionNumber || 0) + 1;
    const newVersionId = randomUUID();
    
    // 4. Create new version record pointing to same storage
    await tx.insert(fileVersions).values({
      versionId: newVersionId,
      organizationId: file.organizationId,
      projectId: file.projectId,
      fileId: fileId,
      versionNumber: nextVersionNumber,
      storagePath: targetVersion.storagePath, // Re-use blob
      originalFilename: targetVersion.originalFilename,
      mimeType: targetVersion.mimeType,
      sizeBytes: targetVersion.sizeBytes,
      sha256Hash: targetVersion.sha256Hash,
      changeReason: `Restored from version ${targetVersion.versionNumber}`,
      uploadedBy: user.userId,
      createdBy: user.userId,
      updatedBy: user.userId,
    });
    
    // 5. Update File currentVersionId
    await tx.update(files)
      .set({ currentVersionId: newVersionId, updatedBy: user.userId })
      .where(eq(files.fileId, fileId));
      
    // 6. Log
    await logFileActivity("Version Promoted", fileId, file.projectId, file.organizationId, user, { 
      fromVersionId: targetVersionId, 
      newVersionId,
      newVersionNumber: nextVersionNumber
    }, tx);
    
    return { success: true, newVersionId };
  });
}
