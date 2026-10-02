import { db } from "@/db";
import {
  files,
  fileVersions,
  fileFolders,
  fileRelations,
  fileShares,
} from "@/db/schema/files";
import { activityLogs } from "@/db/schema/activity-logs";
import { projects } from "@/db/schema/projects";
import { CurrentUser, requireCurrentUser } from "@/features/auth/current-user";
import {
  requirePermission,
  Action as PermissionAction,
  PermissionDeniedError,
} from "@/features/permissions";
import { storageService } from "@/lib/storage/SupabaseStorageProvider";
import { RATE_LIMITS, consumeRateLimit, rateLimitHeaders } from "@/lib/security/rate-limit";
import { ApiError } from "@/lib/security/errors";
import { eq, and, sql, desc, ilike, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";
import {
  createFolderSchema,
  initializeUploadSchema,
  finalizeUploadSchema,
  linkFileSchema,
  createShareLinkSchema,
  updateFileSchema,
  updateFolderSchema,
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
  tx: typeof db | DbTransaction = db,
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
async function validateProjectAccess(
  projectId: string,
  user: CurrentUser,
  tx: typeof db | DbTransaction = db,
) {
  const project = await tx.query.projects.findFirst({
    where: and(
      eq(projects.projectId, projectId),
      eq(projects.organizationId, user.organizationId),
    ),
    with: {
      members: true,
    },
  });

  if (!project) throw new Error("Project not found.");

  if (
    project.visibility === "private" &&
    user.roleKey !== "super_admin" &&
    user.roleKey !== "owner"
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isMember = (project as any).members?.some(
      (m: any) => m.userId === user.userId,
    );
    if (!isMember) {
      throw new PermissionDeniedError("projects", "read");
    }
  }
}

async function validateFileAccess(
  fileId: string,
  action: PermissionAction,
  user: CurrentUser,
  tx: typeof db | DbTransaction = db,
) {
  // 1. Global Role-Based Access Check
  requirePermission(user.permissions, "files", action);

  // 2. Fetch File
  const file = await tx.query.files.findFirst({
    where: and(
      eq(files.fileId, fileId),
      eq(files.organizationId, user.organizationId),
    ),
  });

  if (!file) throw new Error("File not found or access denied.");

  // 3. Project Membership Check
  await validateProjectAccess(file.projectId, user, tx);

  return file;
}

/**
 * Validates deep folder hierarchy to prevent nesting > 10 levels
 */
async function validateFolderDepth(
  projectId: string,
  parentId: string | null | undefined,
): Promise<void> {
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
    throw new Error(
      "Folder nesting exceeds maximum allowed depth of 10 levels.",
    );
  }
}

export async function createFolder(data: z.infer<typeof createFolderSchema>) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "files", "create");

  const validData = createFolderSchema.parse(data);
  await validateProjectAccess(validData.projectId, user);
  await validateFolderDepth(validData.projectId, validData.parentId);

  return await db.transaction(async (tx) => {
    const [folder] = await tx
      .insert(fileFolders)
      .values({
        organizationId: user.organizationId,
        projectId: validData.projectId,
        parentId: validData.parentId,
        name: validData.name,
        color: validData.color,
        createdBy: user.userId,
        updatedBy: user.userId,
      })
      .returning();

    await logFileActivity(
      "Folder Created",
      null,
      validData.projectId,
      user.organizationId,
      user,
      { folderId: folder.folderId, name: folder.name },
      tx,
    );
    return folder;
  });
}

/**
 * Sprint 12B — folder rename / move / recolour.
 *
 * Moving a folder re-runs the same depth check `createFolder` does, so a move
 * cannot push a subtree past the ten-level limit. Re-parenting a folder into
 * its own descendant is refused outright — the recursive depth query would not
 * terminate on the resulting cycle.
 */
