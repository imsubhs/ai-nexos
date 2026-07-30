"use server";

import { db } from "@/db";
import {
  shareSessions,
  shareSessionItems,
  externalIdentities,
  shareComments,
  shareAnnotations,
  shareEvents,
  shareRecipients,
} from "@/db/schema/shares";
import { eq, and } from "drizzle-orm";
import { ShareSecurityMiddleware } from "../utils/security";

/**
 * 1. Create a new Share Session (Immutable Snapshot)
 * Architecture Decision #1: Sessions are immutable. We take a snapshot of current deliverables.
 */
export async function createShareSessionAction(payload: {
  organizationId: string;
  projectId: string;
  policyId?: string;
  title: string;
  description?: string;
  shareType:
    | "deliverable_review"
    | "approval_request"
    | "revision_review"
    | "creative_feedback";
  deliverableIds: string[];
}) {
  // Use a transaction to ensure all items are created atomically
  const result = await db.transaction(async (tx) => {
    // Generate unique token
    const secureToken = crypto.randomUUID();

    const [session] = await tx
      .insert(shareSessions)
      .values({
        organizationId: payload.organizationId,
        projectId: payload.projectId,
        policyId: payload.policyId,
        title: payload.title,
        description: payload.description,
        shareType: payload.shareType,
        secureToken,
        status: "published",
        publishedAt: new Date(),
      })
      .returning();

    // Map items (snapshots)
    const itemsData = payload.deliverableIds.map((deliverableId, index) => ({
      organizationId: payload.organizationId,
      projectId: payload.projectId,
      sessionId: session.id,
      deliverableId,
      orderIndex: index,
    }));

    await tx.insert(shareSessionItems).values(itemsData);

    // Emit Event (Module 12)
    await tx.insert(shareEvents).values({
      organizationId: payload.organizationId,
      projectId: payload.projectId,
      sessionId: session.id,
      eventType: "Share.Created",
      payload: { title: session.title, type: session.shareType },
    });

    return session;
  });

  return result;
}

/**
 * 2. External Identity Management
 * Architecture Decision #2: Reuse identity across Share Sessions. No platform accounts.
 * Hardening Sprint 13.1: Support Magic Link or OTP.
 */
export async function resolveExternalIdentityAction(
  organizationId: string,
  email: string,
  displayName?: string,
  authMethod: "magic_link" | "otp" = "magic_link",
) {
  // Check if identity exists
  let identity = await db.query.externalIdentities.findFirst({
    where: and(
      eq(externalIdentities.organizationId, organizationId),
      eq(externalIdentities.email, email),
    ),
  });

  if (!identity) {
    [identity] = await db
      .insert(externalIdentities)
      .values({
        organizationId,
        email,
        displayName,
      })
      .returning();
  } else if (displayName && identity.displayName !== displayName) {
    // Update display name if changed
    [identity] = await db
      .update(externalIdentities)
      .set({ displayName })
      .where(eq(externalIdentities.id, identity.id))
      .returning();
  }

  // Placeholder: Trigger Magic Link or OTP logic here
  // e.g., if (authMethod === "otp") sendOtpEmail(email);

  return identity;
}

/**
 * 3. Submit Feedback (Comments)
 * Architecture Decision #7: Must emit platform events.
 */
export async function submitExternalCommentAction(payload: {
  sessionId: string;
  itemId: string;
  identityId: string;
  content: string;
  parentId?: string;
}) {
  return await db.transaction(async (tx) => {
    const sessionItem = await tx.query.shareSessionItems.findFirst({
      where: eq(shareSessionItems.id, payload.itemId),
    });

    if (!sessionItem) throw new Error("Item not found");

    const [comment] = await tx
      .insert(shareComments)
      .values({
        organizationId: sessionItem.organizationId,
        projectId: sessionItem.projectId,
        sessionId: payload.sessionId,
        itemId: payload.itemId,
        authorIdentityId: payload.identityId,
        content: payload.content,
        parentId: payload.parentId,
      })
      .returning();

    // Emit Event
    await tx.insert(shareEvents).values({
      organizationId: sessionItem.organizationId,
      projectId: sessionItem.projectId,
      sessionId: payload.sessionId,
      eventType: "Share.CommentAdded",
      payload: { commentId: comment.id, itemId: payload.itemId },
    });

    return comment;
  });
}

