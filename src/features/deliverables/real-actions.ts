/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/db";
import crypto from "crypto";
import { storageService } from "@/lib/storage/SupabaseStorageProvider";
import {
  deliverables,
  deliverableRevisions,
  deliverableFiles,
  deliverableReviewSessions,
  deliverableReviewThreads,
  deliverableReviewComments,
  deliverableApprovals,
  deliverableShareLinks,
  deliverableActivity,
} from "@/db/schema/deliverables";
import { files, fileVersions, fileRelations } from "@/db/schema/files";
import { clients, projects, tasks } from "@/db/schema";
import { requireCurrentUser } from "@/features/auth/current-user";
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
      throw new Error(
        "Project not found or does not belong to active organization.",
      );
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
        throw new Error(
          "Client not found or does not belong to active organization.",
        );
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
        throw new Error(
          "Task not found or does not belong to active organization.",
        );
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
  type?: string;
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
      filters.type
        ? eq(
            deliverables.type,
            filters.type as (typeof deliverables.type.enumValues)[number],
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

/**
 * Returns all creative assets / files attached to a deliverable (optionally filtered to a specific revision).
 */
export async function getDeliverableFiles(
  deliverableId: string,
  revisionId?: string,
) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "deliverables", "read");

  // Validate deliverable exists in tenant
  const [deliverable] = await db
    .select({
      deliverableId: deliverables.deliverableId,
      projectId: deliverables.projectId,
      currentRevisionId: deliverables.currentRevisionId,
    })
    .from(deliverables)
    .where(
      and(
        eq(deliverables.deliverableId, deliverableId),
        eq(deliverables.organizationId, user.organizationId),
        isNull(deliverables.deletedAt),
      ),
    )
    .limit(1);

  if (!deliverable) throw new Error("Deliverable not found.");

  const targetRevisionId = revisionId || deliverable.currentRevisionId;

  return db
    .select({
      mappingId: deliverableFiles.mappingId,
      deliverableId: deliverableFiles.deliverableId,
      revisionId: deliverableFiles.revisionId,
      fileId: deliverableFiles.fileId,
      orderIndex: deliverableFiles.orderIndex,
      createdAt: deliverableFiles.createdAt,
      title: files.title,
      fileType: files.fileType,
      fileStatus: files.status,
      totalSizeBytes: files.totalSizeBytes,
      currentVersionId: files.currentVersionId,
      originalFilename: fileVersions.originalFilename,
      mimeType: fileVersions.mimeType,
      sizeBytes: fileVersions.sizeBytes,
      versionNumber: fileVersions.versionNumber,
      storagePath: fileVersions.storagePath,
    })
    .from(deliverableFiles)
    .innerJoin(files, eq(deliverableFiles.fileId, files.fileId))
    .leftJoin(fileVersions, eq(files.currentVersionId, fileVersions.versionId))
    .where(
      and(
        eq(deliverableFiles.deliverableId, deliverableId),
        eq(deliverableFiles.organizationId, user.organizationId),
        targetRevisionId
          ? eq(deliverableFiles.revisionId, targetRevisionId)
          : undefined,
        isNull(files.deletedAt),
      ),
    )
    .orderBy(deliverableFiles.orderIndex, desc(deliverableFiles.createdAt));
}

/**
 * Links a creative asset / file to a deliverable revision.
 * Strict project isolation: Asset and deliverable must belong to the same project.
 */
