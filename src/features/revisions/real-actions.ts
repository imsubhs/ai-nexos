"use server";

import { db } from "@/db";
import {
  revisions,
  revisionRequests,
  revisionAssignments,
  revisionHistory,
  revisionActivity,
} from "@/db/schema/revisions";
import { deliverables } from "@/db/schema/deliverables";
import { projectMembers } from "@/db/schema/projects";
import { CurrentUser, requireCurrentUser } from "@/features/auth/current-user";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  insertRevisionSchema,
  insertRevisionRequestSchema,
  updateRevisionStatusSchema,
  assignRevisionSchema,
} from "./schemas";
import { validateRevisionTransition } from "./utils/state-machine";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Automatically log structured activity events for a revision.
 */
async function logRevisionActivity(
  eventType: string,
  revisionId: string,
  projectId: string,
  organizationId: string,
  userId: string,
  metadata?: Record<string, unknown>,
  tx: typeof db | DbTransaction = db,
) {
  await tx.insert(revisionActivity).values({
    organizationId,
    projectId,
    revisionId,
    userId,
    eventType,
    metadata,
  });
}

/**
 * Validates access explicitly by checking organization and project matching.
 */
async function validateRevisionAccess(
  revisionId: string,
  user: CurrentUser,
  tx: typeof db | DbTransaction = db,
) {
  const revision = await tx.query.revisions.findFirst({
    where: and(
      eq(revisions.revisionId, revisionId),
      eq(revisions.organizationId, user.organizationId),
    ),
  });

  if (!revision) throw new Error("Revision not found or access denied.");

  if (user.roleKey !== "admin" && user.roleKey !== "owner") {
    const member = await tx.query.projectMembers.findFirst({
      where: and(
        eq(projectMembers.projectId, revision.projectId),
        eq(projectMembers.userId, user.userId),
      ),
    });
    if (!member) {
      throw new Error("Access denied: You are not a member of this project.");
    }
  }

  return revision;
}

export async function createRevisionRequest(
  data: z.infer<typeof insertRevisionRequestSchema>,
) {
  const user = await requireCurrentUser();

  const request = await db.transaction(async (tx) => {
    const [newRequest] = await tx
      .insert(revisionRequests)
      .values({
        organizationId: user.organizationId,
        projectId: data.projectId,
        deliverableId: data.deliverableId,
        requesterId: user.userId,
        requestDetails: data.requestDetails,
        createdBy: user.userId,
        updatedBy: user.userId,
      })
      .returning();

    return newRequest;
  });

  revalidatePath(`/projects/${data.projectId}/deliverables`);
  return request;
}

export async function createRevision(
  data: z.infer<typeof insertRevisionSchema>,
) {
  const user = await requireCurrentUser();

  const revision = await db.transaction(async (tx) => {
    // Calculate next version number
    const existingRevisions = await tx.query.revisions.findMany({
      where: eq(revisions.deliverableId, data.deliverableId),
      columns: { versionNumber: true },
      orderBy: (r, { desc }) => [desc(r.versionNumber)],
      limit: 1,
    });
    const nextVersion =
      existingRevisions.length > 0 ? existingRevisions[0].versionNumber + 1 : 1;

    const [newRevision] = await tx
      .insert(revisions)
      .values({
        ...data,
        organizationId: user.organizationId,
        versionNumber: nextVersion,
        createdBy: user.userId,
        updatedBy: user.userId,
      })
      .returning();

    await logRevisionActivity(
      "REVISION_CREATED",
      newRevision.revisionId,
      newRevision.projectId,
      user.organizationId,
      user.userId,
      { versionNumber: nextVersion },
      tx,
    );

    return newRevision;
  });

  revalidatePath(`/projects/${data.projectId}/deliverables`);
  return revision;
}

export async function updateRevisionStatus(
  revisionId: string,
  data: z.infer<typeof updateRevisionStatusSchema>,
) {
  const user = await requireCurrentUser();

  const updatedRevision = await db.transaction(async (tx) => {
    const existing = await validateRevisionAccess(revisionId, user, tx);

    validateRevisionTransition(existing.status, data.status);

    if (existing.isLocked) {
      throw new Error("Revision is locked and cannot be modified.");
    }

    const isLockingState =
      data.status === "READY_FOR_APPROVAL" || data.status === "APPROVED";

    const [revision] = await tx
      .update(revisions)
      .set({
        status: data.status,
        isLocked: isLockingState ? true : existing.isLocked,
        updatedAt: new Date(),
        updatedBy: user.userId,
      })
      .where(eq(revisions.revisionId, revisionId))
      .returning();

    await tx.insert(revisionHistory).values({
      organizationId: user.organizationId,
      projectId: revision.projectId,
      revisionId: revision.revisionId,
      previousStatus: existing.status,
      newStatus: data.status,
      actionBy: user.userId,
    });

    await logRevisionActivity(
      "STATUS_CHANGED",
      revisionId,
      revision.projectId,
      user.organizationId,
      user.userId,
      { from: existing.status, to: data.status },
      tx,
    );

    return revision;
  });

  revalidatePath(`/projects/${updatedRevision.projectId}/deliverables`);
  return updatedRevision;
}