/**
 * 4. Submit Annotation
 * Architecture Decision #3: Normalized coordinates. #12: Millisecond precision.
 */
export async function submitExternalAnnotationAction(payload: {
  sessionId: string;
  itemId: string;
  commentId?: string; // Linked comment
  type: "point" | "area" | "timestamp" | "text" | "drawing";
  normX?: number;
  normY?: number;
  normWidth?: number;
  normHeight?: number;
  timeMs?: number;
}) {
  const sessionItem = await db.query.shareSessionItems.findFirst({
    where: eq(shareSessionItems.id, payload.itemId),
  });

  if (!sessionItem) throw new Error("Item not found");

  const [annotation] = await db
    .insert(shareAnnotations)
    .values({
      organizationId: sessionItem.organizationId,
      projectId: sessionItem.projectId,
      sessionId: payload.sessionId,
      itemId: payload.itemId,
      commentId: payload.commentId,
      type: payload.type,
      normX: payload.normX,
      normY: payload.normY,
      normWidth: payload.normWidth,
      normHeight: payload.normHeight,
      timeMs: payload.timeMs,
    })
    .returning();

  // Emit Event
  await db.insert(shareEvents).values({
    organizationId: sessionItem.organizationId,
    projectId: sessionItem.projectId,
    sessionId: payload.sessionId,
    eventType: "Share.AnnotationAdded",
    payload: { annotationId: annotation.id, type: annotation.type },
  });

  return annotation;
}

/**
 * 5. Submit Approval
 * Architecture Decision #5: Explicit confirmation required. (Handled in UI, server commits).
 * Hardening Sprint 13.1: Enforce Atomic Nonce Consumption
 */
export async function submitExternalApprovalAction(payload: {
  sessionId: string;
  itemId: string;
  identityId: string;
  decision: "approved" | "rejected";
  reason?: string;
  explicitConfirmationToken: string; // Used as the Nonce
}) {
  // Consume Nonce Atomically
  const nonceConsumed = await ShareSecurityMiddleware.consumeNonce(
    payload.explicitConfirmationToken,
  );
  if (!nonceConsumed) {
    throw new Error("Invalid or Expired Token (Replay Protection)");
  }

  return await db.transaction(async (tx) => {
    const sessionItem = await tx.query.shareSessionItems.findFirst({
      where: eq(shareSessionItems.id, payload.itemId),
    });

    if (!sessionItem) throw new Error("Item not found");

    // Emit Event explicitly mapping to Approval Engine semantics
    const [event] = await tx
      .insert(shareEvents)
      .values({
        organizationId: sessionItem.organizationId,
        projectId: sessionItem.projectId,
        sessionId: payload.sessionId,
        eventType: "Share.ApprovalSubmitted",
        payload: {
          itemId: payload.itemId,
          identityId: payload.identityId,
          decision: payload.decision,
          reason: payload.reason,
        },
      })
      .returning();

    return event;
  });
}

/**
 * 6. Module 11 Integration: Request Meeting from Feedback
 * Hardening Sprint 13.1: Emits Event, does NOT directly invoke Module 11.
 */
export async function requestShareMeetingAction(payload: {
  sessionId: string;
  itemId: string;
  commentId: string;
  identityId: string;
}) {
  const sessionItem = await db.query.shareSessionItems.findFirst({
    where: eq(shareSessionItems.id, payload.itemId),
  });

  if (!sessionItem) throw new Error("Item not found");

  const [event] = await db
    .insert(shareEvents)
    .values({
      organizationId: sessionItem.organizationId,
      projectId: sessionItem.projectId,
      sessionId: payload.sessionId,
      eventType: "Share.MeetingRequested",
      payload: {
        itemId: payload.itemId,
        commentId: payload.commentId,
        identityId: payload.identityId,
      },
    })
    .returning();

  return event;
}