export async function linkFileToDeliverable(
  deliverableIdOrPayload:
    string | { deliverableId: string; fileId: string; revisionId?: string },
  fileIdArg?: string,
  revisionIdArg?: string,
) {
  const deliverableId =
    typeof deliverableIdOrPayload === "object"
      ? deliverableIdOrPayload.deliverableId
      : deliverableIdOrPayload;
  const fileId =
    typeof deliverableIdOrPayload === "object"
      ? deliverableIdOrPayload.fileId
      : fileIdArg!;
  const revisionId =
    typeof deliverableIdOrPayload === "object"
      ? deliverableIdOrPayload.revisionId
      : revisionIdArg;

  const user = await requireCurrentUser();
  requirePermission(user.permissions, "deliverables", "update");

  return await db.transaction(async (tx) => {
    // 1. Fetch deliverable and verify tenant
    const [deliverable] = await tx
      .select({
        deliverableId: deliverables.deliverableId,
        projectId: deliverables.projectId,
        currentRevisionId: deliverables.currentRevisionId,
        isLocked: deliverables.isLocked,
      })
      .from(deliverables)
      .where(
        and(
          eq(deliverables.deliverableId, deliverableId),
          eq(deliverables.organizationId, user.organizationId),
          isNull(deliverables.deletedAt),
        ),
      )
      .limit(1);

    if (!deliverable) throw new Error("Deliverable not found.");
    if (deliverable.isLocked) throw new Error("Deliverable is locked.");

    // 2. Fetch file and verify tenant and project isolation!
    const [file] = await tx
      .select({
        fileId: files.fileId,
        projectId: files.projectId,
        title: files.title,
      })
      .from(files)
      .where(
        and(
          eq(files.fileId, fileId),
          eq(files.organizationId, user.organizationId),
          isNull(files.deletedAt),
        ),
      )
      .limit(1);

    if (!file) throw new Error("File not found or access denied.");

    // Strict project isolation: asset and deliverable MUST share the same project
    if (file.projectId !== deliverable.projectId) {
      throw new Error(
        "Cross-project asset assignment is prohibited: asset and deliverable must belong to the same project.",
      );
    }

    let targetRevisionId = revisionId || deliverable.currentRevisionId;
    if (!targetRevisionId) {
      // Find or create revision
      const existingRev = await tx.query.deliverableRevisions.findFirst({
        where: eq(deliverableRevisions.deliverableId, deliverableId),
        orderBy: [desc(deliverableRevisions.versionNumber)],
      });
      if (existingRev) {
        targetRevisionId = existingRev.revisionId;
      } else {
        const [newRev] = await tx
          .insert(deliverableRevisions)
          .values({
            organizationId: user.organizationId,
            projectId: deliverable.projectId,
            deliverableId,
            versionNumber: 1,
            requestedBy: user.userId,
            status: "draft",
          })
          .returning();
        targetRevisionId = newRev.revisionId;
        await tx
          .update(deliverables)
          .set({ currentRevisionId: newRev.revisionId })
          .where(eq(deliverables.deliverableId, deliverableId));
      }
    }

    // Insert into deliverableFiles (conflict tolerant)
    const [linked] = await tx
      .insert(deliverableFiles)
      .values({
        organizationId: user.organizationId,
        projectId: deliverable.projectId,
        deliverableId,
        revisionId: targetRevisionId,
        fileId,
        orderIndex: 0,
      })
      .onConflictDoNothing()
      .returning();

    // Polymorphic bridge into fileRelations
    await tx
      .insert(fileRelations)
      .values({
        organizationId: user.organizationId,
        projectId: deliverable.projectId,
        fileId,
        entityType: "deliverable",
        entityId: deliverableId,
        createdBy: user.userId,
        updatedBy: user.userId,
      })
      .onConflictDoNothing();

    await logDeliverableActivity(
      "asset_linked",
      deliverableId,
      deliverable.projectId,
      user.organizationId,
      { fileId, fileTitle: file.title, revisionId: targetRevisionId },
      tx,
    );

    return (
      linked || {
        success: true,
        deliverableId,
        fileId,
        revisionId: targetRevisionId,
      }
    );
  });
}

/**
 * Unlinks a creative asset / file from a deliverable.
 */
