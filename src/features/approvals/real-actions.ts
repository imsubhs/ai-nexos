"use server";

import { db } from "@/db";
import {
  approvalCycles,
  approvalStages,
  reviews,
  approvalEvents,
  approvalConditions,
} from "@/db/schema/approvals";
import { requireCurrentUser } from "@/features/auth/current-user";
import { requirePermission } from "@/features/permissions";
import { eq, and, count } from "drizzle-orm";
import { z } from "zod";
import { createHash } from "crypto";
import {
  createApprovalCycleSchema,
  submitReviewSchema,
  delegateReviewSchema,
  resolveConditionSchema,
} from "./schemas";
import { ApprovalEngine } from "./engine";
import {
  requireWorkflowInOrganization,
  validateExternalConditionAccess,
  validateExternalReviewAccess,
  validateInternalConditionAccess,
  validateInternalReviewAccess,
  type ApprovalContext,
  type ConditionContext,
} from "./authorization";

/**
 * Approval server actions.
 *
 * Every resource-level decision in this file is delegated to
 * `./authorization`, which is where the review → stage → cycle → organisation
 * walk, the permission check and the single non-oracle refusal live. Nothing
 * here re-derives a tenant from caller input, and nothing mutates before that
 * module has returned.
 */

export async function createApprovalCycle(
  data: z.infer<typeof createApprovalCycleSchema>,
) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "approvals", "create");

  // A caller-supplied foreign key into a tenant-scoped table. The cycle itself
  // is stamped with the caller's organisation below and so cannot be planted in
  // another tenant, but an unchecked workflow id would route it by another
  // organisation's rules.
  if (data.workflowId) {
    await requireWorkflowInOrganization(data.workflowId, user);
  }

  const cycle = await db.transaction(async (tx) => {
    const snapshotData = {
      frozenAt: new Date().toISOString(),
      entityId: data.entityId,
      entityType: data.entityType,
    };

    const snapshotString = JSON.stringify(snapshotData);
    const snapshotHash = createHash("sha256")
      .update(snapshotString)
      .digest("hex");

    const [newCycle] = await tx
      .insert(approvalCycles)
      .values({
        organizationId: user.organizationId,
        entityType: data.entityType,
        entityId: data.entityId,
        workflowId: data.workflowId,
        snapshotData,
        snapshotHash,
        status: "pending",
        createdBy: user.userId,
      })
      .returning();

    await tx.insert(approvalEvents).values({
      cycleId: newCycle.cycleId,
      actorId: user.userId,
      eventType: "cycle_started",
      payload: { note: "Cycle created and entity snapshotted" },
    });

    return newCycle;
  });

  return cycle;
}

/**
 * Submits a review decision.
 *
 * Two callers, two entirely separate authorization mechanisms — an internal
 * user proves who they are with a session, an external reviewer proves it with
 * a signed token. They are never mixed: supplying `externalToken` does not
 * relax the internal path, it selects a path that is checked at least as
 * strictly (see `validateExternalReviewAccess`).
 *
 * Previously the update ran `WHERE review_id = $1` with no organisation
 * predicate, so any authenticated user of any organisation, holding no
 * approvals permission at all, could decide any review whose id they knew.
 */
export async function submitReview(data: z.infer<typeof submitReviewSchema>) {
  let actorId: string | undefined;
  let context: ApprovalContext;

  if (data.externalToken) {
    context = await validateExternalReviewAccess(
      data.reviewId,
      data.externalToken,
    );
    // Left undefined: an external reviewer is not a row in `users`, and
    // `approval_events.actor_id` is a foreign key into it.
    actorId = undefined;
  } else {
    const user = await requireCurrentUser();
    context = await validateInternalReviewAccess(data.reviewId, user, "review");
    actorId = user.userId;
  }

  // A decided review is not re-decidable. Without this, a valid token or an
  // assigned reviewer could overwrite a recorded decision indefinitely.
  if (context.review.status !== "pending") {
    throw new Error("This review has already been submitted.");
  }

  await db.transaction(async (tx) => {
    const [updatedReview] = await tx
      .update(reviews)
      .set({
        status: data.status,
        comments: data.comments,
        submittedAt: new Date(),
      })
      // Re-asserting `status = 'pending'` inside the transaction closes the
      // window between the check above and this write: two concurrent
      // submissions would otherwise both pass the check and both apply.
      .where(
        and(eq(reviews.reviewId, data.reviewId), eq(reviews.status, "pending")),
      )
      .returning();

    if (!updatedReview) {
      throw new Error("This review has already been submitted.");
    }

    if (data.status === "approved_with_conditions" && data.conditions?.length) {
      for (const cond of data.conditions) {
        await tx.insert(approvalConditions).values({
          reviewId: data.reviewId,
          conditionText: cond,
        });
      }
    }

    await tx.insert(approvalEvents).values({
      cycleId: context.stage.cycleId,
      actorId,
      eventType: "review_submitted",
      payload: { status: data.status, comments: data.comments },
    });

    await ApprovalEngine.evaluateCycle(context.stage.cycleId, tx);
  });
}

