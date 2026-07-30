import type {
  createApprovalCycle as real_createApprovalCycle,
  submitReview as real_submitReview,
  delegateReview as real_delegateReview,
  resolveCondition as real_resolveCondition,
  getPendingApprovalsCount as real_getPendingApprovalsCount,
} from "./real-actions";
import {
  getDemoStore,
  nextDemoId,
  DEMO_USER_ID,
  DEMO_ORG_ID,
} from "@/lib/demo/store";

export async function createApprovalCycle(
  ...args: Parameters<typeof real_createApprovalCycle>
): Promise<Awaited<ReturnType<typeof real_createApprovalCycle>>> {
  const [data] = args;
  const store = getDemoStore();

  const snapshotData = {
    frozenAt: new Date().toISOString(),
    entityId: data.entityId,
    entityType: data.entityType,
  };

  const newCycle = {
    cycleId: nextDemoId(store),
    organizationId: DEMO_ORG_ID,
    entityType: data.entityType,
    entityId: data.entityId,
    workflowId: data.workflowId,
    snapshotData,
    snapshotHash: `mock-hash-${nextDemoId(store)}`,
    status: "pending",
    createdBy: DEMO_USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    updatedBy: DEMO_USER_ID,
    deletedAt: null,
    deletedBy: null,
    isArchived: false,
    currentStageId: null,
    version: 1,
  };

  store.approvalCycles.push(newCycle);

  store.approvalEvents.push({
    eventId: nextDemoId(store),
    cycleId: newCycle.cycleId,
    actorId: DEMO_USER_ID,
    eventType: "cycle_started",
    payload: { note: "Cycle created and entity snapshotted" },
    createdAt: new Date(),
  });

  return newCycle as any;
}

export async function submitReview(
  ...args: Parameters<typeof real_submitReview>
): Promise<Awaited<ReturnType<typeof real_submitReview>>> {
  const [data] = args;
  const store = getDemoStore();

  const reviews = store.reviews;
  const review = reviews.find((r: any) => r.reviewId === data.reviewId);

  if (review) {
    review.status = data.status;
    review.comments = data.comments;
    review.submittedAt = new Date();
  } else {
    reviews.push({
      reviewId: data.reviewId,
      status: data.status,
      comments: data.comments,
      submittedAt: new Date(),
      stageId: nextDemoId(store),
      reviewerId: DEMO_USER_ID,
      cycleId: nextDemoId(store),
    });
  }

  const cycleId = review ? review.cycleId : reviews[reviews.length - 1].cycleId;
  const cycle = store.approvalCycles.find((c: any) => c.cycleId === cycleId);
  if (cycle) {
    cycle.status =
      data.status === "approved" || data.status === "approved_with_conditions"
        ? "approved"
        : data.status;
    cycle.updatedAt = new Date();
  }

  if (data.status === "approved_with_conditions" && data.conditions?.length) {
    for (const cond of data.conditions) {
      store.approvalConditions.push({
        conditionId: nextDemoId(store),
        reviewId: data.reviewId,
        conditionText: cond,
        isResolved: false,
        createdAt: new Date(),
      });
    }
  }

  store.approvalEvents.push({
    eventId: nextDemoId(store),
    cycleId,
    actorId: DEMO_USER_ID,
    eventType: "review_submitted",
    payload: { status: data.status, comments: data.comments },
    createdAt: new Date(),
  });
}

export async function delegateReview(
  ...args: Parameters<typeof real_delegateReview>
): Promise<Awaited<ReturnType<typeof real_delegateReview>>> {
  const [data] = args;
  const store = getDemoStore();

  const reviews = store.reviews;
  const review = reviews.find((r: any) => r.reviewId === data.reviewId);

  let stageId = nextDemoId(store);
  if (review) {
    review.status = "delegated";
    review.comments = data.comments;
    review.submittedAt = new Date();
    stageId = review.stageId;
  }

  reviews.push({
    reviewId: nextDemoId(store),
    stageId,
    reviewerId: data.delegateToUserId,
    externalEmail: data.externalEmail,
    delegatedFromId: DEMO_USER_ID,
    status: "pending",
  });
}

export async function resolveCondition(
  ...args: Parameters<typeof real_resolveCondition>
): Promise<Awaited<ReturnType<typeof real_resolveCondition>>> {
  const [data] = args;
  const store = getDemoStore();

  const condition = store.approvalConditions.find(
    (c: any) => c.conditionId === data.conditionId,
  );

  if (condition) {
    condition.isResolved = true;
    condition.resolvedBy = DEMO_USER_ID;
    condition.resolvedAt = new Date();
  }
}

export async function getPendingApprovalsCount(): Promise<
  Awaited<ReturnType<typeof real_getPendingApprovalsCount>>
> {
  const store = getDemoStore();
  const reviews = store.reviews;
  return reviews.filter(
    (r: any) => r.status === "pending" && r.reviewerId === DEMO_USER_ID,
  ).length;
}
