import type {
  createDeliverable as real_createDeliverable,
  startReviewSession as real_startReviewSession,
  approveRevision as real_approveRevision,
  requestRevision as real_requestRevision,
  generateShareLink as real_generateShareLink,
  getDeliverables as real_getDeliverables,
  getDeliverableById as real_getDeliverableById,
  searchDeliverables as real_searchDeliverables,
  DeliverableListFilters,
  getReviewSessions as real_getReviewSessions,
  getDeliverableApprovals as real_getDeliverableApprovals,
  getDeliverableShareLinks as real_getDeliverableShareLinks,
  getDeliverableActivity as real_getDeliverableActivity,
  getDeliverableFiles as real_getDeliverableFiles,
  linkFileToDeliverable as real_linkFileToDeliverable,
  unlinkFileFromDeliverable as real_unlinkFileFromDeliverable,
  archiveDeliverable as real_archiveDeliverable,
} from "./real-actions";
import {
  getDemoStore,
  nextDemoId,
  DEMO_USER_ID,
  DEMO_ORG_ID,
  logDemoActivity,
} from "@/lib/demo/store";
import { revalidatePath } from "next/cache";

export async function createDeliverable(
  ...args: Parameters<typeof real_createDeliverable>
): Promise<Awaited<ReturnType<typeof real_createDeliverable>>> {
  const [data] = args;
  const store = getDemoStore();
  const deliverableId = nextDemoId(store);
  const revisionId = nextDemoId(store);

  const deliverable = {
    deliverableId,
    organizationId: DEMO_ORG_ID,
    projectId: data.projectId,
    clientId: data.clientId ?? null,
    taskId: data.taskId ?? null,
    title: data.title,
    description: data.description ?? null,
    type: data.type,
    status: "draft" as any,
    currentRevisionId: revisionId,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    deletedAt: null,
    deletedBy: null,
    isArchived: false,
    isLocked: false,
    version: 1,
    aiMetadata: null,
  };

  const revision = {
    revisionId,
    organizationId: DEMO_ORG_ID,
    projectId: data.projectId,
    deliverableId,
    versionNumber: 1,
    requestedBy: DEMO_USER_ID,
    reason: null,
    status: "draft" as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    deletedAt: null,
    deletedBy: null,
    isArchived: false,
    version: 1,
    clientRequesterName: null,
    comparisonMetadata: null,
  };

  store.deliverables.push(deliverable);
  store.deliverableRevisions.push(revision);

  logDemoActivity(
    store,
    "deliverables",
    "created",
    "deliverable",
    deliverableId,
    "Created deliverable",
    { version: 1 },
  );
  revalidatePath(`/projects/${data.projectId}/deliverables`);

  return deliverable as any;
}

export async function startReviewSession(
  ...args: Parameters<typeof real_startReviewSession>
): Promise<Awaited<ReturnType<typeof real_startReviewSession>>> {
  const [deliverableId, revisionId, reviewType, deadlineAt] = args;
  const store = getDemoStore();
  const deliverable = store.deliverables.find(
    (d) => d.deliverableId === deliverableId,
  );

  const session = {
    sessionId: nextDemoId(store),
    organizationId: deliverable?.organizationId ?? DEMO_ORG_ID,
    projectId:
      deliverable?.projectId ??
      store.projects[0]?.projectId ??
      nextDemoId(store),
    deliverableId,
    revisionId,
    reviewType,
    status: "preparing" as any,
    deadlineAt: deadlineAt ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    deletedAt: null,
    deletedBy: null,
    isArchived: false,
    version: 1,
    isExpired: false,
    presenceMetadata: null,
  };

  if (deliverable) {
    deliverable.status =
      reviewType === "client_review" ? "client_review" : "internal_review";
  }

  store.deliverableReviewSessions.push(session);

  logDemoActivity(
    store,
    "deliverables",
    "review_session_started",
    "deliverable",
    deliverableId,
    "Review session started",
    { sessionId: session.sessionId, type: reviewType },
  );

  return session as any;
}

export async function approveRevision(
  ...args: Parameters<typeof real_approveRevision>
): Promise<Awaited<ReturnType<typeof real_approveRevision>>> {
  const [deliverableId, sessionId, notes] = args;
  const store = getDemoStore();
  const deliverable = store.deliverables.find(
    (d) => d.deliverableId === deliverableId,
  );

  const approval = {
    approvalId: nextDemoId(store),
    organizationId: deliverable?.organizationId ?? DEMO_ORG_ID,
    projectId:
      deliverable?.projectId ??
      store.projects[0]?.projectId ??
      nextDemoId(store),
    sessionId,
    approverId: DEMO_USER_ID,
    status: "approved" as any,
    notes: notes ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    deletedAt: null,
    deletedBy: null,
    isArchived: false,
    version: 1,
    clientApproverSignature: null,
    clientApproverEmail: null,
  };

  if (deliverable) {
    deliverable.status = "approved";
    deliverable.isLocked = true;
  }

  store.deliverableApprovals.push(approval);

  logDemoActivity(
    store,
    "deliverables",
    "approved",
    "deliverable",
    deliverableId,
    "Revision approved",
    { approvalId: approval.approvalId },
  );

  return approval as any;
}

