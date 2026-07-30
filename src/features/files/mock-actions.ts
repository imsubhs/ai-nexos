import type { createFolder as real_createFolder, initializeFileUpload as real_initializeFileUpload, finalizeFileUpload as real_finalizeFileUpload, linkFileToEntity as real_linkFileToEntity, generateShareLink as real_generateShareLink, promoteFileVersion as real_promoteFileVersion, getFiles as real_getFiles, getFolder as real_getFolder, searchFiles as real_searchFiles, FileListFilters, updateFile as real_updateFile, deleteFile as real_deleteFile, updateFolder as real_updateFolder, deleteFolder as real_deleteFolder, getFileVersions as real_getFileVersions, getFileShares as real_getFileShares, getFileActivity as real_getFileActivity, getProjectFolders as real_getProjectFolders } from "./real-actions";

import { getDemoStore, nextDemoId, DEMO_USER_ID, DEMO_ORG_ID, logDemoActivity } from "@/lib/demo/store";
import { updateFileSchema, updateFolderSchema } from "./schemas";

export async function createFolder(...args: Parameters<typeof real_createFolder>): Promise<Awaited<ReturnType<typeof real_createFolder>>> {
  const [data] = args;
  const store = getDemoStore();
  
  const folder = {
    folderId: nextDemoId(store),
    organizationId: data.organizationId,
    projectId: data.projectId,
    parentId: data.parentId ?? null,
    name: data.name,
    color: data.color ?? null,
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    deletedBy: null,
    isArchived: false,
    version: 1,
  };

  store.fileFolders = store.fileFolders || [];
  store.fileFolders.push(folder);

  logDemoActivity(store, "files", "Folder Created", "folder", folder.folderId, `Folder created: ${folder.name}`, { folderId: folder.folderId, name: folder.name });

  return folder as any;
}

export async function updateFolder(...args: Parameters<typeof real_updateFolder>): Promise<Awaited<ReturnType<typeof real_updateFolder>>> {
  const [data] = args;
  const store = getDemoStore();
  const validData = updateFolderSchema.parse(data);

  const folder = (store.fileFolders || []).find((f: any) => f.folderId === validData.folderId);
  if (!folder) throw new Error("Folder not found.");

  if (validData.parentId !== undefined && validData.parentId !== folder.parentId) {
    if (validData.parentId === validData.folderId) {
      throw new Error("A folder cannot be moved into itself.");
    }
    // Walk up from the proposed parent; meeting the moved folder means the move
    // would create a cycle.
    let cursor = validData.parentId;
    while (cursor) {
      if (cursor === validData.folderId) {
        throw new Error("A folder cannot be moved into one of its own subfolders.");
      }
      cursor = (store.fileFolders || []).find((f: any) => f.folderId === cursor)?.parentId ?? null;
    }
  }

  if (validData.name !== undefined) folder.name = validData.name;
  if (validData.parentId !== undefined) folder.parentId = validData.parentId;
  if (validData.color !== undefined) folder.color = validData.color;
  folder.updatedAt = new Date();
  folder.updatedBy = DEMO_USER_ID;

  logDemoActivity(store, "files", validData.name !== undefined ? "Folder Renamed" : "Folder Moved", "folder", folder.folderId, `Folder updated: ${folder.name}`, { folderId: folder.folderId, name: folder.name });

  return folder as any;
}

export async function deleteFolder(...args: Parameters<typeof real_deleteFolder>): Promise<Awaited<ReturnType<typeof real_deleteFolder>>> {
  const [folderId] = args;
  const store = getDemoStore();

  const index = (store.fileFolders || []).findIndex((f: any) => f.folderId === folderId);
  if (index === -1) throw new Error("Folder not found.");

  if ((store.fileFolders || []).some((f: any) => f.parentId === folderId)) {
    throw new Error("This folder still contains subfolders. Empty it first.");
  }
  if ((store.files || []).some((f: any) => f.folderId === folderId && f.deletedAt == null)) {
    throw new Error("This folder still contains files. Move or delete them first.");
  }

  const [folder] = store.fileFolders.splice(index, 1);
  logDemoActivity(store, "files", "Folder Deleted", "folder", folderId, `Folder deleted: ${folder.name}`, { folderId, name: folder.name });

  return { success: true } as any;
}

