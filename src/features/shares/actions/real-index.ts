"use server";

import { db } from "@/db";
import {
  shareSessions,
  shareSessionItems,
  externalIdentities,
  shareComments,
  shareAnnotations,
  shareEvents,
} from "@/db/schema/shares";
import { deliverables } from "@/db/schema/deliverables";
import { projects } from "@/db/schema/projects";
import { eq, and, inArray } from "drizzle-orm";
import { requireCurrentUser } from "@/features/auth/current-user";
import { requirePermission } from "@/features/permissions";
import { logSecurityEvent } from "@/lib/security/logger";
import { ShareSecurityMiddleware } from "../utils/security";

/**
 * Share-session actions, internal and external.
 *
 * Every function in this module is a `"use server"` export, which means it is
 * an HTTP endpoint the browser can invoke directly. None of them authorised
 * anything, and each took the identifiers that decide *whose* data is touched
 * as plain arguments:
 *
 *   · `createShareSessionAction` accepted `organizationId` and `projectId`, so
 *     any caller could publish a share session inside any tenant — and the
 *     action returns the secure token, so the caller walks away holding a
 *     working link to another organisation's deliverables. The deliverable ids
 *     were not checked against the project either, so the snapshot could name
 *     any deliverable on the platform.
 *   · `resolveExternalIdentityAction` accepted `organizationId` and wrote an
 *     external identity row into it.
 *   · The three external write actions accepted `identityId` from the caller,
 *     so feedback, annotations and meeting requests could be attributed to any
 *     external person, and `itemId` was looked up with no check that it
 *     belonged to the session named alongside it.
 *   · `submitExternalApprovalAction` consumed a nonce — genuinely useful
 *     replay protection — but the nonce was never checked against the session
 *     or identity being claimed, so a nonce minted for one share authorised an
 *     approval on another, under someone else's name.
 *
 * The split now: the internal action authenticates a platform user and derives
 * the tenant from them. The external actions authenticate the *share token*,
 * which is the external client's only credential, and derive session and
 * identity from the verified token payload. In both cases the caller no longer
 * names the tenant.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Internal — authenticated platform users
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1. Create a new Share Session (Immutable Snapshot)
 * Architecture Decision #1: Sessions are immutable. We take a snapshot of current deliverables.
 */
