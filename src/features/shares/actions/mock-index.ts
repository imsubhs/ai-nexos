/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  createShareSessionAction as real_createShareSessionAction,
  resolveExternalIdentityAction as real_resolveExternalIdentityAction,
  submitExternalCommentAction as real_submitExternalCommentAction,
  submitExternalAnnotationAction as real_submitExternalAnnotationAction,
  submitExternalApprovalAction as real_submitExternalApprovalAction,
  requestShareMeetingAction as real_requestShareMeetingAction,
} from "./real-index";
import { getDemoStore, nextDemoId } from "@/lib/demo/store";

const SHARE_EXPIRY_DAYS = 14;

function shareCollections(store: any) {
  store.shareSessions = store.shareSessions || [];
  store.shareSessionItems = store.shareSessionItems || [];
  store.externalIdentities = store.externalIdentities || [];
  store.shareComments = store.shareComments || [];
  store.shareAnnotations = store.shareAnnotations || [];
  store.shareEvents = store.shareEvents || [];
  return store;
}

/** Deterministic, realistic-looking share token derived from the store's id sequence. */
function nextShareToken(store: any): string {
  return `shr_${nextDemoId(store).replace(/-/g, "")}`;
}

function emitShareEvent(
  store: any,
  organizationId: string,
  projectId: string,
  sessionId: string,
  eventType: string,
  payload: Record<string, unknown>,
) {
  const event = {
    id: nextDemoId(store),
    organizationId,
    projectId,
    sessionId,
    eventType,
    payload,
    createdAt: new Date(),
  };
  store.shareEvents.push(event);
  return event;
}

function findSessionItem(store: any, itemId: string) {
  const sessionItem = store.shareSessionItems.find((i: any) => i.id === itemId);
  if (!sessionItem) throw new Error("Item not found");
  return sessionItem;
}

export async function createShareSessionAction(
  ...args: Parameters<typeof real_createShareSessionAction>
): Promise<Awaited<ReturnType<typeof real_createShareSessionAction>>> {
  const [payload] = args;
  const store = shareCollections(getDemoStore());

  const now = new Date();
  const session = {
    id: nextDemoId(store),
    organizationId: payload.organizationId,
    projectId: payload.projectId,
    policyId: payload.policyId ?? null,
    title: payload.title,
    description: payload.description ?? null,
    shareType: payload.shareType,
    secureToken: nextShareToken(store),
    status: "published",
    publishedAt: now,
    expiresAt: new Date(
      now.getTime() + SHARE_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    ),
    downloadCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  store.shareSessions.push(session);

  payload.deliverableIds.forEach((deliverableId, index) => {
    store.shareSessionItems.push({
      id: nextDemoId(store),
      organizationId: payload.organizationId,
      projectId: payload.projectId,
      sessionId: session.id,
      deliverableId,
      orderIndex: index,
      createdAt: now,
    });
  });

  emitShareEvent(
    store,
    payload.organizationId,
    payload.projectId,
    session.id,
    "Share.Created",
    {
      title: session.title,
      type: session.shareType,
    },
  );

  return session as any;
}

export async function resolveExternalIdentityAction(
  ...args: Parameters<typeof real_resolveExternalIdentityAction>
): Promise<Awaited<ReturnType<typeof real_resolveExternalIdentityAction>>> {
  const [organizationId, email, displayName] = args;
  const store = shareCollections(getDemoStore());

  let identity = store.externalIdentities.find(
    (i: any) => i.organizationId === organizationId && i.email === email,
  );

  if (!identity) {
    identity = {
      id: nextDemoId(store),
      organizationId,
      email,
      displayName: displayName ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    store.externalIdentities.push(identity);
  } else if (displayName && identity.displayName !== displayName) {
    identity.displayName = displayName;
    identity.updatedAt = new Date();
  }

  return identity as any;
}

export async function submitExternalCommentAction(
  ...args: Parameters<typeof real_submitExternalCommentAction>
): Promise<Awaited<ReturnType<typeof real_submitExternalCommentAction>>> {
  const [payload] = args;
  const store = shareCollections(getDemoStore());

  const sessionItem = findSessionItem(store, payload.itemId);

  const comment = {
    id: nextDemoId(store),
    organizationId: sessionItem.organizationId,
    projectId: sessionItem.projectId,
    sessionId: payload.sessionId,
    itemId: payload.itemId,
    authorIdentityId: payload.identityId,
    content: payload.content,
    parentId: payload.parentId ?? null,
    createdAt: new Date(),
  };
  store.shareComments.push(comment);

  emitShareEvent(
    store,
    sessionItem.organizationId,
    sessionItem.projectId,
    payload.sessionId,
    "Share.CommentAdded",
    {
      commentId: comment.id,
      itemId: payload.itemId,
    },
  );

  return comment as any;
}

export async function submitExternalAnnotationAction(
  ...args: Parameters<typeof real_submitExternalAnnotationAction>
): Promise<Awaited<ReturnType<typeof real_submitExternalAnnotationAction>>> {
  const [payload] = args;
  const store = shareCollections(getDemoStore());

  const sessionItem = findSessionItem(store, payload.itemId);

  const annotation = {
    id: nextDemoId(store),
    organizationId: sessionItem.organizationId,
    projectId: sessionItem.projectId,
    sessionId: payload.sessionId,
    itemId: payload.itemId,
    commentId: payload.commentId ?? null,
    type: payload.type,
    normX: payload.normX ?? null,
    normY: payload.normY ?? null,
    normWidth: payload.normWidth ?? null,
    normHeight: payload.normHeight ?? null,
    timeMs: payload.timeMs ?? null,
    createdAt: new Date(),
  };
  store.shareAnnotations.push(annotation);

  emitShareEvent(
    store,
    sessionItem.organizationId,
    sessionItem.projectId,
    payload.sessionId,
    "Share.AnnotationAdded",
    {
      annotationId: annotation.id,
      type: annotation.type,
    },
  );

  return annotation as any;
}

export async function submitExternalApprovalAction(
  ...args: Parameters<typeof real_submitExternalApprovalAction>
): Promise<Awaited<ReturnType<typeof real_submitExternalApprovalAction>>> {
  const [payload] = args;
  const store = shareCollections(getDemoStore());

  if (!payload.explicitConfirmationToken) {
    throw new Error("Invalid or Expired Token (Replay Protection)");
  }

  const sessionItem = findSessionItem(store, payload.itemId);

  const event = emitShareEvent(
    store,
    sessionItem.organizationId,
    sessionItem.projectId,
    payload.sessionId,
    "Share.ApprovalSubmitted",
    {
      itemId: payload.itemId,
      identityId: payload.identityId,
      decision: payload.decision,
      reason: payload.reason,
    },
  );

  return event as any;
}

export async function requestShareMeetingAction(
  ...args: Parameters<typeof real_requestShareMeetingAction>
): Promise<Awaited<ReturnType<typeof real_requestShareMeetingAction>>> {
  const [payload] = args;
  const store = shareCollections(getDemoStore());

  const sessionItem = findSessionItem(store, payload.itemId);

  const event = emitShareEvent(
    store,
    sessionItem.organizationId,
    sessionItem.projectId,
    payload.sessionId,
    "Share.MeetingRequested",
    {
      itemId: payload.itemId,
      commentId: payload.commentId,
      identityId: payload.identityId,
    },
  );

  return event as any;
}
