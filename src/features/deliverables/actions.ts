"use server";

import * as real from "./real-actions";
import * as mock from "./mock-actions";
import { isDemoMode } from "@/lib/env.server";

export async function createDeliverable(
  ...args: Parameters<typeof real.createDeliverable>
): Promise<Awaited<ReturnType<typeof real.createDeliverable>>> {
  if (isDemoMode()) return (mock as any).createDeliverable(...args);
  return (real as any).createDeliverable(...args);
}

export async function startReviewSession(
  ...args: Parameters<typeof real.startReviewSession>
): Promise<Awaited<ReturnType<typeof real.startReviewSession>>> {
  if (isDemoMode()) return (mock as any).startReviewSession(...args);
  return (real as any).startReviewSession(...args);
}

export async function approveRevision(
  ...args: Parameters<typeof real.approveRevision>
): Promise<Awaited<ReturnType<typeof real.approveRevision>>> {
  if (isDemoMode()) return (mock as any).approveRevision(...args);
  return (real as any).approveRevision(...args);
}

export async function requestRevision(
  ...args: Parameters<typeof real.requestRevision>
): Promise<Awaited<ReturnType<typeof real.requestRevision>>> {
  if (isDemoMode()) return (mock as any).requestRevision(...args);
  return (real as any).requestRevision(...args);
}

export async function generateShareLink(
  ...args: Parameters<typeof real.generateShareLink>
): Promise<Awaited<ReturnType<typeof real.generateShareLink>>> {
  if (isDemoMode()) return (mock as any).generateShareLink(...args);
  return (real as any).generateShareLink(...args);
}

export async function getReviewSessions(
  ...args: Parameters<typeof real.getReviewSessions>
): Promise<Awaited<ReturnType<typeof real.getReviewSessions>>> {
  if (isDemoMode()) return (mock as any).getReviewSessions(...args);
  return (real as any).getReviewSessions(...args);
}

export async function getDeliverableApprovals(
  ...args: Parameters<typeof real.getDeliverableApprovals>
): Promise<Awaited<ReturnType<typeof real.getDeliverableApprovals>>> {
  if (isDemoMode()) return (mock as any).getDeliverableApprovals(...args);
  return (real as any).getDeliverableApprovals(...args);
}

export async function getDeliverableShareLinks(
  ...args: Parameters<typeof real.getDeliverableShareLinks>
): Promise<Awaited<ReturnType<typeof real.getDeliverableShareLinks>>> {
  if (isDemoMode()) return (mock as any).getDeliverableShareLinks(...args);
  return (real as any).getDeliverableShareLinks(...args);
}

export async function getDeliverableActivity(
  ...args: Parameters<typeof real.getDeliverableActivity>
): Promise<Awaited<ReturnType<typeof real.getDeliverableActivity>>> {
  if (isDemoMode()) return (mock as any).getDeliverableActivity(...args);
  return (real as any).getDeliverableActivity(...args);
}

export async function getDeliverables(
  ...args: Parameters<typeof real.getDeliverables>
): Promise<Awaited<ReturnType<typeof real.getDeliverables>>> {
  if (isDemoMode()) return (mock as any).getDeliverables(...args);
  return (real as any).getDeliverables(...args);
}

export async function getDeliverableById(
  ...args: Parameters<typeof real.getDeliverableById>
): Promise<Awaited<ReturnType<typeof real.getDeliverableById>>> {
  if (isDemoMode()) return (mock as any).getDeliverableById(...args);
  return (real as any).getDeliverableById(...args);
}

export async function searchDeliverables(
  ...args: Parameters<typeof real.searchDeliverables>
): Promise<Awaited<ReturnType<typeof real.searchDeliverables>>> {
  if (isDemoMode()) return (mock as any).searchDeliverables(...args);
  return (real as any).searchDeliverables(...args);
}

export async function getDeliverableFiles(
  ...args: Parameters<typeof real.getDeliverableFiles>
): Promise<Awaited<ReturnType<typeof real.getDeliverableFiles>>> {
  if (isDemoMode()) return (mock as any).getDeliverableFiles(...args);
  return (real as any).getDeliverableFiles(...args);
}

export async function linkFileToDeliverable(
  ...args: Parameters<typeof real.linkFileToDeliverable>
): Promise<Awaited<ReturnType<typeof real.linkFileToDeliverable>>> {
  if (isDemoMode()) return (mock as any).linkFileToDeliverable(...args);
  return (real as any).linkFileToDeliverable(...args);
}

export async function unlinkFileFromDeliverable(
  ...args: Parameters<typeof real.unlinkFileFromDeliverable>
): Promise<Awaited<ReturnType<typeof real.unlinkFileFromDeliverable>>> {
  if (isDemoMode()) return (mock as any).unlinkFileFromDeliverable(...args);
  return (real as any).unlinkFileFromDeliverable(...args);
}

export async function archiveDeliverable(
  ...args: Parameters<typeof real.archiveDeliverable>
): Promise<Awaited<ReturnType<typeof real.archiveDeliverable>>> {
  if (isDemoMode()) return (mock as any).archiveDeliverable(...args);
  return (real as any).archiveDeliverable(...args);
}

export async function getPortalReviewData(
  ...args: Parameters<typeof real.getPortalReviewData>
): Promise<Awaited<ReturnType<typeof real.getPortalReviewData>>> {
  if (isDemoMode()) return (mock as any).getPortalReviewData(...args);
  return (real as any).getPortalReviewData(...args);
}

export async function submitPortalApproval(
  ...args: Parameters<typeof real.submitPortalApproval>
): Promise<Awaited<ReturnType<typeof real.submitPortalApproval>>> {
  if (isDemoMode()) return (mock as any).submitPortalApproval(...args);
  return (real as any).submitPortalApproval(...args);
}

export async function submitPortalChangeRequest(
  ...args: Parameters<typeof real.submitPortalChangeRequest>
): Promise<Awaited<ReturnType<typeof real.submitPortalChangeRequest>>> {
  if (isDemoMode()) return (mock as any).submitPortalChangeRequest(...args);
  return (real as any).submitPortalChangeRequest(...args);
}

export async function submitPortalComment(
  ...args: Parameters<typeof real.submitPortalComment>
): Promise<Awaited<ReturnType<typeof real.submitPortalComment>>> {
  if (isDemoMode()) return (mock as any).submitPortalComment(...args);
  return (real as any).submitPortalComment(...args);
}

export async function getPortalFileDownloadUrl(
  ...args: Parameters<typeof real.getPortalFileDownloadUrl>
): Promise<Awaited<ReturnType<typeof real.getPortalFileDownloadUrl>>> {
  if (isDemoMode()) return (mock as any).getPortalFileDownloadUrl(...args);
  return (real as any).getPortalFileDownloadUrl(...args);
}