export async function requestRevision(
  ...args: Parameters<typeof real_requestRevision>
): Promise<Awaited<ReturnType<typeof real_requestRevision>>> {
  const [deliverableId, reason] = args;
  const store = getDemoStore();
  const deliverable = store.deliverables.find(
    (d) => d.deliverableId === deliverableId,
  );
  const existingRevs = store.deliverableRevisions
    .filter((r: any) => r.deliverableId === deliverableId)
    .sort((a: any, b: any) => b.versionNumber - a.versionNumber);
  let nextVersion = 2;
  if (existingRevs.length > 0) {
    nextVersion = existingRevs[0].versionNumber + 1;
  }

  const revision = {
    revisionId: nextDemoId(store),
    organizationId: deliverable?.organizationId ?? DEMO_ORG_ID,
    projectId:
      deliverable?.projectId ??
      store.projects[0]?.projectId ??
      nextDemoId(store),
    deliverableId,
    versionNumber: nextVersion,
    requestedBy: DEMO_USER_ID,
    reason,
    status: "draft" as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    deletedAt: null,
    deletedBy: null,
    isArchived: false,
    version: 1,
    clientRequesterName: null,
    comparisonMetadata: null,
  };

  store.deliverableRevisions.push(revision);

  if (deliverable) {
    deliverable.currentRevisionId = revision.revisionId;
    deliverable.status = "revision_requested";
    deliverable.isLocked = false;
  }

  logDemoActivity(
    store,
    "deliverables",
    "revision_requested",
    "deliverable",
    deliverableId,
    "Revision requested",
    { newVersion: nextVersion, reason },
  );

  return revision as any;
}

export async function generateShareLink(
  ...args: Parameters<typeof real_generateShareLink>
): Promise<Awaited<ReturnType<typeof real_generateShareLink>>> {
  const [
    deliverableId,
    revisionId,
    accessLevel,
    isWatermarkEnabled,
    emailRecipient,
  ] = args;
  const store = getDemoStore();
  const deliverable = store.deliverables.find(
    (d) => d.deliverableId === deliverableId,
  );

  const shareLink = {
    shareId: nextDemoId(store),
    organizationId: deliverable?.organizationId ?? DEMO_ORG_ID,
    projectId:
      deliverable?.projectId ??
      store.projects[0]?.projectId ??
      nextDemoId(store),
    deliverableId,
    revisionId,
    token: `share-demo-${nextDemoId(store).replace(/-/g, "")}`,
    accessLevel,
    isWatermarkEnabled,
    sentViaEmail: !!emailRecipient,
    emailRecipient: emailRecipient ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    deletedAt: null,
    deletedBy: null,
    isArchived: false,
    version: 1,
    expiresAt: null,
    maxDownloads: null,
    downloadCount: 0,
    emailDeliveredAt: null,
  };

  store.deliverableShareLinks.push(shareLink);

  logDemoActivity(
    store,
    "deliverables",
    "share_link_generated",
    "deliverable",
    deliverableId,
    "Share link generated",
    { shareId: shareLink.shareId, accessLevel },
  );

  return shareLink as any;
}

/**
 * PUBLIC READ LAYER (Sprint 11B)
 */

export async function getDeliverables(
  ...args: Parameters<typeof real_getDeliverables>
): Promise<Awaited<ReturnType<typeof real_getDeliverables>>> {
  const [filters = {}, cursorOffset = 0, limit = 50] = args as [
    DeliverableListFilters | undefined,
    number | undefined,
    number | undefined,
  ];
  const store = getDemoStore();

  return store.deliverables
    .filter((d: any) => d.deletedAt == null)
    .filter((d: any) => !filters.projectId || d.projectId === filters.projectId)
    .filter((d: any) => !filters.clientId || d.clientId === filters.clientId)
    .filter((d: any) => !filters.status || d.status === filters.status)
    .filter((d: any) => !filters.type || d.type === filters.type)
    .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(cursorOffset, cursorOffset + limit) as any;
}

