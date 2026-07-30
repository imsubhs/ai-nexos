"use server";

import * as real from "./real-actions";
import * as mock from "./mock-actions";

export async function createFolder(
  ...args: Parameters<typeof real.createFolder>
): Promise<Awaited<ReturnType<typeof real.createFolder>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).createFolder(...args);
  return (real as any).createFolder(...args);
}

export async function updateFolder(
  ...args: Parameters<typeof real.updateFolder>
): Promise<Awaited<ReturnType<typeof real.updateFolder>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).updateFolder(...args);
  return (real as any).updateFolder(...args);
}

export async function deleteFolder(
  ...args: Parameters<typeof real.deleteFolder>
): Promise<Awaited<ReturnType<typeof real.deleteFolder>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).deleteFolder(...args);
  return (real as any).deleteFolder(...args);
}

export async function updateFile(
  ...args: Parameters<typeof real.updateFile>
): Promise<Awaited<ReturnType<typeof real.updateFile>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).updateFile(...args);
  return (real as any).updateFile(...args);
}

export async function deleteFile(
  ...args: Parameters<typeof real.deleteFile>
): Promise<Awaited<ReturnType<typeof real.deleteFile>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).deleteFile(...args);
  return (real as any).deleteFile(...args);
}

export async function getProjectFolders(
  ...args: Parameters<typeof real.getProjectFolders>
): Promise<Awaited<ReturnType<typeof real.getProjectFolders>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).getProjectFolders(...args);
  return (real as any).getProjectFolders(...args);
}

export async function getFileVersions(
  ...args: Parameters<typeof real.getFileVersions>
): Promise<Awaited<ReturnType<typeof real.getFileVersions>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).getFileVersions(...args);
  return (real as any).getFileVersions(...args);
}

export async function getFileShares(
  ...args: Parameters<typeof real.getFileShares>
): Promise<Awaited<ReturnType<typeof real.getFileShares>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).getFileShares(...args);
  return (real as any).getFileShares(...args);
}

export async function getFileActivity(
  ...args: Parameters<typeof real.getFileActivity>
): Promise<Awaited<ReturnType<typeof real.getFileActivity>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).getFileActivity(...args);
  return (real as any).getFileActivity(...args);
}

export async function initializeFileUpload(
  ...args: Parameters<typeof real.initializeFileUpload>
): Promise<Awaited<ReturnType<typeof real.initializeFileUpload>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).initializeFileUpload(...args);
  return (real as any).initializeFileUpload(...args);
}

export async function finalizeFileUpload(
  ...args: Parameters<typeof real.finalizeFileUpload>
): Promise<Awaited<ReturnType<typeof real.finalizeFileUpload>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).finalizeFileUpload(...args);
  return (real as any).finalizeFileUpload(...args);
}

export async function linkFileToEntity(
  ...args: Parameters<typeof real.linkFileToEntity>
): Promise<Awaited<ReturnType<typeof real.linkFileToEntity>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).linkFileToEntity(...args);
  return (real as any).linkFileToEntity(...args);
}

export async function generateShareLink(
  ...args: Parameters<typeof real.generateShareLink>
): Promise<Awaited<ReturnType<typeof real.generateShareLink>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).generateShareLink(...args);
  return (real as any).generateShareLink(...args);
}

export async function promoteFileVersion(
  ...args: Parameters<typeof real.promoteFileVersion>
): Promise<Awaited<ReturnType<typeof real.promoteFileVersion>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).promoteFileVersion(...args);
  return (real as any).promoteFileVersion(...args);
}

export async function getFiles(
  ...args: Parameters<typeof real.getFiles>
): Promise<Awaited<ReturnType<typeof real.getFiles>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).getFiles(...args);
  return (real as any).getFiles(...args);
}

export async function getFolder(
  ...args: Parameters<typeof real.getFolder>
): Promise<Awaited<ReturnType<typeof real.getFolder>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).getFolder(...args);
  return (real as any).getFolder(...args);
}

export async function searchFiles(
  ...args: Parameters<typeof real.searchFiles>
): Promise<Awaited<ReturnType<typeof real.searchFiles>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).searchFiles(...args);
  return (real as any).searchFiles(...args);
}
