"use server";

import * as real from "./real-actions";
import * as mock from "./mock-actions";

export async function createFolder(...args: Parameters<typeof real.createFolder>): Promise<Awaited<ReturnType<typeof real.createFolder>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).createFolder(...args);
  return (real as any).createFolder(...args);
}

export async function initializeFileUpload(...args: Parameters<typeof real.initializeFileUpload>): Promise<Awaited<ReturnType<typeof real.initializeFileUpload>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).initializeFileUpload(...args);
  return (real as any).initializeFileUpload(...args);
}

export async function finalizeFileUpload(...args: Parameters<typeof real.finalizeFileUpload>): Promise<Awaited<ReturnType<typeof real.finalizeFileUpload>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).finalizeFileUpload(...args);
  return (real as any).finalizeFileUpload(...args);
}

export async function linkFileToEntity(...args: Parameters<typeof real.linkFileToEntity>): Promise<Awaited<ReturnType<typeof real.linkFileToEntity>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).linkFileToEntity(...args);
  return (real as any).linkFileToEntity(...args);
}

export async function generateShareLink(...args: Parameters<typeof real.generateShareLink>): Promise<Awaited<ReturnType<typeof real.generateShareLink>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).generateShareLink(...args);
  return (real as any).generateShareLink(...args);
}

export async function promoteFileVersion(...args: Parameters<typeof real.promoteFileVersion>): Promise<Awaited<ReturnType<typeof real.promoteFileVersion>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).promoteFileVersion(...args);
  return (real as any).promoteFileVersion(...args);
}

