/* eslint-disable @typescript-eslint/no-explicit-any */
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
  deliverableActivity,
} from "@/db/schema/deliverables";
import { clients, projects, tasks } from "@/db/schema";
import { CurrentUser, requireCurrentUser } from "@/features/auth/current-user";
import { requirePermission } from "@/features/permissions";
import { and, desc, eq, ilike, isNull, sql } from "drizzle-orm";
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
  tx: typeof db | DbTransaction = db,
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
    // Verify project belongs to caller's organization
    const [project] = await tx
      .select({ projectId: projects.projectId })
      .from(projects)
      .where(
        and(
          eq(projects.projectId, data.projectId),
          eq(projects.organizationId, user.organizationId),
          isNull(projects.deletedAt),
        ),
      )
      .limit(1);

    if (!project) {
      throw new Error("Project not found or does not belong to active organization.");
    }

    if (data.clientId) {
      const [client] = await tx
        .select({ clientId: clients.clientId })
        .from(clients)
        .where(
          and(
            eq(clients.clientId, data.clientId),
            eq(clients.organizationId, user.organizationId),
            isNull(clients.deletedAt),
          ),
        )
        .limit(1);
      if (!client) {
        throw new Error("Client not found or does not belong to active organization.");
      }
    }

    if (data.taskId) {
      const [task] = await tx
        .select({ taskId: tasks.taskId })
        .from(tasks)
        .where(
          and(
            eq(tasks.taskId, data.taskId),
            eq(tasks.organizationId, user.organizationId),
            isNull(tasks.deletedAt),
          ),
        )
        .limit(1);
      if (!task) {
        throw new Error("Task not found or does not belong to active organization.");
      }
    }

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
    await tx
      .update(deliverables)
      .set({ currentRevisionId: revision.revisionId })
      .where(eq(deliverables.deliverableId, deliverable.deliverableId));

    await logDeliverableActivity(
      "created",
      deliverable.deliverableId,
      data.projectId,
      user.organizationId,
      { version: 1 },
      tx,
    );

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
  deadlineAt?: Date,
) {
  const user = await requireCurrentUser();

  const result = await db.transaction(async (tx) => {
    const [deliverable] = await tx.query.deliverables.findMany({
      where: and(
        eq(deliverables.deliverableId, deliverableId),
        eq(deliverables.organizationId, user.organizationId),
      ),
      limit: 1,
    });

    if (!deliverable || deliverable.isLocked) {
      throw new Error("Deliverable not found or is locked.");
    }

    const [session] = await tx
      .insert(deliverableReviewSessions)
      .values({
        organizationId: user.organizationId,
        projectId: deliverable.projectId,
        deliverableId,
        revisionId,
        reviewType,
        status: "preparing",
        deadlineAt,
      })
      .returning();

    await tx
      .update(deliverables)
      .set({
        status:
          reviewType === "client_review" ? "client_review" : "internal_review",
      })
      .where(eq(deliverables.deliverableId, deliverableId));

    await logDeliverableActivity(
      "review_session_started",
      deliverableId,
      deliverable.projectId,
      user.organizationId,
      { sessionId: session.sessionId, type: reviewType },
      tx,
    );

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
  notes?: string,
) {
  const user = await requireCurrentUser();

  const result = await db.transaction(async (tx) => {
    const [deliverable] = await tx.query.deliverables.findMany({
      where: and(
        eq(deliverables.deliverableId, deliverableId),
        eq(deliverables.organizationId, user.organizationId),
      ),
      limit: 1,
    });

    if (!deliverable || deliverable.isLocked) {
      throw new Error("Deliverable not found or already locked.");
    }

    // 1. Record Approval
    const [approval] = await tx
      .insert(deliverableApprovals)
      .values({
        organizationId: user.organizationId,
        projectId: deliverable.projectId,
        sessionId,
        approverId: user.userId,
        status: "approved",
        notes,
      })
      .returning();

    // 2. Lock Deliverable and set Approved Status
    await tx
      .update(deliverables)
      .set({
        status: "approved",
        isLocked: true,
      })
      .where(eq(deliverables.deliverableId, deliverableId));

    await logDeliverableActivity(
      "approved",
      deliverableId,
      deliverable.projectId,
      user.organizationId,
      { approvalId: approval.approvalId },
      tx,
    );
    return approval;
  });

  return result;
}

/**
 * Request a New Revision (Unlocks if necessary)
 */
export async function requestRevision(deliverableId: string, reason: string) {
  const user = await requireCurrentUser();

  const result = await db.transaction(async (tx) => {
    const [deliverable] = await tx.query.deliverables.findMany({
      where: and(
        eq(deliverables.deliverableId, deliverableId),
        eq(deliverables.organizationId, user.organizationId),
      ),
      limit: 1,
    });

    if (!deliverable) throw new Error("Deliverable not found");

    // Get latest revision number
    const latestRevision = await tx.query.deliverableRevisions.findFirst({
      where: eq(deliverableRevisions.deliverableId, deliverableId),
      orderBy: (revs, { desc }) => [desc(revs.versionNumber)],
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
    await tx
      .update(deliverables)
      .set({
        currentRevisionId: revision.revisionId,
        status: "revision_requested",
        isLocked: false, // Unlock for new changes
      })
      .where(eq(deliverables.deliverableId, deliverable.deliverableId));

    await logDeliverableActivity(
      "revision_requested",
      deliverableId,
      deliverable.projectId,
      user.organizationId,
      { newVersion: nextVersion, reason },
      tx,
    );

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
        eq(deliverables.organizationId, user.organizationId),
      ),
      limit: 1,
    });

    if (!deliverable) throw new Error("Deliverable not found");

    const token = crypto.randomBytes(32).toString("hex");

    const [shareLink] = await tx
      .insert(deliverableShareLinks)
      .values({
        organizationId: user.organizationId,
        projectId: deliverable.projectId,
        deliverableId,
        revisionId,
        token,
        accessLevel,
        isWatermarkEnabled,
        sentViaEmail: !!emailRecipient,
        emailRecipient,
      })
      .returning();

    await logDeliverableActivity(
      "share_link_generated",
      deliverableId,
      deliverable.projectId,
      user.organizationId,
      { shareId: shareLink.shareId, accessLevel },
      tx,
    );

    return shareLink;
  });

  // If email dispatch is requested, we would trigger the notification architecture background job here
  // e.g. await jobQueue.enqueue("notification_delivery", { shareId: result.shareId, email: emailRecipient })

  return result;
}

/**
 * PUBLIC READ LAYER (Sprint 11B)
 */

export type DeliverableListFilters = {
  projectId?: string;
  clientId?: string;
  status?: string;
};

/**
 * Global, cross-project list of deliverables for the enterprise workspace.
 */
export async function getDeliverables(
  filters: DeliverableListFilters = {},
  cursorOffset: number = 0,
  limit: number = 50,
) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "deliverables", "read");

  return db.query.deliverables.findMany({
    where: and(
      eq(deliverables.organizationId, user.organizationId),
      isNull(deliverables.deletedAt),
      filters.projectId
        ? eq(deliverables.projectId, filters.projectId)
        : undefined,
      filters.clientId
        ? eq(deliverables.clientId, filters.clientId)
        : undefined,
      filters.status
        ? eq(
            deliverables.status,
            filters.status as (typeof deliverables.status.enumValues)[number],
          )
        : undefined,
    ),
    offset: cursorOffset,
    limit,
    orderBy: [desc(deliverables.createdAt)],
  });
}