export async function unlinkFileFromDeliverable(
  deliverableIdOrPayload:
    string | { deliverableId: string; fileId: string; revisionId?: string },
  fileIdArg?: string,
  revisionIdArg?: string,
) {
  const deliverableId =
    typeof deliverableIdOrPayload === "object"
      ? deliverableIdOrPayload.deliverableId
      : deliverableIdOrPayload;
  const fileId =
    typeof deliverableIdOrPayload === "object"
      ? deliverableIdOrPayload.fileId
      : fileIdArg!;
  const revisionId =
    typeof deliverableIdOrPayload === "object"
      ? deliverableIdOrPayload.revisionId
      : revisionIdArg;

  const user = await requireCurrentUser();
  requirePermission(user.permissions, "deliverables", "update");

  return await db.transaction(async (tx) => {
    const [deliverable] = await tx
      .select({
        deliverableId: deliverables.deliverableId,
        projectId: deliverables.projectId,
        isLocked: deliverables.isLocked,
      })
      .from(deliverables)
      .where(
        and(
          eq(deliverables.deliverableId, deliverableId),
          eq(deliverables.organizationId, user.organizationId),
          isNull(deliverables.deletedAt),
        ),
      )
      .limit(1);

    if (!deliverable) throw new Error("Deliverable not found.");
    if (deliverable.isLocked) throw new Error("Deliverable is locked.");

    await tx
      .delete(deliverableFiles)
      .where(
        and(
          eq(deliverableFiles.deliverableId, deliverableId),
          eq(deliverableFiles.fileId, fileId),
          revisionId ? eq(deliverableFiles.revisionId, revisionId) : undefined,
          eq(deliverableFiles.organizationId, user.organizationId),
        ),
      );

    await logDeliverableActivity(
      "asset_unlinked",
      deliverableId,
      deliverable.projectId,
      user.organizationId,
      { fileId, revisionId },
      tx,
    );

    return { success: true };
  });
}

/**
 * Archives a deliverable.
 */