export async function assignRevision(
  revisionId: string,
  data: z.infer<typeof assignRevisionSchema>,
) {
  const user = await requireCurrentUser();

  const assignment = await db.transaction(async (tx) => {
    const existing = await validateRevisionAccess(revisionId, user, tx);

    const [newAssignment] = await tx
      .insert(revisionAssignments)
      .values({
        organizationId: user.organizationId,
        projectId: existing.projectId,
        revisionId: revisionId,
        userId: data.userId,
        createdBy: user.userId,
        updatedBy: user.userId,
      })
      .returning();

    await logRevisionActivity(
      "ASSIGNED",
      revisionId,
      existing.projectId,
      user.organizationId,
      user.userId,
      { assigneeId: data.userId },
      tx,
    );

    // Auto transition if in CREATED state
    if (existing.status === "CREATED") {
      await tx
        .update(revisions)
        .set({ status: "ASSIGNED" })
        .where(eq(revisions.revisionId, revisionId));
    }

    return newAssignment;
  });

  return assignment;
}

export async function mergeRevision(revisionId: string) {
  const user = await requireCurrentUser();

  const merged = await db.transaction(async (tx) => {
    const revision = await validateRevisionAccess(revisionId, user, tx);

    if (revision.status !== "APPROVED") {
      throw new Error("Only APPROVED revisions can be merged.");
    }

    // Mark previous active as ARCHIVED if applicable
    const activeRevisions = await tx.query.revisions.findMany({
      where: and(
        eq(revisions.deliverableId, revision.deliverableId),
        eq(revisions.status, "MERGED"), // Assuming MERGED is the active deliverable state
      ),
    });

    for (const active of activeRevisions) {
      await tx
        .update(revisions)
        .set({ status: "ARCHIVED" })
        .where(eq(revisions.revisionId, active.revisionId));
    }

    const [mergedRevision] = await tx
      .update(revisions)
      .set({
        status: "MERGED",
        updatedAt: new Date(),
        updatedBy: user.userId,
      })
      .where(eq(revisions.revisionId, revisionId))
      .returning();

    // Point the deliverable to this revision
    await tx
      .update(deliverables)
      .set({
        currentRevisionId: revisionId,
        updatedAt: new Date(),
        updatedBy: user.userId,
      })
      .where(eq(deliverables.deliverableId, revision.deliverableId));

    await logRevisionActivity(
      "MERGED",
      revisionId,
      revision.projectId,
      user.organizationId,
      user.userId,
      {},
      tx,
    );

    return mergedRevision;
  });

  revalidatePath(`/projects/${merged.projectId}/deliverables`);
  return merged;
}

export async function rollbackRevision(targetRevisionId: string) {
  const user = await requireCurrentUser();

  const newRollbackRevision = await db.transaction(async (tx) => {
    const target = await validateRevisionAccess(targetRevisionId, user, tx);

    // Calculate next version number
    const existingRevisions = await tx.query.revisions.findMany({
      where: eq(revisions.deliverableId, target.deliverableId),
      columns: { versionNumber: true },
      orderBy: (r, { desc }) => [desc(r.versionNumber)],
      limit: 1,
    });
    const nextVersion =
      existingRevisions.length > 0 ? existingRevisions[0].versionNumber + 1 : 1;

    const [rollbackRev] = await tx
      .insert(revisions)
      .values({
        organizationId: user.organizationId,
        projectId: target.projectId,
        deliverableId: target.deliverableId,
        name: `Rollback to v${target.versionNumber}`,
        description: `Automatically created rollback to historical revision v${target.versionNumber}.`,
        versionNumber: nextVersion,
        type: "ROLLBACK",
        status: "CREATED",
        parentRevisionId: target.revisionId,
        createdBy: user.userId,
        updatedBy: user.userId,
      })
      .returning();

    await logRevisionActivity(
      "ROLLBACK_INITIATED",
      rollbackRev.revisionId,
      target.projectId,
      user.organizationId,
      user.userId,
      { targetRevisionId },
      tx,
    );

    return rollbackRev;
  });

  revalidatePath(`/projects/${newRollbackRevision.projectId}/deliverables`);
  return newRollbackRevision;
}