export async function updateFolder(data: z.infer<typeof updateFolderSchema>) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "files", "update");

  const validData = updateFolderSchema.parse(data);

  const folder = await db.query.fileFolders.findFirst({
    where: and(
      eq(fileFolders.folderId, validData.folderId),
      eq(fileFolders.organizationId, user.organizationId),
    ),
  });
  if (!folder) throw new Error("Folder not found.");

  await validateProjectAccess(folder.projectId, user);

  if (
    validData.parentId !== undefined &&
    validData.parentId !== folder.parentId
  ) {
    if (validData.parentId === validData.folderId) {
      throw new Error("A folder cannot be moved into itself.");
    }
    if (validData.parentId) {
      const descendants = await db.execute(sql`
        WITH RECURSIVE subtree AS (
          SELECT folder_id FROM file_folders WHERE folder_id = ${validData.folderId}
          UNION ALL
          SELECT f.folder_id FROM file_folders f
          INNER JOIN subtree s ON f.parent_id = s.folder_id
        )
        SELECT 1 FROM subtree WHERE folder_id = ${validData.parentId};
      `);
      if (descendants.length > 0) {
        throw new Error(
          "A folder cannot be moved into one of its own subfolders.",
        );
      }
      await validateFolderDepth(folder.projectId, validData.parentId);
    }
  }

  return await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(fileFolders)
      .set({
        ...(validData.name !== undefined ? { name: validData.name } : {}),
        ...(validData.parentId !== undefined
          ? { parentId: validData.parentId }
          : {}),
        ...(validData.color !== undefined ? { color: validData.color } : {}),
        updatedAt: new Date(),
        updatedBy: user.userId,
      })
      .where(eq(fileFolders.folderId, validData.folderId))
      .returning();

    await logFileActivity(
      validData.name !== undefined ? "Folder Renamed" : "Folder Moved",
      null,
      folder.projectId,
      folder.organizationId,
      user,
      { folderId: validData.folderId, name: updated.name },
      tx,
    );

    return updated;
  });
}

/**
 * Sprint 12B — folder delete. Refused while the folder still holds anything:
 * `files.folderId` is ON DELETE SET NULL, so a cascade here would silently
 * scatter live assets into the project root.
 */
export async function deleteFolder(folderId: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "files", "delete");

  const folder = await db.query.fileFolders.findFirst({
    where: and(
      eq(fileFolders.folderId, folderId),
      eq(fileFolders.organizationId, user.organizationId),
    ),
  });
  if (!folder) throw new Error("Folder not found.");

  await validateProjectAccess(folder.projectId, user);

  const childFolders = await db.query.fileFolders.findMany({
    where: eq(fileFolders.parentId, folderId),
    limit: 1,
  });
  if (childFolders.length > 0) {
    throw new Error("This folder still contains subfolders. Empty it first.");
  }

  const childFiles = await db.query.files.findMany({
    where: and(eq(files.folderId, folderId), isNull(files.deletedAt)),
    limit: 1,
  });
  if (childFiles.length > 0) {
    throw new Error(
      "This folder still contains files. Move or delete them first.",
    );
  }

  return await db.transaction(async (tx) => {
    await tx.delete(fileFolders).where(eq(fileFolders.folderId, folderId));
    await logFileActivity(
      "Folder Deleted",
      null,
      folder.projectId,
      folder.organizationId,
      user,
      { folderId, name: folder.name },
      tx,
    );
    return { success: true };
  });
}

/**
 * Sprint 12B — file rename / move / description edit.
 */
export async function updateFile(data: z.infer<typeof updateFileSchema>) {
  const user = await requireCurrentUser();
  const validData = updateFileSchema.parse(data);

  return await db.transaction(async (tx) => {
    const file = await validateFileAccess(validData.fileId, "update", user, tx);

    // A file may only move within its own project — folders are project-scoped.
    if (validData.folderId) {
      const target = await tx.query.fileFolders.findFirst({
        where: and(
          eq(fileFolders.folderId, validData.folderId),
          eq(fileFolders.projectId, file.projectId),
        ),
      });
      if (!target) throw new Error("Target folder not found in this project.");
    }

    const [updated] = await tx
      .update(files)
      .set({
        ...(validData.title !== undefined ? { title: validData.title } : {}),
        ...(validData.description !== undefined
          ? { description: validData.description }
          : {}),
        ...(validData.folderId !== undefined
          ? { folderId: validData.folderId }
          : {}),
        updatedAt: new Date(),
        updatedBy: user.userId,
      })
      .where(eq(files.fileId, validData.fileId))
      .returning();

    const renamed =
      validData.title !== undefined && validData.title !== file.title;
    const moved =
      validData.folderId !== undefined && validData.folderId !== file.folderId;

    await logFileActivity(
      renamed ? "File Renamed" : moved ? "File Moved" : "File Updated",
      validData.fileId,
      file.projectId,
      file.organizationId,
      user,
      {
        from: { title: file.title, folderId: file.folderId },
        to: { title: updated.title, folderId: updated.folderId },
      },
      tx,
    );

    return updated;
  });
}

/**
 * Sprint 12B — file delete. Soft: `deletedAt` plus the terminal `deleted`
 * lifecycle status, which is what every read already filters on. The blob and
 * its versions are untouched, so a restore path remains possible.
 */
