/* eslint-disable @typescript-eslint/no-explicit-any */
import type { createFolder as real_createFolder, initializeFileUpload as real_initializeFileUpload, finalizeFileUpload as real_finalizeFileUpload, linkFileToEntity as real_linkFileToEntity, generateShareLink as real_generateShareLink, promoteFileVersion as real_promoteFileVersion } from "./real-actions";

export async function createFolder(...args: Parameters<typeof real_createFolder>): Promise<Awaited<ReturnType<typeof real_createFolder>>> {
  return { id: "mock-id", success: true } as any;
}

export async function initializeFileUpload(...args: Parameters<typeof real_initializeFileUpload>): Promise<Awaited<ReturnType<typeof real_initializeFileUpload>>> {
  return { id: "mock-id", data: [] } as any;
}

export async function finalizeFileUpload(...args: Parameters<typeof real_finalizeFileUpload>): Promise<Awaited<ReturnType<typeof real_finalizeFileUpload>>> {
  return { id: "mock-id", data: [] } as any;
}

export async function linkFileToEntity(...args: Parameters<typeof real_linkFileToEntity>): Promise<Awaited<ReturnType<typeof real_linkFileToEntity>>> {
  return { id: "mock-id", data: [] } as any;
}

export async function generateShareLink(...args: Parameters<typeof real_generateShareLink>): Promise<Awaited<ReturnType<typeof real_generateShareLink>>> {
  return { id: "mock-id", data: [] } as any;
}

export async function promoteFileVersion(...args: Parameters<typeof real_promoteFileVersion>): Promise<Awaited<ReturnType<typeof real_promoteFileVersion>>> {
  return { id: "mock-id", data: [] } as any;
}
