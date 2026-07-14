/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { db } from "@/db";
import crypto from "crypto";
import { 
  deliverables, 
  deliverableRevisions, 
  deliverableReviewSessions,
  deliverableReviewThreads,
  deliverableReviewComments,
  deliverableApprovals,
  deliverableShareLinks,
  deliverableActivity
} from "@/db/schema/deliverables";
import { CurrentUser, requireCurrentUser } from "@/features/auth/current-user";
import { requirePermission } from "@/features/permissions";
import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Automatically log structured activity events for a deliverable.
 */
async function logDeliverableActivity(
  eventType: string,
  deliverableId: string,
  projectId: string,
  organizationId: string,
  metadata?: Record<string, unknown>,
  tx: typeof db | DbTransaction = db
) {
  await tx.insert(deliverableActivity).values({
    organizationId,
    projectId,
    deliverableId,
    eventType,
    metadata,
  });
}

/**
 * Create a new Deliverable Draft
 */
export async function createDeliverable(data: {
  projectId: string;
  clientId?: string;
  taskId?: string;
  title: string;
  description?: string;
  type: any;
}) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "projects", "update"); // Or "deliverables.create" if implemented in roles

  const result = await db.transaction(async (tx) => {
    // 1. Create Core Deliverable
    const [deliverable] = await tx
      .insert(deliverables)
      .values({
        organizationId: user.organizationId,
        projectId: data.projectId,
        clientId: data.clientId,
        taskId: data.taskId,
        title: data.title,
        description: data.description,
        type: data.type,
        status: "draft",
      })
      .returning();

    // 2. Initialize First Revision (v1)
    const [revision] = await tx
      .insert(deliverableRevisions)
      .values({
        organizationId: user.organizationId,
        projectId: data.projectId,
        deliverableId: deliverable.deliverableId,
        versionNumber: 1,
        requestedBy: user.userId,
        status: "draft",
      })
      .returning();

    // 3. Link Revision to Core Deliverable
    await tx.update(deliverables)
      .set({ currentRevisionId: revision.revisionId })
      .where(eq(deliverables.deliverableId, deliverable.deliverableId));

    await logDeliverableActivity("created", deliverable.deliverableId, data.projectId, user.organizationId, { version: 1 }, tx);
    
    return deliverable;
  });

  revalidatePath(`/projects/${data.projectId}/deliverables`);
  return result;
}

/**
 * Start a Review Session
 */
export async function startReviewSession(
  deliverableId: string,
  revisionId: string,
  reviewType: any,
  deadlineAt?: Date
) {
  const user = await requireCurrentUser();
  
  const result = await db.transaction(async (tx) => {
    const [deliverable] = await tx.query.deliverables.findMany({
      where: and(
        eq(deliverables.deliverableId, deliverableId),
        eq(deliverables.organizationId, user.organizationId)
      ),
      limit: 1
    });

    if (!deliverable || deliverable.isLocked) {
      throw new Error("Deliverable not found or is locked.");
    }

    const [session] = await tx.insert(deliverableReviewSessions).values({
      organizationId: user.organizationId,
      projectId: deliverable.projectId,
      deliverableId,
      revisionId,
      reviewType,
      status: "preparing",
      deadlineAt,
    }).returning();

    await tx.update(deliverables).set({ status: reviewType === "client_review" ? "client_review" : "internal_review" }).where(eq(deliverables.deliverableId, deliverableId));
    
    await logDeliverableActivity("review_session_started", deliverableId, deliverable.projectId, user.organizationId, { sessionId: session.sessionId, type: reviewType }, tx);

    return session;
  });

  return result;
}

/**
 * Approve a Revision
 */