export async function updateFile(...args: Parameters<typeof real_updateFile>): Promise<Awaited<ReturnType<typeof real_updateFile>>> {
  const [data] = args;
  const store = getDemoStore();
  const validData = updateFileSchema.parse(data);

  const file = (store.files || []).find((f: any) => f.fileId === validData.fileId && f.deletedAt == null);
  if (!file) throw new Error("File not found or access denied.");

  if (validData.folderId) {
    const target = (store.fileFolders || []).find(
      (f: any) => f.folderId === validData.folderId && f.projectId === file.projectId,
    );
    if (!target) throw new Error("Target folder not found in this project.");
  }

  const previous = { title: file.title, folderId: file.folderId };
  if (validData.title !== undefined) file.title = validData.title;
  if (validData.description !== undefined) file.description = validData.description;
  if (validData.folderId !== undefined) file.folderId = validData.folderId;
  file.updatedAt = new Date();
  file.updatedBy = DEMO_USER_ID;

  const renamed = validData.title !== undefined && validData.title !== previous.title;
  const moved = validData.folderId !== undefined && validData.folderId !== previous.folderId;

  logDemoActivity(
    store,
    "files",
    renamed ? "File Renamed" : moved ? "File Moved" : "File Updated",
    "file",
    file.fileId,
    `File updated: ${file.title}`,
    { from: previous, to: { title: file.title, folderId: file.folderId } },
  );

  return file as any;
}

export async function deleteFile(...args: Parameters<typeof real_deleteFile>): Promise<Awaited<ReturnType<typeof real_deleteFile>>> {
  const [fileId] = args;
  const store = getDemoStore();

  const file = (store.files || []).find((f: any) => f.fileId === fileId && f.deletedAt == null);
  if (!file) throw new Error("File not found or access denied.");

  file.status = "deleted";
  file.deletedAt = new Date();
  file.deletedBy = DEMO_USER_ID;
  file.updatedAt = new Date();
  file.updatedBy = DEMO_USER_ID;

  logDemoActivity(store, "files", "File Deleted", "file", fileId, `File deleted: ${file.title}`, { title: file.title });

  return { success: true } as any;
}

export async function initializeFileUpload(...args: Parameters<typeof real_initializeFileUpload>): Promise<Awaited<ReturnType<typeof real_initializeFileUpload>>> {
  const [data] = args;
  const store = getDemoStore();
  const fileId = nextDemoId(store);
  const versionId = nextDemoId(store);

  let deduplicated = false;
  if (data.clientHash) {
    deduplicated = data.clientHash === "mock-dup"; 
  }

  const file = {
    fileId,
    organizationId: data.organizationId,
    projectId: data.projectId,
    folderId: data.folderId ?? null,
    title: data.title,
    description: data.description ?? null,
    fileType: data.fileType,
    status: deduplicated ? "ready" : "uploading",
    totalSizeBytes: data.sizeBytes,
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    currentVersionId: versionId,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    deletedBy: null,
    isArchived: false,
    version: 1,
  };

  const fileVersion = {
    versionId,
    organizationId: data.organizationId,
    projectId: data.projectId,
    fileId,
    versionNumber: 1,
    storagePath: "mock-path",
    originalFilename: data.originalFilename,
    mimeType: data.mimeType,
    sizeBytes: data.sizeBytes,
    sha256Hash: deduplicated ? data.clientHash! : "pending",
    uploadedBy: DEMO_USER_ID,
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    deletedBy: null,
    isArchived: false,
    version: 1,
  };

  store.files = store.files || [];
  store.files.push(file);

  store.fileVersions = store.fileVersions || [];
  store.fileVersions.push(fileVersion);

  logDemoActivity(store, "files", "File Upload Initialized", "file", fileId, "File Upload Initialized", { versionId, deduplicated });

  if (deduplicated) {
    return { fileId, versionId, deduplicated: true, uploadUrl: null } as any;
  }

  return { fileId, versionId, deduplicated: false, uploadUrl: `https://mock.storage.com/upload/${fileId}/${versionId}` } as any;
}