export async function getDeliverableById(
  ...args: Parameters<typeof real_getDeliverableById>
): Promise<Awaited<ReturnType<typeof real_getDeliverableById>>> {
  const [deliverableId] = args;
  const store = getDemoStore();

  const deliverable = store.deliverables.find(
    (d: any) => d.deliverableId === deliverableId && d.deletedAt == null,
  );
  if (!deliverable) return undefined as any;

  const revisions = store.deliverableRevisions
    .filter((r: any) => r.deliverableId === deliverableId)
    .sort((a: any, b: any) => b.versionNumber - a.versionNumber);

  return { ...deliverable, revisions } as any;
}

export async function searchDeliverables(
  ...args: Parameters<typeof real_searchDeliverables>
): Promise<Awaited<ReturnType<typeof real_searchDeliverables>>> {
  const [searchTerm, cursorOffset = 0, limit = 50] = args;
  const store = getDemoStore();
  const needle = searchTerm.toLowerCase();

  return store.deliverables
    .filter(
      (d: any) =>
        d.deletedAt == null && d.title?.toLowerCase().includes(needle),
    )
    .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(cursorOffset, cursorOffset + limit) as any;
}

/**
 * SPRINT 12B READS — review sessions, approval history, share links, activity.
 * The write side already persisted all four collections; nothing read them.
 */