export async function archiveDeliverable(deliverableId: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "deliverables", "update");

  return await db.transaction(async (tx) => {
    const [deliverable] = await tx
      .select({
        deliverableId: deliverables.deliverableId,
        projectId: deliverables.projectId,
        status: deliverables.status,
      })
      .from(deliverables)
      .where(
        and(
          eq(deliverables.deliverableId, deliverableId),
          eq(deliverables.organizationId, user.organizationId),
          isNull(deliverables.deletedAt),
        ),
      )
      .limit(1);

    if (!deliverable) throw new Error("Deliverable not found.");

    const [updated] = await tx
      .update(deliverables)
      .set({
        status: "archived",
        updatedAt: new Date(),
        updatedBy: user.userId,
      })
      .where(eq(deliverables.deliverableId, deliverableId))
      .returning();

    await logDeliverableActivity(
      "archived",
      deliverableId,
      deliverable.projectId,
      user.organizationId,
      { previousStatus: deliverable.status },
      tx,
    );

    return updated;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 4G: Client Portal & Approval Chain Server Actions
// ─────────────────────────────────────────────────────────────────────────────

export interface PortalReviewDto {
  shareId: string;
  token: string;
  accessLevel: string;
  project: {
    projectId: string;
    name: string;
    code: string | null;
  };
  deliverable: {
    deliverableId: string;
    title: string;
    description: string | null;
    type: string;
    status: string;
    isLocked: boolean;
    currentRevision: {
      revisionId: string;
      versionNumber: number;
      reason: string | null;
      status: string;
      createdAt: string;
    };
    revisions: {
      revisionId: string;
      versionNumber: number;
      reason: string | null;
      status: string;
      createdAt: string;
    }[];
    files: {
      fileId: string;
      title: string;
      fileType: string;
      totalSizeBytes: number;
      versionNumber: number;
    }[];
  };
  reviewStatus: {
    currentStatus: "pending" | "in_review" | "approved" | "changes_requested";
    canApprove: boolean;
    canRequestChanges: boolean;
    approvedAt?: string | null;
    approvedBy?: string | null;
    notes?: string | null;
  };
  approvalHistory: {
    approvalId: string;
    status: string;
    approverName: string | null;
    approverEmail: string | null;
    notes: string | null;
    createdAt: string;
  }[];
  comments: {
    commentId: string;
    authorName: string;
    content: string;
    createdAt: string;
  }[];
}

/**
 * Portal authorization guard: validates that the share token exists, is active,
 * and has not expired.
 */
async function validateToken(token: string) {
  if (!token || typeof token !== "string" || token.trim().length === 0) {
    return null;
  }

  const [shareLink] = await db
    .select()
    .from(deliverableShareLinks)
    .where(
      and(
        eq(deliverableShareLinks.token, token),
        eq(deliverableShareLinks.isArchived, false),
        isNull(deliverableShareLinks.deletedAt),
      ),
    )
    .limit(1);

  if (!shareLink) return null;
  if (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date()) {
    return null;
  }
  return shareLink;
}

export type PortalReviewResult = {
  valid: boolean;
  error?: string;
  data?: PortalReviewDto;
};

/**
 * Resolves a share token to an explicit, safe Client Portal Review DTO.
 * Strictly projects only client-approved metadata; zero internal leakages.
 */
export async function getPortalReviewData(
  token: string,
): Promise<PortalReviewResult> {
  // 1. Establish external client caller authorization via share token guard
  const shareLink = await validateToken(token);

  if (!shareLink) {
    return {
      valid: false,
      error: "This review link is invalid, expired, or no longer active.",
    };
  }

  // 2. Fetch deliverable within the same organization
  const [deliverable] = await db
    .select()
    .from(deliverables)
    .where(
      and(
        eq(deliverables.deliverableId, shareLink.deliverableId),
        eq(deliverables.organizationId, shareLink.organizationId),
        isNull(deliverables.deletedAt),
      ),
    )
    .limit(1);

  if (!deliverable) {
    return {
      valid: false,
      error: "This deliverable is no longer available.",
    };
  }

  // 3. Fetch project
  const [project] = await db
    .select({
      projectId: projects.projectId,
      name: projects.projectName,
      code: projects.projectCode,
    })
    .from(projects)
    .where(eq(projects.projectId, deliverable.projectId))
    .limit(1);

  // 4. Fetch revisions
  const revs = await db
    .select()
    .from(deliverableRevisions)
    .where(
      and(
        eq(deliverableRevisions.deliverableId, deliverable.deliverableId),
        isNull(deliverableRevisions.deletedAt),
      ),
    )
    .orderBy(desc(deliverableRevisions.versionNumber));

  const targetRevision = revs.find(
    (r) => r.revisionId === shareLink.revisionId,
  ) ||
    revs.find((r) => r.revisionId === deliverable.currentRevisionId) ||
    revs[0] || {
      revisionId: shareLink.revisionId,
      versionNumber: 1,
      reason: null,
      status: "draft",
      createdAt: new Date(),
    };

  // 5. Fetch attached files for target revision
  const attachedFiles = await db
    .select({
      fileId: files.fileId,
      title: files.title,
      fileType: files.fileType,
      totalSizeBytes: files.totalSizeBytes,
      versionNumber: fileVersions.versionNumber,
    })
    .from(deliverableFiles)
    .innerJoin(files, eq(deliverableFiles.fileId, files.fileId))
    .leftJoin(fileVersions, eq(files.currentVersionId, fileVersions.versionId))
    .where(
      and(
        eq(deliverableFiles.deliverableId, deliverable.deliverableId),
        eq(deliverableFiles.revisionId, targetRevision.revisionId),
        isNull(files.deletedAt),
      ),
    );

  // 6. Fetch approvals
  const approvalsList = await db
    .select()
    .from(deliverableApprovals)
    .where(
      and(
        eq(deliverableApprovals.projectId, deliverable.projectId),
        eq(deliverableApprovals.organizationId, shareLink.organizationId),
        isNull(deliverableApprovals.deletedAt),
      ),
    )
    .orderBy(desc(deliverableApprovals.createdAt));

  // 7. Fetch client comments
  const commentsList = await db
    .select()
    .from(deliverableReviewComments)
    .where(
      and(
        eq(deliverableReviewComments.organizationId, shareLink.organizationId),
        eq(deliverableReviewComments.projectId, deliverable.projectId),
        eq(deliverableReviewComments.isInternalOnly, false),
      ),
    )
    .orderBy(desc(deliverableReviewComments.createdAt));

  // Determine review states
  let currentStatus:
    "pending" | "in_review" | "approved" | "changes_requested" = "pending";
  if (deliverable.status === "approved") {
    currentStatus = "approved";
  } else if (deliverable.status === "revision_requested") {
    currentStatus = "changes_requested";
  } else if (
    deliverable.status === "client_review" ||
    deliverable.status === "internal_review"
  ) {
    currentStatus = "in_review";
  }

  const latestApproval = approvalsList[0];
  const canApprove =
    shareLink.accessLevel === "approval_only" &&
    !deliverable.isLocked &&
    deliverable.status !== "approved";
  const canRequestChanges =
    shareLink.accessLevel !== "view_only" && !deliverable.isLocked;

  const dto: PortalReviewDto = {
    shareId: shareLink.shareId,
    token: shareLink.token,
    accessLevel: shareLink.accessLevel,
    project: {
      projectId: project ? project.projectId : deliverable.projectId,
      name: project ? project.name : "Project",
      code: project ? project.code : null,
    },
    deliverable: {
      deliverableId: deliverable.deliverableId,
      title: deliverable.title,
      description: deliverable.description,
      type: deliverable.type,
      status: deliverable.status,
      isLocked: deliverable.isLocked,
      currentRevision: {
        revisionId: targetRevision.revisionId,
        versionNumber: targetRevision.versionNumber,
        reason: targetRevision.reason,
        status: targetRevision.status,
        createdAt: targetRevision.createdAt
          ? new Date(targetRevision.createdAt).toISOString()
          : new Date().toISOString(),
      },
      revisions: revs.map((r) => ({
        revisionId: r.revisionId,
        versionNumber: r.versionNumber,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt
          ? new Date(r.createdAt).toISOString()
          : new Date().toISOString(),
      })),
      files: attachedFiles.map((f) => ({
        fileId: f.fileId,
        title: f.title,
        fileType: f.fileType,
        totalSizeBytes: f.totalSizeBytes,
        versionNumber: f.versionNumber || 1,
      })),
    },
    reviewStatus: {
      currentStatus,
      canApprove,
      canRequestChanges,
      approvedAt: latestApproval
        ? new Date(latestApproval.createdAt).toISOString()
        : null,
      approvedBy: latestApproval
        ? latestApproval.clientApproverSignature
        : null,
      notes: latestApproval ? latestApproval.notes : null,
    },
    approvalHistory: approvalsList.map((a) => ({
      approvalId: a.approvalId,
      status: a.status,
      approverName: a.clientApproverSignature,
      approverEmail: a.clientApproverEmail,
      notes: a.notes,
      createdAt: a.createdAt
        ? new Date(a.createdAt).toISOString()
        : new Date().toISOString(),
    })),
    comments: commentsList.map((c) => ({
      commentId: c.commentId,
      authorName: c.clientAuthorName || "Reviewer",
      content:
        typeof c.content === "object" &&
        c.content !== null &&
        "text" in c.content
          ? (c.content as any).text
          : String(c.content),
      createdAt: c.createdAt
        ? new Date(c.createdAt).toISOString()
        : new Date().toISOString(),
    })),
  };

  return { valid: true, data: dto };
}

/**
 * Submits an external client approval on a specific deliverable revision.
 * Stale review protected: rejects if deliverable is already approved or if revision is outdated.
 */
export async function submitPortalApproval(payload: {
  token: string;
  deliverableId: string;
  revisionId: string;
  reviewerName: string;
  reviewerEmail: string;
  notes?: string;
}) {
  const [shareLink] = await db
    .select()
    .from(deliverableShareLinks)
    .where(
      and(
        eq(deliverableShareLinks.token, payload.token),
        eq(deliverableShareLinks.deliverableId, payload.deliverableId),
        eq(deliverableShareLinks.isArchived, false),
        isNull(deliverableShareLinks.deletedAt),
      ),
    )
    .limit(1);

  if (!shareLink) {
    throw new Error("Invalid or expired review link.");
  }

  if (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date()) {
    throw new Error("This review link has expired.");
  }

  if (shareLink.accessLevel !== "approval_only") {
    throw new Error(
      "You do not have approval permissions for this deliverable.",
    );
  }

  return await db.transaction(async (tx) => {
    const [deliverable] = await tx
      .select()
      .from(deliverables)
      .where(
        and(
          eq(deliverables.deliverableId, payload.deliverableId),
          eq(deliverables.organizationId, shareLink.organizationId),
        ),
      )
      .limit(1);

    if (!deliverable) {
      throw new Error("Deliverable not found.");
    }

    if (deliverable.isLocked || deliverable.status === "approved") {
      throw new Error("This deliverable has already been approved.");
    }

    // Stale review protection: verify target revision is current
    if (
      deliverable.currentRevisionId &&
      deliverable.currentRevisionId !== payload.revisionId
    ) {
      throw new Error(
        "This deliverable has been updated with a newer revision. Please review the latest revision.",
      );
    }

    const [approval] = await tx
      .insert(deliverableApprovals)
      .values({
        organizationId: shareLink.organizationId,
        projectId: deliverable.projectId,
        sessionId: shareLink.shareId,
        clientApproverSignature: payload.reviewerName,
        clientApproverEmail: payload.reviewerEmail,
        status: "approved",
        notes: payload.notes || null,
      })
      .returning();

    await tx
      .update(deliverables)
      .set({
        status: "approved",
        isLocked: true,
        updatedAt: new Date(),
      })
      .where(eq(deliverables.deliverableId, deliverable.deliverableId));

    await tx
      .update(deliverableRevisions)
      .set({
        status: "approved",
        updatedAt: new Date(),
      })
      .where(eq(deliverableRevisions.revisionId, payload.revisionId));

    if (payload.notes) {
      const threadId = await getOrCreateReviewThread(
        tx,
        shareLink.organizationId,
        deliverable.projectId,
        deliverable.deliverableId,
        payload.revisionId,
      );
      await tx.insert(deliverableReviewComments).values({
        organizationId: shareLink.organizationId,
        projectId: deliverable.projectId,
        threadId,
        clientAuthorName: payload.reviewerName,
        content: { text: `[Approved] ${payload.notes}` },
        isInternalOnly: false,
      });
    }

    await logDeliverableActivity(
      "client_approved",
      deliverable.deliverableId,
      deliverable.projectId,
      shareLink.organizationId,
      {
        approverName: payload.reviewerName,
        approverEmail: payload.reviewerEmail,
        revisionId: payload.revisionId,
        approvalId: approval.approvalId,
      },
      tx,
    );

    return { success: true, approvalId: approval.approvalId };
  });
}

/**
 * Ensures a review thread exists for attaching comments.
 */
async function getOrCreateReviewThread(
  tx: typeof db | DbTransaction,
  organizationId: string,
  projectId: string,
  deliverableId: string,
  revisionId: string,
) {
  const [existingThread] = await tx
    .select({ threadId: deliverableReviewThreads.threadId })
    .from(deliverableReviewThreads)
    .where(
      and(
        eq(deliverableReviewThreads.projectId, projectId),
        eq(deliverableReviewThreads.organizationId, organizationId),
      ),
    )
    .limit(1);

  if (existingThread) return existingThread.threadId;

  let [session] = await tx
    .select({ sessionId: deliverableReviewSessions.sessionId })
    .from(deliverableReviewSessions)
    .where(
      and(
        eq(deliverableReviewSessions.deliverableId, deliverableId),
        eq(deliverableReviewSessions.organizationId, organizationId),
      ),
    )
    .limit(1);

  if (!session) {
    [session] = await tx
      .insert(deliverableReviewSessions)
      .values({
        organizationId,
        projectId,
        deliverableId,
        revisionId,
        reviewType: "client_review",
        status: "client_review",
      })
      .returning();
  }

  const [newThread] = await tx
    .insert(deliverableReviewThreads)
    .values({
      organizationId,
      projectId,
      sessionId: session.sessionId,
    })
    .returning();

  return newThread.threadId;
}

/**
 * Submits an external client change request.
 * Creates next revision iteration, unlocks deliverable, and carries forward asset relationships.
 */
export async function submitPortalChangeRequest(payload: {
  token: string;
  deliverableId: string;
  revisionId: string;
  reviewerName: string;
  reviewerEmail: string;
  notes: string;
}) {
  if (!payload.notes || payload.notes.trim().length === 0) {
    throw new Error("Please provide notes describing the requested changes.");
  }

  const [shareLink] = await db
    .select()
    .from(deliverableShareLinks)
    .where(
      and(
        eq(deliverableShareLinks.token, payload.token),
        eq(deliverableShareLinks.deliverableId, payload.deliverableId),
        eq(deliverableShareLinks.isArchived, false),
        isNull(deliverableShareLinks.deletedAt),
      ),
    )
    .limit(1);

  if (!shareLink) {
    throw new Error("Invalid or expired review link.");
  }

  if (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date()) {
    throw new Error("This review link has expired.");
  }

  if (shareLink.accessLevel === "view_only") {
    throw new Error(
      "You do not have permission to request changes for this deliverable.",
    );
  }

  return await db.transaction(async (tx) => {
    const [deliverable] = await tx
      .select()
      .from(deliverables)
      .where(
        and(
          eq(deliverables.deliverableId, payload.deliverableId),
          eq(deliverables.organizationId, shareLink.organizationId),
        ),
      )
      .limit(1);

    if (!deliverable) {
      throw new Error("Deliverable not found.");
    }

    // Stale review protection
    if (
      deliverable.currentRevisionId &&
      deliverable.currentRevisionId !== payload.revisionId
    ) {
      throw new Error(
        "This deliverable has been updated with a newer revision. Please review the latest revision.",
      );
    }

    const [approval] = await tx
      .insert(deliverableApprovals)
      .values({
        organizationId: shareLink.organizationId,
        projectId: deliverable.projectId,
        sessionId: shareLink.shareId,
        clientApproverSignature: payload.reviewerName,
        clientApproverEmail: payload.reviewerEmail,
        status: "rejected",
        notes: payload.notes,
      })
      .returning();

    // Query highest version number
    const [latestRev] = await tx
      .select({ versionNumber: deliverableRevisions.versionNumber })
      .from(deliverableRevisions)
      .where(eq(deliverableRevisions.deliverableId, deliverable.deliverableId))
      .orderBy(desc(deliverableRevisions.versionNumber))
      .limit(1);

    const nextVersion = (latestRev?.versionNumber || 1) + 1;

    // Create next revision
    const [newRevision] = await tx
      .insert(deliverableRevisions)
      .values({
        organizationId: shareLink.organizationId,
        projectId: deliverable.projectId,
        deliverableId: deliverable.deliverableId,
        versionNumber: nextVersion,
        clientRequesterName: payload.reviewerName,
        reason: payload.notes,
        status: "draft",
      })
      .returning();

    // Carry forward files from current revision to new revision
    const existingFiles = await tx
      .select()
      .from(deliverableFiles)
      .where(eq(deliverableFiles.revisionId, payload.revisionId));

    for (const f of existingFiles) {
      await tx.insert(deliverableFiles).values({
        organizationId: f.organizationId,
        projectId: f.projectId,
        deliverableId: f.deliverableId,
        revisionId: newRevision.revisionId,
        fileId: f.fileId,
        orderIndex: f.orderIndex,
      });
    }

    // Update deliverable status and point to new revision
    await tx
      .update(deliverables)
      .set({
        currentRevisionId: newRevision.revisionId,
        status: "revision_requested",
        isLocked: false,
        updatedAt: new Date(),
      })
      .where(eq(deliverables.deliverableId, deliverable.deliverableId));

    // Add comment
    const threadId = await getOrCreateReviewThread(
      tx,
      shareLink.organizationId,
      deliverable.projectId,
      deliverable.deliverableId,
      newRevision.revisionId,
    );

    await tx.insert(deliverableReviewComments).values({
      organizationId: shareLink.organizationId,
      projectId: deliverable.projectId,
      threadId,
      clientAuthorName: payload.reviewerName,
      content: { text: `[Changes Requested] ${payload.notes}` },
      isInternalOnly: false,
    });

    await logDeliverableActivity(
      "client_changes_requested",
      deliverable.deliverableId,
      deliverable.projectId,
      shareLink.organizationId,
      {
        reviewerName: payload.reviewerName,
        reviewerEmail: payload.reviewerEmail,
        newVersionNumber: nextVersion,
        reason: payload.notes,
        approvalId: approval.approvalId,
      },
      tx,
    );

    return { success: true, nextVersionNumber: nextVersion };
  });
}

/**
 * Submits an external client comment or feedback on a deliverable.
 */
export async function submitPortalComment(payload: {
  token: string;
  deliverableId: string;
  reviewerName: string;
  content: string;
}) {
  if (!payload.content || payload.content.trim().length === 0) {
    throw new Error("Comment content cannot be empty.");
  }

  const [shareLink] = await db
    .select()
    .from(deliverableShareLinks)
    .where(
      and(
        eq(deliverableShareLinks.token, payload.token),
        eq(deliverableShareLinks.deliverableId, payload.deliverableId),
        eq(deliverableShareLinks.isArchived, false),
        isNull(deliverableShareLinks.deletedAt),
      ),
    )
    .limit(1);

  if (!shareLink) {
    throw new Error("Invalid or expired review link.");
  }

  if (shareLink.accessLevel === "view_only") {
    throw new Error(
      "You do not have permission to comment on this deliverable.",
    );
  }

  return await db.transaction(async (tx) => {
    const threadId = await getOrCreateReviewThread(
      tx,
      shareLink.organizationId,
      shareLink.projectId,
      shareLink.deliverableId,
      shareLink.revisionId,
    );

    const [comment] = await tx
      .insert(deliverableReviewComments)
      .values({
        organizationId: shareLink.organizationId,
        projectId: shareLink.projectId,
        threadId,
        clientAuthorName: payload.reviewerName || "Reviewer",
        content: { text: payload.content },
        isInternalOnly: false,
      })
      .returning();

    return { success: true, commentId: comment.commentId };
  });
}

/**
 * Generates an authorized 15-minute presigned download URL for a file
 * attached to a shared deliverable revision.
 */
export async function getPortalFileDownloadUrl(payload: {
  token: string;
  fileId: string;
}) {
  const [shareLink] = await db
    .select()
    .from(deliverableShareLinks)
    .where(
      and(
        eq(deliverableShareLinks.token, payload.token),
        eq(deliverableShareLinks.isArchived, false),
        isNull(deliverableShareLinks.deletedAt),
      ),
    )
    .limit(1);

  if (!shareLink) {
    throw new Error("Invalid or expired review link.");
  }

  // Verify file is attached to the deliverable
  const [attached] = await db
    .select()
    .from(deliverableFiles)
    .where(
      and(
        eq(deliverableFiles.deliverableId, shareLink.deliverableId),
        eq(deliverableFiles.fileId, payload.fileId),
      ),
    )
    .limit(1);

  if (!attached) {
    throw new Error("File not found in this shared deliverable.");
  }

  // Fetch file record
  const [file] = await db
    .select()
    .from(files)
    .where(
      and(
        eq(files.fileId, payload.fileId),
        eq(files.organizationId, shareLink.organizationId),
        isNull(files.deletedAt),
      ),
    )
    .limit(1);

  if (!file) throw new Error("File not found.");

  const [version] = await db
    .select()
    .from(fileVersions)
    .where(eq(fileVersions.versionId, file.currentVersionId!))
    .limit(1);

  if (!version) throw new Error("File version not found.");

  const downloadUrl = await storageService.createPreSignedDownloadUrl(
    version.storagePath,
    900,
  );

  if (!downloadUrl) {
    throw new Error("Failed to generate secure download URL.");
  }

  await db
    .update(deliverableShareLinks)
    .set({
      downloadCount: sql`${deliverableShareLinks.downloadCount} + 1`,
    })
    .where(eq(deliverableShareLinks.shareId, shareLink.shareId));

  return {
    downloadUrl,
    filename: version.originalFilename || file.title,
  };
}