/**
 * Delegates a pending review to someone else.
 *
 * Delegation is the reviewer's own act, so object-level authority is required:
 * the caller must be the review's current assignee. Without it, any member
 * could delegate any review to themselves and then submit it — a two-step
 * version of the same escalation.
 */
export async function delegateReview(
  data: z.infer<typeof delegateReviewSchema>,
) {
  const user = await requireCurrentUser();
  const context = await validateInternalReviewAccess(
    data.reviewId,
    user,
    "review",
  );

  if (context.review.status !== "pending") {
    throw new Error("Only a pending review can be delegated.");
  }

  // The delegate must be an active member of the same organisation. Otherwise
  // delegation moves a tenant's approval authority outside it.
  const delegateToUserId = data.delegateToUserId;
  if (delegateToUserId) {
    const delegate = await db.query.users.findFirst({
      where: (table, { eq: equals, and: both, isNull }) =>
        both(
          equals(table.userId, delegateToUserId),
          equals(table.organizationId, user.organizationId),
          equals(table.status, "active"),
          isNull(table.deletedAt),
        ),
      columns: { userId: true },
    });
    if (!delegate) {
      throw new Error("That person cannot be assigned this review.");
    }
  }

  await db.transaction(async (tx) => {
    const [review] = await tx
      .update(reviews)
      .set({
        status: "delegated",
        comments: data.comments,
        submittedAt: new Date(),
      })
      .where(
        and(eq(reviews.reviewId, data.reviewId), eq(reviews.status, "pending")),
      )
      .returning();

    if (!review) {
      throw new Error("Only a pending review can be delegated.");
    }

    await tx.insert(reviews).values({
      stageId: review.stageId,
      reviewerId: data.delegateToUserId,
      externalEmail: data.externalEmail,
      delegatedFromId: user.userId,
      status: "pending",
    });

    await tx.insert(approvalEvents).values({
      cycleId: context.stage.cycleId,
      actorId: user.userId,
      eventType: "review_delegated",
      payload: { delegatedTo: data.delegateToUserId || data.externalEmail },
    });
  });
}

/**
 * Marks an approval condition as met.
 *
 * CRIT-1 was here. The old shape was:
 *
 *     if (!data.externalToken) { const user = await requireCurrentUser(); ... }
 *     // ...then update by conditionId, unconditionally
 *
 * so any non-empty `externalToken` skipped authentication, the token was never
 * verified against anything, and the mutation ran on a primary key with no
 * tenant predicate — followed by `evaluateCycle()`, which can carry the cycle
 * to `approved`. That is unauthenticated cross-tenant sign-off.
 *
 * Both branches now resolve and authorise the condition **before** any write,
 * and the external branch reuses the same signed-token mechanism as
 * `/api/approvals/verify`, bound to the condition's own parent review.
 */
export async function resolveCondition(
  data: z.infer<typeof resolveConditionSchema>,
) {
  let actorId: string | undefined;
  let context: ConditionContext;

  if (data.externalToken) {
    context = await validateExternalConditionAccess(
      data.conditionId,
      data.externalToken,
    );
    actorId = undefined;
  } else {
    const user = await requireCurrentUser();
    context = await validateInternalConditionAccess(data.conditionId, user);
    actorId = user.userId;
  }

  // Already met. Re-resolving is a no-op rather than an error so a duplicate
  // click is not a failure, but it must not re-run the engine.
  if (context.condition.isResolved) return;

  await db.transaction(async (tx) => {
    const [condition] = await tx
      .update(approvalConditions)
      .set({
        isResolved: true,
        resolvedBy: actorId,
        resolvedAt: new Date(),
      })
      .where(
        and(
          eq(approvalConditions.conditionId, data.conditionId),
          eq(approvalConditions.isResolved, false),
        ),
      )
      .returning();

    if (!condition) return;

    await ApprovalEngine.evaluateCycle(context.stage.cycleId, tx);
  });
}

export async function getPendingApprovalsCount() {
  const user = await requireCurrentUser();

  const [result] = await db
    .select({ value: count(reviews.reviewId) })
    .from(reviews)
    .innerJoin(approvalStages, eq(reviews.stageId, approvalStages.stageId))
    .innerJoin(
      approvalCycles,
      eq(approvalStages.cycleId, approvalCycles.cycleId),
    )
    .where(
      and(
        eq(reviews.reviewerId, user.userId),
        eq(reviews.status, "pending"),
        eq(approvalCycles.organizationId, user.organizationId),
      ),
    );

  return result?.value ?? 0;
}