export async function createShareSessionAction(payload: {
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
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "share_links", "create");

  // The project must belong to the caller's organisation. This is what ties
  // the share to a tenant now that `organizationId` is not an argument.
  const [project] = await db
    .select({ projectId: projects.projectId })
    .from(projects)
    .where(
      and(
        eq(projects.projectId, payload.projectId),
        eq(projects.organizationId, user.organizationId),
      ),
    )
    .limit(1);

  if (!project) throw new Error("Project not found.");

  if (payload.deliverableIds.length === 0) {
    throw new Error("A share session must contain at least one deliverable.");
  }

  // Every deliverable must belong to that same project. Without this the
  // snapshot is an arbitrary list of ids, and a share of "this project" can
  // quietly include another project's — or another tenant's — work.
  const owned = await db
    .select({ deliverableId: deliverables.deliverableId })
    .from(deliverables)
    .where(
      and(
        inArray(deliverables.deliverableId, payload.deliverableIds),
        eq(deliverables.projectId, payload.projectId),
        eq(deliverables.organizationId, user.organizationId),
      ),
    );

  if (owned.length !== payload.deliverableIds.length) {
    logSecurityEvent("share.create_rejected", "denied", {
      reason: "deliverable_not_in_project",
      userId: user.userId,
      projectId: payload.projectId,
    });
    throw new Error("One or more deliverables do not belong to this project.");
  }

  // Use a transaction to ensure all items are created atomically
  const result = await db.transaction(async (tx) => {
    // Generate unique token
    const secureToken = crypto.randomUUID();

    const [session] = await tx
      .insert(shareSessions)
      .values({
        organizationId: user.organizationId,
        projectId: payload.projectId,
        policyId: payload.policyId,
        title: payload.title,
        description: payload.description,
        shareType: payload.shareType,
        secureToken,
        status: "published",
        publishedAt: new Date(),
        createdBy: user.userId,
        updatedBy: user.userId,
      })
      .returning();

    // Map items (snapshots)
    const itemsData = payload.deliverableIds.map((deliverableId, index) => ({
      organizationId: user.organizationId,
      projectId: payload.projectId,
      sessionId: session.id,
      deliverableId,
      orderIndex: index,
    }));

    await tx.insert(shareSessionItems).values(itemsData);

    // Emit Event (Module 12)
    await tx.insert(shareEvents).values({
      organizationId: user.organizationId,
      projectId: payload.projectId,
      sessionId: session.id,
      eventType: "Share.Created",
      payload: { title: session.title, type: session.shareType },
    });

    return session;
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// External — callers holding a share token
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Establishes what a share token actually authorises.
 *
 * Returns the verified session and the identity carried by the token. Every
 * external action goes through this, and no external action reads an identity
 * or an organisation from its own arguments.
 */
async function authoriseShareToken(shareToken: string) {
  const validation = await ShareSecurityMiddleware.validateToken(shareToken);

  if (!validation.valid || !validation.session) {
    logSecurityEvent("share.token_rejected", "denied", {
      reason: validation.error,
    });
    throw new Error("This link is invalid, expired, or no longer active.");
  }

  const payload = validation.payload as
    { sessionId?: string; identityId?: string } | undefined;

  return {
    sessionId: validation.session.id,
    organizationId: validation.session.organizationId,
    projectId: validation.session.projectId,
    // The identity is whoever the token was issued to. A caller-supplied one
    // is an attribution of their choosing.
    identityId: payload?.identityId,
  };
}

/**
 * Resolves the share item the caller named, proving it belongs to the session
 * their token authorises.
 *
 * The lookup previously matched on item id alone, so an item id from any share
 * on the platform resolved — and its own organisation and project were then
 * used for the write, placing the row neatly inside the victim's tenant.
 */
async function requireItemInSession(itemId: string, sessionId: string) {
  const item = await db.query.shareSessionItems.findFirst({
    where: and(
      eq(shareSessionItems.id, itemId),
      eq(shareSessionItems.sessionId, sessionId),
    ),
  });

  if (!item) throw new Error("Item not found");
  return item;
}

/**
 * 2. External Identity Management
 * Architecture Decision #2: Reuse identity across Share Sessions. No platform accounts.
 * Hardening Sprint 13.1: Support Magic Link or OTP.
 *
 * The organisation is taken from the share token, not from the caller: this
 * function creates rows, and letting the caller pick the tenant they are
 * created in is a write into someone else's data.
 */
export async function resolveExternalIdentityAction(
  shareToken: string,
  email: string,
  displayName?: string,
) {
  const { organizationId } = await authoriseShareToken(shareToken);

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
    // Update display name if changed. Re-scoped by organisation so the id
    // alone cannot reach another tenant's row.
    [identity] = await db
      .update(externalIdentities)
      .set({ displayName })
      .where(
        and(
          eq(externalIdentities.id, identity.id),
          eq(externalIdentities.organizationId, organizationId),
        ),
      )
      .returning();
  }

  return identity;
}

/**
 * 3. Submit Feedback (Comments)
 * Architecture Decision #7: Must emit platform events.
 */
export async function submitExternalCommentAction(payload: {
  shareToken: string;
  itemId: string;
  content: string;
  parentId?: string;
}) {
  const auth = await authoriseShareToken(payload.shareToken);

  return await db.transaction(async (tx) => {
    const sessionItem = await requireItemInSession(
      payload.itemId,
      auth.sessionId,
    );

    const [comment] = await tx
      .insert(shareComments)
      .values({
        organizationId: sessionItem.organizationId,
        projectId: sessionItem.projectId,
        sessionId: auth.sessionId,
        itemId: payload.itemId,
        authorIdentityId: auth.identityId,
        content: payload.content,
        parentId: payload.parentId,
      })
      .returning();

    // Emit Event
    await tx.insert(shareEvents).values({
      organizationId: sessionItem.organizationId,
      projectId: sessionItem.projectId,
      sessionId: auth.sessionId,
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
  shareToken: string;
  itemId: string;
  commentId?: string; // Linked comment
  type: "point" | "area" | "timestamp" | "text" | "drawing";
  normX?: number;
  normY?: number;
  normWidth?: number;
  normHeight?: number;
  timeMs?: number;
}) {
  const auth = await authoriseShareToken(payload.shareToken);
  const sessionItem = await requireItemInSession(
    payload.itemId,
    auth.sessionId,
  );

  const [annotation] = await db
    .insert(shareAnnotations)
    .values({
      organizationId: sessionItem.organizationId,
      projectId: sessionItem.projectId,
      sessionId: auth.sessionId,
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
    sessionId: auth.sessionId,
    eventType: "Share.AnnotationAdded",
    payload: { annotationId: annotation.id, type: annotation.type },
  });

  return annotation;
}

/**
 * 5. Submit Approval
 * Architecture Decision #5: Explicit confirmation required. (Handled in UI, server commits).
 * Hardening Sprint 13.1: Enforce Atomic Nonce Consumption
 *
 * The nonce is consumed *after* the token is verified, not before. Consuming
 * first let an unauthenticated caller burn nonces they had merely observed,
 * and made the outcome of a guess distinguishable — the first attempt with a
 * given value behaved differently from the second.
 */
export async function submitExternalApprovalAction(payload: {
  shareToken: string;
  itemId: string;
  decision: "approved" | "rejected";
  reason?: string;
  explicitConfirmationToken: string; // Used as the Nonce
}) {
  const auth = await authoriseShareToken(payload.shareToken);

  // Consume Nonce Atomically
  const nonceConsumed = await ShareSecurityMiddleware.consumeNonce(
    payload.explicitConfirmationToken,
  );
  if (!nonceConsumed) {
    throw new Error("Invalid or Expired Token (Replay Protection)");
  }

  return await db.transaction(async (tx) => {
    const sessionItem = await requireItemInSession(
      payload.itemId,
      auth.sessionId,
    );

    // Emit Event explicitly mapping to Approval Engine semantics
    const [event] = await tx
      .insert(shareEvents)
      .values({
        organizationId: sessionItem.organizationId,
        projectId: sessionItem.projectId,
        sessionId: auth.sessionId,
        eventType: "Share.ApprovalSubmitted",
        payload: {
          itemId: payload.itemId,
          identityId: auth.identityId,
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
  shareToken: string;
  itemId: string;
  commentId: string;
}) {
  const auth = await authoriseShareToken(payload.shareToken);
  const sessionItem = await requireItemInSession(
    payload.itemId,
    auth.sessionId,
  );

  const [event] = await db
    .insert(shareEvents)
    .values({
      organizationId: sessionItem.organizationId,
      projectId: sessionItem.projectId,
      sessionId: auth.sessionId,
      eventType: "Share.MeetingRequested",
      payload: {
        itemId: payload.itemId,
        commentId: payload.commentId,
        identityId: auth.identityId,
      },
    })
    .returning();

  return event;
}