export async function deleteFile(fileId: string) {
  const user = await requireCurrentUser();

  return await db.transaction(async (tx) => {
    const file = await validateFileAccess(fileId, "delete", user, tx);

    await tx
      .update(files)
      .set({
        status: "deleted",
        deletedAt: new Date(),
        deletedBy: user.userId,
        updatedAt: new Date(),
        updatedBy: user.userId,
      })
      .where(eq(files.fileId, fileId));

    await logFileActivity(
      "File Deleted",
      fileId,
      file.projectId,
      file.organizationId,
      user,
      { title: file.title },
      tx,
    );

    return { success: true };
  });
}

export async function initializeFileUpload(
  data: z.infer<typeof initializeUploadSchema>,
) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "files", "upload");

  const identifier = `${user.organizationId}:${user.userId}`;
  const decision = await consumeRateLimit(RATE_LIMITS.resourceMutation, identifier);
  if (!decision.allowed) {
    throw new ApiError(
      "rate_limited",
      `Too many upload initialization requests. Please wait ${decision.retryAfterSeconds}s before starting another upload.`,
      { headers: rateLimitHeaders(decision) },
    );
  }

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
    WHERE organization_id = ${user.organizationId}
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
        eq(fileVersions.projectId, validData.projectId), // Project-scoped trust
      ),
    });

    if (existingSafeBlob) {
      storagePath = existingSafeBlob.storagePath;
      deduplicated = true;
    }
  }

  if (!deduplicated) {
    storagePath = storageService.getStoragePath(
      user.organizationId,
      validData.projectId,
      fileId,
      versionId,
      validData.extension,
    );
  }

  return await db.transaction(async (tx) => {
    // 1. Create canonical File record
    await tx.insert(files).values({
      fileId,
      organizationId: user.organizationId,
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
      organizationId: user.organizationId,
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
    await tx
      .update(files)
      .set({ currentVersionId: versionId })
      .where(eq(files.fileId, fileId));

    await logFileActivity(
      "File Upload Initialized",
      fileId,
      validData.projectId,
      user.organizationId,
      user,
      { versionId, deduplicated },
      tx,
    );

    if (deduplicated) {
      return { fileId, versionId, deduplicated: true, uploadUrl: null };
    }

    // 4. Generate Pre-signed URL via Provider
    const uploadUrlData = await storageService.createPreSignedUploadUrl({
      organizationId: user.organizationId,
      projectId: validData.projectId,
      fileId,
      versionId,
      extension: validData.extension,
      settings: { maxSizeBytes: MAX_UPLOAD_BYTES },
    });

    return {
      fileId,
      versionId,
      deduplicated: false,
      uploadUrl: uploadUrlData.uploadUrl,
    };
  });
}

export async function finalizeFileUpload(
  data: z.infer<typeof finalizeUploadSchema>,
) {
  const user = await requireCurrentUser();
  const validData = finalizeUploadSchema.parse(data);

  return await db.transaction(async (tx) => {
    const file = await validateFileAccess(validData.fileId, "upload", user, tx);

    // Server-side deduplication, scoped to the uploader's organisation.
    //
    // This match was previously on sha256Hash alone. Content hashes are
    // global, so the first tenant to upload a given file became the owner of
    // its storage path, and every later upload of the same bytes — by any
    // other organisation — was silently repointed at that object. Two
    // consequences, both reportable:
    //
    //   · Tenant B's file record referenced an object living under tenant A's
    //     storage prefix, so A's retention, deletion or bucket policy silently
    //     governed B's data.
    //   · It is an existence oracle. Upload a suspected document, observe
    //     `deduplicatedStorage: true`, and you have confirmed that another
    //     organisation on this platform holds that exact file — a
    //     confidentiality breach that needs no read access at all.
    //
    // The organisation filter closes both. Storage is deduplicated within a
    // tenant, which is where the saving is real and the isolation is intact.
    // The narrower project scope used by initializeFileUpload is not required
    // here: `validateFileAccess` has already established that this user may
    // write to this file, and an organisation-wide blob never crosses the
    // boundary the checklist calls R-9.
    const existingOrgBlob = await tx.query.fileVersions.findFirst({
      where: and(
        eq(fileVersions.sha256Hash, validData.sha256Hash),
        eq(fileVersions.organizationId, file.organizationId),
      ),
    });

    let finalStoragePath = undefined;
    if (existingOrgBlob && existingOrgBlob.versionId !== validData.versionId) {
      finalStoragePath = existingOrgBlob.storagePath;
    }

    // Update hash and status
    await tx
      .update(fileVersions)
      .set({
        sha256Hash: validData.sha256Hash,
        updatedBy: user.userId,
        ...(finalStoragePath ? { storagePath: finalStoragePath } : {}),
      })
      .where(eq(fileVersions.versionId, validData.versionId));

    // Advance lifecycle to 'queued' for background processing
    // Transactional transition
    await tx
      .update(files)
      .set({ status: "queued", updatedBy: user.userId })
      .where(eq(files.fileId, validData.fileId));

    await logFileActivity(
      "File Upload Finalized",
      validData.fileId,
      file.projectId,
      file.organizationId,
      user,
      {
        versionId: validData.versionId,
        deduplicatedStorage: !!finalStoragePath,
      },
      tx,
    );

    return { success: true, deduplicatedStorage: !!finalStoragePath };
  });
}

export async function linkFileToEntity(data: z.infer<typeof linkFileSchema>) {
  const user = await requireCurrentUser();
  const validData = linkFileSchema.parse(data);

  return await db.transaction(async (tx) => {
    const file = await validateFileAccess(validData.fileId, "update", user, tx);

    await tx
      .insert(fileRelations)
      .values({
        organizationId: file.organizationId,
        projectId: file.projectId,
        fileId: validData.fileId,
        entityType: validData.entityType,
        entityId: validData.entityId,
        createdBy: user.userId,
        updatedBy: user.userId,
      })
      .onConflictDoNothing();

    await logFileActivity(
      "File Linked",
      validData.fileId,
      file.projectId,
      file.organizationId,
      user,
      { entityType: validData.entityType, entityId: validData.entityId },
      tx,
    );
    return { success: true };
  });
}

export async function generateShareLink(
  data: z.infer<typeof createShareLinkSchema>,
) {
  const user = await requireCurrentUser();
  const validData = createShareLinkSchema.parse(data);

  return await db.transaction(async (tx) => {
    const versionRecord = await tx.query.fileVersions.findFirst({
      where: eq(fileVersions.versionId, validData.versionId),
    });

    if (!versionRecord) throw new Error("Version not found");

    const file = await validateFileAccess(
      versionRecord.fileId,
      "share",
      user,
      tx,
    );

    const token = randomUUID().replace(/-/g, "");
    let expiresAt: Date | undefined;
    if (validData.expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + validData.expiresInDays);
    }

    const [share] = await tx
      .insert(fileShares)
      .values({
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
      })
      .returning();

    await logFileActivity(
      "Share Link Created",
      file.fileId,
      file.projectId,
      file.organizationId,
      user,
      { shareId: share.shareId, accessLevel: validData.accessLevel },
      tx,
    );
    return share;
  });
}