export async function approveRevision(
  deliverableId: string,
  sessionId: string,
  notes?: string
) {
  const user = await requireCurrentUser();
  
  const result = await db.transaction(async (tx) => {
    const [deliverable] = await tx.query.deliverables.findMany({
      where: and(
        eq(deliverables.deliverableId, deliverableId),
        eq(deliverables.organizationId, user.organizationId)
      ),
      limit: 1
    });

    if (!deliverable || deliverable.isLocked) {
      throw new Error("Deliverable not found or already locked.");
    }

    // 1. Record Approval
    const [approval] = await tx.insert(deliverableApprovals).values({
      organizationId: user.organizationId,
      projectId: deliverable.projectId,
      sessionId,
      approverId: user.userId,
      status: "approved",
      notes
    }).returning();

    // 2. Lock Deliverable and set Approved Status
    await tx.update(deliverables).set({
      status: "approved",
      isLocked: true
    }).where(eq(deliverables.deliverableId, deliverableId));

    await logDeliverableActivity("approved", deliverableId, deliverable.projectId, user.organizationId, { approvalId: approval.approvalId }, tx);
    return approval;
  });

  return result;
}

/**
 * Request a New Revision (Unlocks if necessary)
 */
export async function requestRevision(
  deliverableId: string,
  reason: string,
) {
  const user = await requireCurrentUser();
  
  const result = await db.transaction(async (tx) => {
    const [deliverable] = await tx.query.deliverables.findMany({
      where: and(
        eq(deliverables.deliverableId, deliverableId),
        eq(deliverables.organizationId, user.organizationId)
      ),
      limit: 1
    });

    if (!deliverable) throw new Error("Deliverable not found");

    // Get latest revision number
    const latestRevision = await tx.query.deliverableRevisions.findFirst({
      where: eq(deliverableRevisions.deliverableId, deliverableId),
      orderBy: (revs, { desc }) => [desc(revs.versionNumber)]
    });

    const nextVersion = (latestRevision?.versionNumber || 0) + 1;

    // 1. Create New Revision
    const [revision] = await tx
      .insert(deliverableRevisions)
      .values({
        organizationId: user.organizationId,
        projectId: deliverable.projectId,
        deliverableId: deliverable.deliverableId,
        versionNumber: nextVersion,
        requestedBy: user.userId,
        reason,
        status: "draft",
      })
      .returning();

    // 2. Link Revision to Core Deliverable & Unlock
    await tx.update(deliverables)
      .set({ 
        currentRevisionId: revision.revisionId,
        status: "revision_requested",
        isLocked: false // Unlock for new changes
      })
      .where(eq(deliverables.deliverableId, deliverable.deliverableId));

    await logDeliverableActivity("revision_requested", deliverableId, deliverable.projectId, user.organizationId, { newVersion: nextVersion, reason }, tx);
    
    return revision;
  });

  return result;
}

/**
 * Generate a Share Link (Client facing)
 */
export async function generateShareLink(
  deliverableId: string,
  revisionId: string,
  accessLevel: any,
  isWatermarkEnabled: boolean,
  emailRecipient?: string,
) {
  const user = await requireCurrentUser();
  
  const result = await db.transaction(async (tx) => {
    const [deliverable] = await tx.query.deliverables.findMany({
      where: and(
        eq(deliverables.deliverableId, deliverableId),
        eq(deliverables.organizationId, user.organizationId)
      ),
      limit: 1
    });

    if (!deliverable) throw new Error("Deliverable not found");
    
    const token = crypto.randomBytes(32).toString("hex");

    const [shareLink] = await tx.insert(deliverableShareLinks).values({
      organizationId: user.organizationId,
      projectId: deliverable.projectId,
      deliverableId,
      revisionId,
      token,
      accessLevel,
      isWatermarkEnabled,
      sentViaEmail: !!emailRecipient,
      emailRecipient,
    }).returning();

    await logDeliverableActivity("share_link_generated", deliverableId, deliverable.projectId, user.organizationId, { shareId: shareLink.shareId, accessLevel }, tx);

    return shareLink;
  });

  // If email dispatch is requested, we would trigger the notification architecture background job here
  // e.g. await jobQueue.enqueue("notification_delivery", { shareId: result.shareId, email: emailRecipient })

  return result;
}