export async function finalizeFileUpload(...args: Parameters<typeof real_finalizeFileUpload>): Promise<Awaited<ReturnType<typeof real_finalizeFileUpload>>> {
  const [data] = args;
  const store = getDemoStore();
  
  const file = store.files.find((f: any) => f.fileId === data.fileId);
  const version = store.fileVersions.find((v: any) => v.versionId === data.versionId);

  if (version) {
    version.sha256Hash = data.sha256Hash;
    version.updatedBy = DEMO_USER_ID;
    version.updatedAt = new Date();
  }

  if (file) {
    file.status = "queued";
    file.updatedBy = DEMO_USER_ID;
    file.updatedAt = new Date();
  }

  logDemoActivity(store, "files", "File Upload Finalized", "file", data.fileId, "File Upload Finalized", { versionId: data.versionId, deduplicatedStorage: false });

  return { success: true, deduplicatedStorage: false };
}

export async function linkFileToEntity(...args: Parameters<typeof real_linkFileToEntity>): Promise<Awaited<ReturnType<typeof real_linkFileToEntity>>> {
  const [data] = args;
  const store = getDemoStore();

  const fileRelation = {
    relationId: nextDemoId(store),
    organizationId: DEMO_ORG_ID,
    projectId: store.projects[0]?.projectId ?? nextDemoId(store),
    fileId: data.fileId,
    entityType: data.entityType,
    entityId: data.entityId,
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    createdAt: new Date(),
  };

  const file = store.files.find((f: any) => f.fileId === data.fileId);
  if (file) {
    fileRelation.organizationId = file.organizationId;
    fileRelation.projectId = file.projectId;
  }

  store.fileRelations = store.fileRelations || [];
  store.fileRelations.push(fileRelation);

  logDemoActivity(store, "files", "File Linked", "file", data.fileId, "File Linked", { entityType: data.entityType, entityId: data.entityId });

  return { success: true };
}

export async function generateShareLink(...args: Parameters<typeof real_generateShareLink>): Promise<Awaited<ReturnType<typeof real_generateShareLink>>> {
  const [data] = args;
  const store = getDemoStore();

  let expiresAt: Date | undefined;
  if (data.expiresInDays) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + data.expiresInDays);
  }

  const share = {
    shareId: nextDemoId(store),
    organizationId: DEMO_ORG_ID,
    projectId: store.projects[0]?.projectId ?? nextDemoId(store),
    versionId: data.versionId,
    token: `demo-token-${nextDemoId(store).replace(/-/g, "")}`,
    accessLevel: data.accessLevel,
    expiresAt: expiresAt ?? null,
    maxDownloads: data.maxDownloads ?? null,
    passwordHash: data.password ? "hashed_placeholder" : null,
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    deletedBy: null,
    isArchived: false,
    version: 1,
    downloadCount: 0,
  };

  const version = store.fileVersions.find((v: any) => v.versionId === data.versionId);
  if (version) {
    share.organizationId = version.organizationId;
    share.projectId = version.projectId;
  }

  store.fileShares = store.fileShares || [];
  store.fileShares.push(share);

  logDemoActivity(store, "files", "Share Link Created", "file", share.shareId, "Share Link Created", { shareId: share.shareId, accessLevel: data.accessLevel });

  return share as any;
}

export async function promoteFileVersion(...args: Parameters<typeof real_promoteFileVersion>): Promise<Awaited<ReturnType<typeof real_promoteFileVersion>>> {
  const [fileId, targetVersionId] = args;
  const store = getDemoStore();
  
  const file = store.files.find((f: any) => f.fileId === fileId);
  const targetVersion = store.fileVersions.find((v: any) => v.versionId === targetVersionId);

  const newVersionId = nextDemoId(store);
  let nextVersionNumber = 2;

  if (file && targetVersion) {
    const fileVers = store.fileVersions.filter((v: any) => v.fileId === fileId).sort((a: any, b: any) => b.versionNumber - a.versionNumber);
    if (fileVers.length > 0) {
      nextVersionNumber = fileVers[0].versionNumber + 1;
    }

    const newVersion = {
      versionId: newVersionId,
      organizationId: file.organizationId,
      projectId: file.projectId,
      fileId: fileId,
      versionNumber: nextVersionNumber,
      storagePath: targetVersion.storagePath,
      originalFilename: targetVersion.originalFilename,
      mimeType: targetVersion.mimeType,
      sizeBytes: targetVersion.sizeBytes,
      sha256Hash: targetVersion.sha256Hash,
      changeReason: `Restored from version ${targetVersion.versionNumber}`,
      uploadedBy: DEMO_USER_ID,
      createdBy: DEMO_USER_ID,
      updatedBy: DEMO_USER_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      deletedBy: null,
      isArchived: false,
      version: 1,
    };
    store.fileVersions.push(newVersion);
    
    file.currentVersionId = newVersionId;
    file.updatedBy = DEMO_USER_ID;
    file.updatedAt = new Date();
  }

  logDemoActivity(store, "files", "Version Promoted", "file", fileId, "Version Promoted", { fromVersionId: targetVersionId, newVersionId, newVersionNumber: nextVersionNumber });

  return { success: true, newVersionId: newVersionId as any };
}