/**
 * VERSION PROMOTION (Rollback / Restore)
 */
export async function promoteFileVersion(
  fileId: string,
  targetVersionId: string,
) {
  const user = await requireCurrentUser();

  return await db.transaction(async (tx) => {
    // 1. Authorize
    const file = await validateFileAccess(fileId, "upload", user, tx);

    // 2. Find target version to promote
    const targetVersion = await tx.query.fileVersions.findFirst({
      where: and(
        eq(fileVersions.versionId, targetVersionId),
        eq(fileVersions.fileId, fileId),
      ),
    });

    if (!targetVersion) throw new Error("Target version not found");

    // 3. Find latest version number
    const latestVersion = await tx.query.fileVersions.findFirst({
      where: eq(fileVersions.fileId, fileId),
      orderBy: [desc(fileVersions.versionNumber)],
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
    await tx
      .update(files)
      .set({ currentVersionId: newVersionId, updatedBy: user.userId })
      .where(eq(files.fileId, fileId));

    // 6. Log
    await logFileActivity(
      "Version Promoted",
      fileId,
      file.projectId,
      file.organizationId,
      user,
      {
        fromVersionId: targetVersionId,
        newVersionId,
        newVersionNumber: nextVersionNumber,
      },
      tx,
    );

    return { success: true, newVersionId };
  });
}

/**
 * PUBLIC READ LAYER (Sprint 11B)
 */

export type FileListFilters = {
  projectId?: string;
  folderId?: string | null;
};

/**
 * Global, cross-project list of files for the enterprise workspace.
 */
export async function getFiles(
  filters: FileListFilters = {},
  cursorOffset: number = 0,
  limit: number = 50,
) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "files", "read");

  return db.query.files.findMany({
    where: and(
      eq(files.organizationId, user.organizationId),
      isNull(files.deletedAt),
      filters.projectId ? eq(files.projectId, filters.projectId) : undefined,
      filters.folderId !== undefined
        ? filters.folderId === null
          ? isNull(files.folderId)
          : eq(files.folderId, filters.folderId)
        : undefined,
    ),
    offset: cursorOffset,
    limit,
    orderBy: [desc(files.createdAt)],
  });
}

