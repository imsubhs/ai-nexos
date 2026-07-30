/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  createRevisionRequest as real_createRevisionRequest,
  createRevision as real_createRevision,
  updateRevisionStatus as real_updateRevisionStatus,
  assignRevision as real_assignRevision,
  mergeRevision as real_mergeRevision,
  rollbackRevision as real_rollbackRevision,
} from "./real-actions";
import {
  getDemoStore,
  nextDemoId,
  DEMO_USER_ID,
  DEMO_ORG_ID,
} from "@/lib/demo/store";
import {
  insertRevisionSchema,
  insertRevisionRequestSchema,
  updateRevisionStatusSchema,
  assignRevisionSchema,
} from "./schemas";
import { validateRevisionTransition } from "./utils/state-machine";

function auditFields() {
  return {
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    deletedAt: null,
    deletedBy: null,
    isArchived: false,
  };
}

function revisionCollections(store: any) {
  store.revisions = store.revisions || [];
  store.revisionRequests = store.revisionRequests || [];
  store.revisionAssignments = store.revisionAssignments || [];
  store.revisionHistory = store.revisionHistory || [];
  store.revisionActivity = store.revisionActivity || [];
  return store;
}

function logRevisionActivity(
  store: any,
  eventType: string,
  revisionId: string,
  projectId: string,
  metadata?: Record<string, unknown>,
) {
  store.revisionActivity.push({
    activityId: nextDemoId(store),
    organizationId: DEMO_ORG_ID,
    projectId,
    revisionId,
    userId: DEMO_USER_ID,
    eventType,
    metadata: metadata ?? null,
    createdAt: new Date(),
  });
}

function findRevision(store: any, revisionId: string) {
  const revision = store.revisions.find(
    (r: any) => r.revisionId === revisionId && r.organizationId === DEMO_ORG_ID,
  );
  if (!revision) throw new Error("Revision not found or access denied.");
  return revision;
}

function nextVersionNumber(store: any, deliverableId: string): number {
  const versions = store.revisions
    .filter((r: any) => r.deliverableId === deliverableId)
    .map((r: any) => r.versionNumber as number);
  return versions.length > 0 ? Math.max(...versions) + 1 : 1;
}

export async function createRevisionRequest(
  ...args: Parameters<typeof real_createRevisionRequest>
): Promise<Awaited<ReturnType<typeof real_createRevisionRequest>>> {
  const [input] = args;
  const store = revisionCollections(getDemoStore());

  const data = insertRevisionRequestSchema.parse(input);

  const newRequest = {
    requestId: nextDemoId(store),
    organizationId: DEMO_ORG_ID,
    projectId: data.projectId,
    deliverableId: data.deliverableId,
    requesterId: DEMO_USER_ID,
    requestDetails: data.requestDetails,
    status: "PENDING",
    ...auditFields(),
  };
  store.revisionRequests.push(newRequest);

  return newRequest as any;
}

export async function createRevision(
  ...args: Parameters<typeof real_createRevision>
): Promise<Awaited<ReturnType<typeof real_createRevision>>> {
  const [input] = args;
  const store = revisionCollections(getDemoStore());

  const data = insertRevisionSchema.parse(input);

  const nextVersion = nextVersionNumber(store, data.deliverableId);

  const newRevision = {
    revisionId: nextDemoId(store),
    ...data,
    organizationId: DEMO_ORG_ID,
    versionNumber: nextVersion,
    status: "CREATED",
    isLocked: false,
    ...auditFields(),
  };
  store.revisions.push(newRevision);

  logRevisionActivity(
    store,
    "REVISION_CREATED",
    newRevision.revisionId,
    newRevision.projectId,
    { versionNumber: nextVersion },
  );

  return newRevision as any;
}