/**
 * PUBLIC READ LAYER (Sprint 11B)
 */

export async function getFiles(...args: Parameters<typeof real_getFiles>): Promise<Awaited<ReturnType<typeof real_getFiles>>> {
  const [filters = {}, cursorOffset = 0, limit = 50] = args as [FileListFilters | undefined, number | undefined, number | undefined];
  const store = getDemoStore();

  return (store.files || [])
    .filter((f: any) => f.deletedAt == null)
    .filter((f: any) => !filters.projectId || f.projectId === filters.projectId)
    .filter((f: any) => filters.folderId === undefined || (f.folderId ?? null) === filters.folderId)
    .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(cursorOffset, cursorOffset + limit) as any;
}

export async function getFolder(...args: Parameters<typeof real_getFolder>): Promise<Awaited<ReturnType<typeof real_getFolder>>> {
  const [folderId, projectId] = args;
  const store = getDemoStore();

  const folder = folderId
    ? (store.fileFolders || []).find((f: any) => f.folderId === folderId && f.projectId === projectId) ?? null
    : null;

  const childFolders = (store.fileFolders || [])
    .filter((f: any) => f.projectId === projectId && (f.parentId ?? null) === (folderId ?? null))
    .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());

  const childFiles = (store.files || [])
    .filter((f: any) => f.projectId === projectId && f.deletedAt == null && (f.folderId ?? null) === (folderId ?? null))
    .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());

  return { folder, childFolders, childFiles } as any;
}

export async function getProjectFolders(...args: Parameters<typeof real_getProjectFolders>): Promise<Awaited<ReturnType<typeof real_getProjectFolders>>> {
  const [projectId] = args;
  const store = getDemoStore();

  return (store.fileFolders || [])
    .filter((f: any) => f.projectId === projectId)
    .sort((a: any, b: any) => a.name.localeCompare(b.name)) as any;
}

export async function getFileVersions(...args: Parameters<typeof real_getFileVersions>): Promise<Awaited<ReturnType<typeof real_getFileVersions>>> {
  const [fileId] = args;
  const store = getDemoStore();

  return (store.fileVersions || [])
    .filter((v: any) => v.fileId === fileId)
    .sort((a: any, b: any) => b.versionNumber - a.versionNumber) as any;
}

export async function getFileShares(...args: Parameters<typeof real_getFileShares>): Promise<Awaited<ReturnType<typeof real_getFileShares>>> {
  const [fileId] = args;
  const store = getDemoStore();

  const versionIds = new Map(
    (store.fileVersions || [])
      .filter((v: any) => v.fileId === fileId)
      .map((v: any) => [v.versionId, v.versionNumber]),
  );

  return (store.fileShares || [])
    .filter((s: any) => versionIds.has(s.versionId))
    .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((share: any) => ({
      shareId: share.shareId,
      versionId: share.versionId,
      token: share.token,
      accessLevel: share.accessLevel,
      expiresAt: share.expiresAt,
      maxDownloads: share.maxDownloads,
      downloadCount: share.downloadCount ?? 0,
      createdAt: share.createdAt,
      versionNumber: versionIds.get(share.versionId),
    })) as any;
}

export async function getFileActivity(...args: Parameters<typeof real_getFileActivity>): Promise<Awaited<ReturnType<typeof real_getFileActivity>>> {
  const [fileId, limit = 25] = args;
  const store = getDemoStore();

  return store.activityLogs
    .filter((entry: any) => entry.entityType === "file" && entry.entityId === fileId)
    .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit) as any;
}

export async function searchFiles(...args: Parameters<typeof real_searchFiles>): Promise<Awaited<ReturnType<typeof real_searchFiles>>> {
  const [searchTerm, cursorOffset = 0, limit = 50] = args;
  const store = getDemoStore();
  const needle = searchTerm.toLowerCase();

  return (store.files || [])
    .filter((f: any) => f.deletedAt == null && f.title?.toLowerCase().includes(needle))
    .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(cursorOffset, cursorOffset + limit) as any;
}
