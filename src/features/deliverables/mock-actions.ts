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
  getPortalReviewData as real_getPortalReviewData,
  submitPortalApproval as real_submitPortalApproval,
  submitPortalChangeRequest as real_submitPortalChangeRequest,
  submitPortalComment as real_submitPortalComment,
  getPortalFileDownloadUrl as real_getPortalFileDownloadUrl,
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
    const file = (store.files || []).find(
      (f: any) => f.fileId === df.fileId,
    ) || {
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
  const deliverableId =
    typeof args[0] === "object" && args[0] !== null
      ? (args[0] as any).deliverableId
      : args[0];
  const fileId =
    typeof args[0] === "object" && args[0] !== null
      ? (args[0] as any).fileId
      : args[1];
  const revisionId =
    typeof args[0] === "object" && args[0] !== null
      ? (args[0] as any).revisionId
      : args[2];
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

  const targetRevisionId =
    revisionId || deliverable.currentRevisionId || nextDemoId(store);

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

  return {
    success: true,
    deliverableId,
    fileId,
    revisionId: targetRevisionId,
  } as any;
}

export async function unlinkFileFromDeliverable(
  ...args: Parameters<typeof real_unlinkFileFromDeliverable>
): Promise<Awaited<ReturnType<typeof real_unlinkFileFromDeliverable>>> {
  const deliverableId =
    typeof args[0] === "object" && args[0] !== null
      ? (args[0] as any).deliverableId
      : args[0];
  const fileId =
    typeof args[0] === "object" && args[0] !== null
      ? (args[0] as any).fileId
      : args[1];
  const revisionId =
    typeof args[0] === "object" && args[0] !== null
      ? (args[0] as any).revisionId
      : args[2];
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

export async function getPortalReviewData(
  ...args: Parameters<typeof real_getPortalReviewData>
): Promise<Awaited<ReturnType<typeof real_getPortalReviewData>>> {
  const [token] = args;
  const store = getDemoStore();
  if (!token || typeof token !== "string" || token.trim().length === 0) {
    return {
      valid: false,
      error: "This review link is invalid, expired, or no longer active.",
    };
  }

  const shareLink = (store.deliverableShareLinks || []).find(
    (sl: any) => sl.token === token && !sl.isArchived && !sl.deletedAt,
  );

  if (!shareLink) {
    return {
      valid: false,
      error: "This review link is invalid, expired, or no longer active.",
    };
  }

  if (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date()) {
    return {
      valid: false,
      error: "This review link has expired.",
    };
  }

  const deliverable = (store.deliverables || []).find(
    (d: any) =>
      d.deliverableId === shareLink.deliverableId &&
      d.organizationId === shareLink.organizationId &&
      !d.deletedAt,
  );

  if (!deliverable) {
    return {
      valid: false,
      error: "This deliverable is no longer available.",
    };
  }

  const project = (store.projects || []).find(
    (p: any) => p.projectId === deliverable.projectId,
  );

  const revs = (store.deliverableRevisions || [])
    .filter(
      (r: any) => r.deliverableId === deliverable.deliverableId && !r.deletedAt,
    )
    .sort((a: any, b: any) => b.versionNumber - a.versionNumber);

  const targetRevision = revs.find(
    (r: any) => r.revisionId === shareLink.revisionId,
  ) ||
    revs.find((r: any) => r.revisionId === deliverable.currentRevisionId) ||
    revs[0] || {
      revisionId: shareLink.revisionId,
      versionNumber: 1,
      reason: null,
      status: "draft",
      createdAt: new Date(),
    };

  const attached = (store.deliverableFiles || []).filter(
    (df: any) =>
      df.deliverableId === deliverable.deliverableId &&
      df.revisionId === targetRevision.revisionId,
  );

  const attachedFiles = attached.map((df: any) => {
    const file = (store.files || []).find((f: any) => f.fileId === df.fileId);
    return {
      fileId: df.fileId,
      title: file?.title || "Asset",
      fileType: file?.fileType || "document",
      totalSizeBytes: file?.totalSizeBytes || 1024,
      versionNumber: 1,
    };
  });

  const approvalsList = (store.deliverableApprovals || [])
    .filter((a: any) => a.projectId === deliverable.projectId)
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  const commentsList = (store.deliverableReviewComments || [])
    .filter(
      (c: any) => c.projectId === deliverable.projectId && !c.isInternalOnly,
    )
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  let currentStatus:
    "pending" | "in_review" | "approved" | "changes_requested" = "pending";
  if (deliverable.status === "approved") {
    currentStatus = "approved";
  } else if (deliverable.status === "revision_requested") {
    currentStatus = "changes_requested";
  } else if (
    deliverable.status === "in_review" ||
    deliverable.status === "client_review"
  ) {
    currentStatus = "in_review";
  }

  const latestApproval = approvalsList[0];
  const canApprove =
    (shareLink.accessLevel === "approver" ||
      shareLink.accessLevel === "full_access") &&
    !deliverable.isLocked &&
    deliverable.status !== "approved";
  const canRequestChanges =
    shareLink.accessLevel !== "view_only" && !deliverable.isLocked;

  const dto: any = {
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
      revisions: revs.map((r: any) => ({
        revisionId: r.revisionId,
        versionNumber: r.versionNumber,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt
          ? new Date(r.createdAt).toISOString()
          : new Date().toISOString(),
      })),
      files: attachedFiles,
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
    approvalHistory: approvalsList.map((a: any) => ({
      approvalId: a.approvalId,
      status: a.status,
      approverName: a.clientApproverSignature,
      approverEmail: a.clientApproverEmail,
      notes: a.notes,
      createdAt: a.createdAt
        ? new Date(a.createdAt).toISOString()
        : new Date().toISOString(),
    })),
    comments: commentsList.map((c: any) => ({
      commentId: c.commentId,
      authorName: c.clientAuthorName || "Reviewer",
      content:
        typeof c.content === "object" &&
        c.content !== null &&
        "text" in c.content
          ? c.content.text
          : String(c.content),
      createdAt: c.createdAt
        ? new Date(c.createdAt).toISOString()
        : new Date().toISOString(),
    })),
  };

  return { valid: true, data: dto };
}

export async function submitPortalApproval(
  ...args: Parameters<typeof real_submitPortalApproval>
): Promise<Awaited<ReturnType<typeof real_submitPortalApproval>>> {
  const [payload] = args;
  const store = getDemoStore();
  const shareLink = (store.deliverableShareLinks || []).find(
    (sl: any) =>
      sl.token === payload.token &&
      sl.deliverableId === payload.deliverableId &&
      !sl.isArchived &&
      !sl.deletedAt,
  );

  if (!shareLink) {
    throw new Error("Invalid or expired review link.");
  }

  if (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date()) {
    throw new Error("This review link has expired.");
  }

  if (
    shareLink.accessLevel === "view_only" ||
    shareLink.accessLevel === "comment_only"
  ) {
    throw new Error(
      "You do not have approval permissions for this deliverable.",
    );
  }

  const deliverable = (store.deliverables || []).find(
    (d: any) => d.deliverableId === payload.deliverableId,
  );

  if (!deliverable) {
    throw new Error("Deliverable not found.");
  }

  if (deliverable.isLocked || deliverable.status === "approved") {
    throw new Error("This deliverable has already been approved.");
  }

  if (
    deliverable.currentRevisionId &&
    deliverable.currentRevisionId !== payload.revisionId
  ) {
    throw new Error(
      "This deliverable has been updated with a newer revision. Please review the latest revision.",
    );
  }

  const approvalId = nextDemoId(store);
  const approval = {
    approvalId,
    organizationId: shareLink.organizationId,
    projectId: deliverable.projectId,
    sessionId: shareLink.shareId,
    clientApproverSignature: payload.reviewerName,
    clientApproverEmail: payload.reviewerEmail,
    status: "approved",
    notes: payload.notes || null,
    createdAt: new Date(),
  };

  store.deliverableApprovals = store.deliverableApprovals || [];
  store.deliverableApprovals.push(approval);

  deliverable.status = "approved";
  deliverable.isLocked = true;
  deliverable.updatedAt = new Date();

  const rev = (store.deliverableRevisions || []).find(
    (r: any) => r.revisionId === payload.revisionId,
  );
  if (rev) {
    rev.status = "approved";
    rev.updatedAt = new Date();
  }

  if (payload.notes) {
    store.deliverableReviewComments = store.deliverableReviewComments || [];
    store.deliverableReviewComments.push({
      commentId: nextDemoId(store),
      organizationId: shareLink.organizationId,
      projectId: deliverable.projectId,
      clientAuthorName: payload.reviewerName,
      content: { text: `[Approved] ${payload.notes}` },
      isInternalOnly: false,
      createdAt: new Date(),
    });
  }

  logDemoActivity(
    store,
    "deliverables",
    "client_approved",
    "deliverable",
    deliverable.deliverableId,
    `Client approved: ${payload.reviewerName}`,
    deliverable.projectId,
  );

  return { success: true, approvalId };
}

export async function submitPortalChangeRequest(
  ...args: Parameters<typeof real_submitPortalChangeRequest>
): Promise<Awaited<ReturnType<typeof real_submitPortalChangeRequest>>> {
  const [payload] = args;
  if (!payload.notes || payload.notes.trim().length === 0) {
    throw new Error("Please provide notes describing the requested changes.");
  }

  const store = getDemoStore();
  const shareLink = (store.deliverableShareLinks || []).find(
    (sl: any) =>
      sl.token === payload.token &&
      sl.deliverableId === payload.deliverableId &&
      !sl.isArchived &&
      !sl.deletedAt,
  );

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

  const deliverable = (store.deliverables || []).find(
    (d: any) => d.deliverableId === payload.deliverableId,
  );

  if (!deliverable) {
    throw new Error("Deliverable not found.");
  }

  if (
    deliverable.currentRevisionId &&
    deliverable.currentRevisionId !== payload.revisionId
  ) {
    throw new Error(
      "This deliverable has been updated with a newer revision. Please review the latest revision.",
    );
  }

  const approvalId = nextDemoId(store);
  const approval = {
    approvalId,
    organizationId: shareLink.organizationId,
    projectId: deliverable.projectId,
    sessionId: shareLink.shareId,
    clientApproverSignature: payload.reviewerName,
    clientApproverEmail: payload.reviewerEmail,
    status: "rejected",
    notes: payload.notes,
    createdAt: new Date(),
  };

  store.deliverableApprovals = store.deliverableApprovals || [];
  store.deliverableApprovals.push(approval);

  const existingRevs = (store.deliverableRevisions || [])
    .filter((r: any) => r.deliverableId === deliverable.deliverableId)
    .sort((a: any, b: any) => b.versionNumber - a.versionNumber);

  const nextVersion = (existingRevs[0]?.versionNumber || 1) + 1;
  const newRevisionId = nextDemoId(store);

  const newRevision = {
    revisionId: newRevisionId,
    organizationId: shareLink.organizationId,
    projectId: deliverable.projectId,
    deliverableId: deliverable.deliverableId,
    versionNumber: nextVersion,
    clientRequesterName: payload.reviewerName,
    reason: payload.notes,
    status: "draft" as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  store.deliverableRevisions = store.deliverableRevisions || [];
  store.deliverableRevisions.push(newRevision);

  // Carry forward files
  const existingFiles = (store.deliverableFiles || []).filter(
    (df: any) => df.revisionId === payload.revisionId,
  );

  store.deliverableFiles = store.deliverableFiles || [];
  for (const f of existingFiles) {
    store.deliverableFiles.push({
      mappingId: nextDemoId(store),
      organizationId: f.organizationId,
      projectId: f.projectId,
      deliverableId: f.deliverableId,
      revisionId: newRevision.revisionId,
      fileId: f.fileId,
      orderIndex: f.orderIndex,
      createdAt: new Date(),
    });
  }

  deliverable.currentRevisionId = newRevision.revisionId;
  deliverable.status = "revision_requested";
  deliverable.isLocked = false;
  deliverable.updatedAt = new Date();

  store.deliverableReviewComments = store.deliverableReviewComments || [];
  store.deliverableReviewComments.push({
    commentId: nextDemoId(store),
    organizationId: shareLink.organizationId,
    projectId: deliverable.projectId,
    clientAuthorName: payload.reviewerName,
    content: { text: `[Changes Requested] ${payload.notes}` },
    isInternalOnly: false,
    createdAt: new Date(),
  });

  logDemoActivity(
    store,
    "deliverables",
    "client_changes_requested",
    "deliverable",
    deliverable.deliverableId,
    `Client requested changes (v${nextVersion}): ${payload.notes}`,
    deliverable.projectId,
  );

  return { success: true, nextVersionNumber: nextVersion };
}

export async function submitPortalComment(
  ...args: Parameters<typeof real_submitPortalComment>
): Promise<Awaited<ReturnType<typeof real_submitPortalComment>>> {
  const [payload] = args;
  if (!payload.content || payload.content.trim().length === 0) {
    throw new Error("Comment content cannot be empty.");
  }

  const store = getDemoStore();
  const shareLink = (store.deliverableShareLinks || []).find(
    (sl: any) =>
      sl.token === payload.token &&
      sl.deliverableId === payload.deliverableId &&
      !sl.isArchived &&
      !sl.deletedAt,
  );

  if (!shareLink) {
    throw new Error("Invalid or expired review link.");
  }

  if (shareLink.accessLevel === "view_only") {
    throw new Error(
      "You do not have permission to comment on this deliverable.",
    );
  }

  const commentId = nextDemoId(store);
  store.deliverableReviewComments = store.deliverableReviewComments || [];
  store.deliverableReviewComments.push({
    commentId,
    organizationId: shareLink.organizationId,
    projectId: shareLink.projectId,
    clientAuthorName: payload.reviewerName || "Reviewer",
    content: { text: payload.content },
    isInternalOnly: false,
    createdAt: new Date(),
  });

  return { success: true, commentId };
}

export async function getPortalFileDownloadUrl(
  ...args: Parameters<typeof real_getPortalFileDownloadUrl>
): Promise<Awaited<ReturnType<typeof real_getPortalFileDownloadUrl>>> {
  const [payload] = args;
  const store = getDemoStore();
  const shareLink = (store.deliverableShareLinks || []).find(
    (sl: any) => sl.token === payload.token && !sl.isArchived && !sl.deletedAt,
  );

  if (!shareLink) {
    throw new Error("Invalid or expired review link.");
  }

  const attached = (store.deliverableFiles || []).find(
    (df: any) =>
      df.deliverableId === shareLink.deliverableId &&
      df.fileId === payload.fileId,
  );

  if (!attached) {
    throw new Error("File not found in this shared deliverable.");
  }

  const file = (store.files || []).find(
    (f: any) => f.fileId === payload.fileId && !f.deletedAt,
  );

  return {
    downloadUrl: `https://demo-storage.local/${payload.fileId}/download`,
    filename: file?.title || "downloaded-asset",
  };
}