export async function updateRevisionStatus(
  ...args: Parameters<typeof real_updateRevisionStatus>
): Promise<Awaited<ReturnType<typeof real_updateRevisionStatus>>> {
  const [revisionId, input] = args;
  const store = revisionCollections(getDemoStore());

  const data = updateRevisionStatusSchema.parse(input);

  const revision = findRevision(store, revisionId);

  validateRevisionTransition(revision.status, data.status);

  if (revision.isLocked) {
    throw new Error("Revision is locked and cannot be modified.");
  }

  const previousStatus = revision.status;
  const isLockingState =
    data.status === "READY_FOR_APPROVAL" || data.status === "APPROVED";

  revision.status = data.status;
  revision.isLocked = isLockingState ? true : revision.isLocked;
  revision.updatedAt = new Date();
  revision.updatedBy = DEMO_USER_ID;

  store.revisionHistory.push({
    historyId: nextDemoId(store),
    organizationId: DEMO_ORG_ID,
    projectId: revision.projectId,
    revisionId: revision.revisionId,
    previousStatus,
    newStatus: data.status,
    actionBy: DEMO_USER_ID,
    createdAt: new Date(),
  });

  logRevisionActivity(store, "STATUS_CHANGED", revisionId, revision.projectId, {
    from: previousStatus,
    to: data.status,
  });

  return revision as any;
}

export async function assignRevision(
  ...args: Parameters<typeof real_assignRevision>
): Promise<Awaited<ReturnType<typeof real_assignRevision>>> {
  const [revisionId, input] = args;
  const store = revisionCollections(getDemoStore());

  const data = assignRevisionSchema.parse(input);

  const revision = findRevision(store, revisionId);

  const newAssignment = {
    assignmentId: nextDemoId(store),
    organizationId: DEMO_ORG_ID,
    projectId: revision.projectId,
    revisionId,
    userId: data.userId,
    ...auditFields(),
  };
  store.revisionAssignments.push(newAssignment);

  logRevisionActivity(store, "ASSIGNED", revisionId, revision.projectId, {
    assigneeId: data.userId,
  });

  if (revision.status === "CREATED") {
    revision.status = "ASSIGNED";
  }

  return newAssignment as any;
}

export async function mergeRevision(
  ...args: Parameters<typeof real_mergeRevision>
): Promise<Awaited<ReturnType<typeof real_mergeRevision>>> {
  const [revisionId] = args;
  const store = revisionCollections(getDemoStore());

  const revision = findRevision(store, revisionId);

  if (revision.status !== "APPROVED") {
    throw new Error("Only APPROVED revisions can be merged.");
  }

  const activeRevisions = store.revisions.filter(
    (r: any) =>
      r.deliverableId === revision.deliverableId && r.status === "MERGED",
  );
  for (const active of activeRevisions) {
    active.status = "ARCHIVED";
  }

  revision.status = "MERGED";
  revision.updatedAt = new Date();
  revision.updatedBy = DEMO_USER_ID;

  const deliverable = store.deliverables.find(
    (d: any) => d.deliverableId === revision.deliverableId,
  );
  if (deliverable) {
    deliverable.currentRevisionId = revisionId;
    deliverable.updatedAt = new Date();
    deliverable.updatedBy = DEMO_USER_ID;
  }

  logRevisionActivity(store, "MERGED", revisionId, revision.projectId, {});

  return revision as any;
}

export async function rollbackRevision(
  ...args: Parameters<typeof real_rollbackRevision>
): Promise<Awaited<ReturnType<typeof real_rollbackRevision>>> {
  const [targetRevisionId] = args;
  const store = revisionCollections(getDemoStore());

  const target = findRevision(store, targetRevisionId);

  const nextVersion = nextVersionNumber(store, target.deliverableId);

  const rollbackRev = {
    revisionId: nextDemoId(store),
    organizationId: DEMO_ORG_ID,
    projectId: target.projectId,
    deliverableId: target.deliverableId,
    name: `Rollback to v${target.versionNumber}`,
    description: `Automatically created rollback to historical revision v${target.versionNumber}.`,
    versionNumber: nextVersion,
    type: "ROLLBACK",
    status: "CREATED",
    isLocked: false,
    parentRevisionId: target.revisionId,
    ...auditFields(),
  };
  store.revisions.push(rollbackRev);

  logRevisionActivity(
    store,
    "ROLLBACK_INITIATED",
    rollbackRev.revisionId,
    target.projectId,
    { targetRevisionId },
  );

  return rollbackRev as any;
}
