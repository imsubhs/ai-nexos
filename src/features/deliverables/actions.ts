"use server";

import * as real from "./real-actions";
import * as mock from "./mock-actions";

export async function createDeliverable(...args: Parameters<typeof real.createDeliverable>): Promise<Awaited<ReturnType<typeof real.createDeliverable>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).createDeliverable(...args);
  return (real as any).createDeliverable(...args);
}

export async function startReviewSession(...args: Parameters<typeof real.startReviewSession>): Promise<Awaited<ReturnType<typeof real.startReviewSession>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).startReviewSession(...args);
  return (real as any).startReviewSession(...args);
}

export async function approveRevision(...args: Parameters<typeof real.approveRevision>): Promise<Awaited<ReturnType<typeof real.approveRevision>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).approveRevision(...args);
  return (real as any).approveRevision(...args);
}

export async function requestRevision(...args: Parameters<typeof real.requestRevision>): Promise<Awaited<ReturnType<typeof real.requestRevision>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).requestRevision(...args);
  return (real as any).requestRevision(...args);
}

export async function generateShareLink(...args: Parameters<typeof real.generateShareLink>): Promise<Awaited<ReturnType<typeof real.generateShareLink>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).generateShareLink(...args);
  return (real as any).generateShareLink(...args);
}

export async function getReviewSessions(...args: Parameters<typeof real.getReviewSessions>): Promise<Awaited<ReturnType<typeof real.getReviewSessions>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).getReviewSessions(...args);
  return (real as any).getReviewSessions(...args);
}

export async function getDeliverableApprovals(...args: Parameters<typeof real.getDeliverableApprovals>): Promise<Awaited<ReturnType<typeof real.getDeliverableApprovals>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).getDeliverableApprovals(...args);
  return (real as any).getDeliverableApprovals(...args);
}

export async function getDeliverableShareLinks(...args: Parameters<typeof real.getDeliverableShareLinks>): Promise<Awaited<ReturnType<typeof real.getDeliverableShareLinks>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).getDeliverableShareLinks(...args);
  return (real as any).getDeliverableShareLinks(...args);
}

export async function getDeliverableActivity(...args: Parameters<typeof real.getDeliverableActivity>): Promise<Awaited<ReturnType<typeof real.getDeliverableActivity>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).getDeliverableActivity(...args);
  return (real as any).getDeliverableActivity(...args);
}

export async function getDeliverables(...args: Parameters<typeof real.getDeliverables>): Promise<Awaited<ReturnType<typeof real.getDeliverables>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).getDeliverables(...args);
  return (real as any).getDeliverables(...args);
}

export async function getDeliverableById(...args: Parameters<typeof real.getDeliverableById>): Promise<Awaited<ReturnType<typeof real.getDeliverableById>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).getDeliverableById(...args);
  return (real as any).getDeliverableById(...args);
}

export async function searchDeliverables(...args: Parameters<typeof real.searchDeliverables>): Promise<Awaited<ReturnType<typeof real.searchDeliverables>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).searchDeliverables(...args);
  return (real as any).searchDeliverables(...args);
}