export async function getReviewSessions(
  ...args: Parameters<typeof real_getReviewSessions>
): Promise<Awaited<ReturnType<typeof real_getReviewSessions>>> {
  const [deliverableId] = args;
  const store = getDemoStore();

  return store.deliverableReviewSessions
    .filter((s: any) => s.deliverableId === deliverableId)
    .sort(
      (a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime(),
    ) as any;
}

export async function getDeliverableApprovals(
  ...args: Parameters<typeof real_getDeliverableApprovals>
): Promise<Awaited<ReturnType<typeof real_getDeliverableApprovals>>> {
  const [deliverableId] = args;
  const store = getDemoStore();

  const sessions = new Map(
    store.deliverableReviewSessions
      .filter((s: any) => s.deliverableId === deliverableId)
      .map((s: any) => [s.sessionId, s]),
  );

  return store.deliverableApprovals
    .filter((a: any) => sessions.has(a.sessionId))
    .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((approval: any) => ({
      approvalId: approval.approvalId,
      sessionId: approval.sessionId,
      approverId: approval.approverId,
      status: approval.status,
      notes: approval.notes,
      createdAt: approval.createdAt,
      reviewType: (sessions.get(approval.sessionId) as any)?.reviewType ?? null,
    })) as any;
}

export async function getDeliverableShareLinks(
  ...args: Parameters<typeof real_getDeliverableShareLinks>
): Promise<Awaited<ReturnType<typeof real_getDeliverableShareLinks>>> {
  const [deliverableId] = args;
  const store = getDemoStore();

  return store.deliverableShareLinks
    .filter((s: any) => s.deliverableId === deliverableId)
    .sort(
      (a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime(),
    ) as any;
}

export async function getDeliverableActivity(
  ...args: Parameters<typeof real_getDeliverableActivity>
): Promise<Awaited<ReturnType<typeof real_getDeliverableActivity>>> {
  const [deliverableId, limit = 25] = args;
  const store = getDemoStore();

  // Mock writes go through logDemoActivity (activityLogs); the real adapter
  // writes deliverableActivity. Both are the same trail from the user's side.
  return store.activityLogs
    .filter(
      (entry: any) =>
        entry.entityType === "deliverable" && entry.entityId === deliverableId,
    )
    .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit)
    .map((entry: any) => ({
      activityId: entry.activityId,
      eventType: entry.action,
      metadata: entry.metadata,
      createdAt: entry.createdAt,
    })) as any;
}

export async function getDeliverableFiles(
  ...args: Parameters<typeof real_getDeliverableFiles>
): Promise<Awaited<ReturnType<typeof real_getDeliverableFiles>>> {
  const [deliverableId, revisionId] = args;
  const store = getDemoStore();
  store.deliverableFiles = store.deliverableFiles || [];

  const deliverable = store.deliverables.find(
    (d: any) => d.deliverableId === deliverableId,
  );
  if (!deliverable) throw new Error("Deliverable not found.");

  const targetRevisionId = revisionId || deliverable.currentRevisionId;

  const matches = store.deliverableFiles.filter(
    (df: any) =>
      df.deliverableId === deliverableId &&
      (!targetRevisionId || df.revisionId === targetRevisionId),
  );

  return matches.map((df: any) => {
    const file = (store.files || []).find((f: any) => f.fileId === df.fileId) || {
      fileId: df.fileId,
      title: "Demo File",
      fileType: "document",
      status: "ready",
      totalSizeBytes: 1024,
      currentVersionId: null,
    };
    return {
      mappingId: df.mappingId,
      deliverableId: df.deliverableId,
      revisionId: df.revisionId,
      fileId: df.fileId,
      orderIndex: df.orderIndex || 0,
      createdAt: df.createdAt || new Date(),
      title: file.title,
      fileType: file.fileType,
      fileStatus: file.status,
      totalSizeBytes: file.totalSizeBytes,
      currentVersionId: file.currentVersionId,
      originalFilename: file.title,
      mimeType: "application/octet-stream",
      sizeBytes: file.totalSizeBytes || 1024,
      versionNumber: 1,
      storagePath: `demo/${df.fileId}/v1`,
    };
  }) as any;
}

export async function linkFileToDeliverable(
  ...args: Parameters<typeof real_linkFileToDeliverable>
): Promise<Awaited<ReturnType<typeof real_linkFileToDeliverable>>> {
  const deliverableId = typeof args[0] === "object" && args[0] !== null ? (args[0] as any).deliverableId : args[0];
  const fileId = typeof args[0] === "object" && args[0] !== null ? (args[0] as any).fileId : args[1];
  const revisionId = typeof args[0] === "object" && args[0] !== null ? (args[0] as any).revisionId : args[2];
  const store = getDemoStore();
  store.deliverableFiles = store.deliverableFiles || [];

  const deliverable = store.deliverables.find(
    (d: any) => d.deliverableId === deliverableId,
  );
  if (!deliverable) throw new Error("Deliverable not found.");

  const file = (store.files || []).find((f: any) => f.fileId === fileId);
  if (!file) throw new Error("File not found or access denied.");

  if (file.projectId !== deliverable.projectId) {
    throw new Error(
      "Cross-project asset assignment is prohibited: asset and deliverable must belong to the same project.",
    );
  }

  const targetRevisionId = revisionId || deliverable.currentRevisionId || nextDemoId(store);

  const existing = store.deliverableFiles.find(
    (df: any) =>
      df.deliverableId === deliverableId &&
      df.fileId === fileId &&
      df.revisionId === targetRevisionId,
  );

  if (!existing) {
    const item = {
      mappingId: nextDemoId(store),
      organizationId: deliverable.organizationId,
      projectId: deliverable.projectId,
      deliverableId,
      revisionId: targetRevisionId,
      fileId,
      orderIndex: store.deliverableFiles.length,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: DEMO_USER_ID,
      updatedBy: DEMO_USER_ID,
      deletedAt: null,
      deletedBy: null,
      isArchived: false,
      version: 1,
    };
    store.deliverableFiles.push(item);
  }

  logDemoActivity(
    store,
    "deliverables",
    "asset_linked",
    "deliverable",
    deliverableId,
    `Linked asset ${file.title}`,
    deliverable.projectId,
  );

  return { success: true, deliverableId, fileId, revisionId: targetRevisionId } as any;
}

export async function unlinkFileFromDeliverable(
  ...args: Parameters<typeof real_unlinkFileFromDeliverable>
): Promise<Awaited<ReturnType<typeof real_unlinkFileFromDeliverable>>> {
  const deliverableId = typeof args[0] === "object" && args[0] !== null ? (args[0] as any).deliverableId : args[0];
  const fileId = typeof args[0] === "object" && args[0] !== null ? (args[0] as any).fileId : args[1];
  const revisionId = typeof args[0] === "object" && args[0] !== null ? (args[0] as any).revisionId : args[2];
  const store = getDemoStore();
  store.deliverableFiles = store.deliverableFiles || [];

  store.deliverableFiles = store.deliverableFiles.filter(
    (df: any) =>
      !(
        df.deliverableId === deliverableId &&
        df.fileId === fileId &&
        (!revisionId || df.revisionId === revisionId)
      ),
  );

  logDemoActivity(
    store,
    "deliverables",
    "asset_unlinked",
    "deliverable",
    deliverableId,
    `Unlinked asset ${fileId}`,
  );

  return { success: true } as any;
}

export async function archiveDeliverable(
  ...args: Parameters<typeof real_archiveDeliverable>
): Promise<Awaited<ReturnType<typeof real_archiveDeliverable>>> {
  const [deliverableId] = args;
  const store = getDemoStore();
  const deliverable = store.deliverables.find(
    (d: any) => d.deliverableId === deliverableId,
  );
  if (!deliverable) throw new Error("Deliverable not found.");

  deliverable.status = "archived";
  deliverable.updatedAt = new Date();

  logDemoActivity(
    store,
    "deliverables",
    "archived",
    "deliverable",
    deliverableId,
    `Archived ${deliverable.title}`,
    deliverable.projectId,
  );

  return deliverable as any;
}