export async function getDeliverableById(deliverableId: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "deliverables", "read");

  const deliverable = await db.query.deliverables.findFirst({
    where: and(
      eq(deliverables.deliverableId, deliverableId),
      eq(deliverables.organizationId, user.organizationId),
      isNull(deliverables.deletedAt),
    ),
  });
  if (!deliverable) return undefined;

  const revisions = await db.query.deliverableRevisions.findMany({
    where: eq(deliverableRevisions.deliverableId, deliverableId),
    orderBy: [desc(deliverableRevisions.versionNumber)],
  });

  return { ...deliverable, revisions };
}

/**
 * Sprint 12B — review sessions for one deliverable (technical-debt item 10).
 *
 * `approveRevision(deliverableId, sessionId, notes)` has always required a
 * session id, but no read returned one. Approve was therefore reachable only
 * inside the same drawer session that started the review: reload the page and
 * the deliverable could be reviewed again but never approved. This closes that.
 */
export async function getReviewSessions(deliverableId: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "deliverables", "read");

  return db.query.deliverableReviewSessions.findMany({
    where: and(
      eq(deliverableReviewSessions.deliverableId, deliverableId),
      eq(deliverableReviewSessions.organizationId, user.organizationId),
    ),
    orderBy: [desc(deliverableReviewSessions.createdAt)],
  });
}

/** Sprint 12B — approval history, joined to the session it was cast in. */
export async function getDeliverableApprovals(deliverableId: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "deliverables", "read");

  return db
    .select({
      approvalId: deliverableApprovals.approvalId,
      sessionId: deliverableApprovals.sessionId,
      approverId: deliverableApprovals.approverId,
      status: deliverableApprovals.status,
      notes: deliverableApprovals.notes,
      createdAt: deliverableApprovals.createdAt,
      reviewType: deliverableReviewSessions.reviewType,
    })
    .from(deliverableApprovals)
    .innerJoin(
      deliverableReviewSessions,
      eq(deliverableApprovals.sessionId, deliverableReviewSessions.sessionId),
    )
    .where(
      and(
        eq(deliverableReviewSessions.deliverableId, deliverableId),
        eq(deliverableApprovals.organizationId, user.organizationId),
      ),
    )
    .orderBy(desc(deliverableApprovals.createdAt));
}

/** Sprint 12B — share links issued for a deliverable. */
export async function getDeliverableShareLinks(deliverableId: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "deliverables", "read");

  return db.query.deliverableShareLinks.findMany({
    where: and(
      eq(deliverableShareLinks.deliverableId, deliverableId),
      eq(deliverableShareLinks.organizationId, user.organizationId),
    ),
    orderBy: [desc(deliverableShareLinks.createdAt)],
  });
}

/**
 * Sprint 12B — the deliverable's own activity trail.
 *
 * `logDeliverableActivity` has written to this table since Sprint 11; nothing
 * read it back, so create / review / approve / revision / share all happened
 * with no visible history.
 */
export async function getDeliverableActivity(
  deliverableId: string,
  limit: number = 25,
) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "deliverables", "read");

  return db.query.deliverableActivity.findMany({
    where: and(
      eq(deliverableActivity.deliverableId, deliverableId),
      eq(deliverableActivity.organizationId, user.organizationId),
    ),
    orderBy: [desc(deliverableActivity.createdAt)],
    limit,
  });
}

/**
 * Title search across all deliverables in the organization (global fetcher).
 */
export async function searchDeliverables(
  searchTerm: string,
  cursorOffset: number = 0,
  limit: number = 50,
) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "deliverables", "read");

  return db.query.deliverables.findMany({
    where: and(
      eq(deliverables.organizationId, user.organizationId),
      isNull(deliverables.deletedAt),
      ilike(deliverables.title, `%${searchTerm}%`),
    ),
    offset: cursorOffset,
    limit,
    orderBy: [desc(deliverables.createdAt)],
  });
}