/**
 * A folder plus its immediate child folders and files (one level of the hierarchy).
 */
export async function getFolder(folderId: string | null, projectId: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "files", "read");

  await validateProjectAccess(projectId, user);

  const folder = folderId
    ? await db.query.fileFolders.findFirst({
        where: and(
          eq(fileFolders.folderId, folderId),
          eq(fileFolders.organizationId, user.organizationId),
          eq(fileFolders.projectId, projectId),
        ),
      })
    : null;

  const childFolders = await db.query.fileFolders.findMany({
    where: and(
      eq(fileFolders.organizationId, user.organizationId),
      eq(fileFolders.projectId, projectId),
      folderId
        ? eq(fileFolders.parentId, folderId)
        : isNull(fileFolders.parentId),
    ),
    orderBy: [desc(fileFolders.createdAt)],
  });

  const childFiles = await db.query.files.findMany({
    where: and(
      eq(files.organizationId, user.organizationId),
      eq(files.projectId, projectId),
      isNull(files.deletedAt),
      folderId ? eq(files.folderId, folderId) : isNull(files.folderId),
    ),
    orderBy: [desc(files.createdAt)],
  });

  return { folder, childFolders, childFiles };
}

/**
 * Sprint 12B — every folder in a project, flat.
 *
 * Move needs a destination list, and `getFolder` deliberately returns one level
 * at a time. Folder trees are small (max depth 10, enforced above), so a flat
 * read is the honest shape rather than N level-by-level calls.
 */
export async function getProjectFolders(projectId: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "files", "read");
  await validateProjectAccess(projectId, user);

  return db.query.fileFolders.findMany({
    where: and(
      eq(fileFolders.organizationId, user.organizationId),
      eq(fileFolders.projectId, projectId),
    ),
    orderBy: [fileFolders.name],
  });
}

/**
 * Sprint 12B — version history for one file.
 *
 * `promoteFileVersion` has existed since Sprint 11 but there was no read that
 * listed versions, so "restore an earlier version" was unreachable from the UI
 * even though the write was fully implemented.
 */
export async function getFileVersions(fileId: string) {
  const user = await requireCurrentUser();
  await validateFileAccess(fileId, "read", user);

  return db.query.fileVersions.findMany({
    where: eq(fileVersions.fileId, fileId),
    orderBy: [desc(fileVersions.versionNumber)],
  });
}

/** Sprint 12B — share links issued against any version of one file. */
export async function getFileShares(fileId: string) {
  const user = await requireCurrentUser();
  await validateFileAccess(fileId, "read", user);

  return db
    .select({
      shareId: fileShares.shareId,
      versionId: fileShares.versionId,
      token: fileShares.token,
      accessLevel: fileShares.accessLevel,
      expiresAt: fileShares.expiresAt,
      maxDownloads: fileShares.maxDownloads,
      downloadCount: fileShares.downloadCount,
      createdAt: fileShares.createdAt,
      versionNumber: fileVersions.versionNumber,
    })
    .from(fileShares)
    .innerJoin(fileVersions, eq(fileShares.versionId, fileVersions.versionId))
    .where(eq(fileVersions.fileId, fileId))
    .orderBy(desc(fileShares.createdAt));
}

/** Sprint 12B — the audit trail every file write above already appends to. */
export async function getFileActivity(fileId: string, limit: number = 25) {
  const user = await requireCurrentUser();
  await validateFileAccess(fileId, "read", user);

  return db.query.activityLogs.findMany({
    where: and(
      eq(activityLogs.entityType, "file"),
      eq(activityLogs.entityId, fileId),
      eq(activityLogs.organizationId, user.organizationId),
    ),
    orderBy: [desc(activityLogs.createdAt)],
    limit,
  });
}

/**
 * Title search across all files in the organization (global fetcher).
 */
export async function searchFiles(
  searchTerm: string,
  cursorOffset: number = 0,
  limit: number = 50,
) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "files", "read");

  return db.query.files.findMany({
    where: and(
      eq(files.organizationId, user.organizationId),
      isNull(files.deletedAt),
      ilike(files.title, `%${searchTerm}%`),
    ),
    offset: cursorOffset,
    limit,
    orderBy: [desc(files.createdAt)],
  });
}
