/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  createShareSessionAction as real_createShareSessionAction,
  resolveExternalIdentityAction as real_resolveExternalIdentityAction,
  submitExternalCommentAction as real_submitExternalCommentAction,
  submitExternalAnnotationAction as real_submitExternalAnnotationAction,
  submitExternalApprovalAction as real_submitExternalApprovalAction,
  requestShareMeetingAction as real_requestShareMeetingAction,
} from "./real-index";
import { getDemoStore, nextDemoId, DEMO_ORG_ID } from "@/lib/demo/store";

// These mirror the real actions' signatures, which changed in Sprint 2.2: the
// external ones now take a share token instead of a caller-supplied
// identityId/sessionId, and the internal one derives the organisation from the
// authenticated user. src/features/shares/actions/index.ts derives its
// parameter lists from the real module, so drift here is a type error.
//
// The demo path resolves a session from the token by looking it up in the
// store rather than verifying a signature — there is no real token to verify
// against an in-memory dataset — but it still refuses an item that does not
// belong to the resolved session, so the demo and real paths agree on what is
// rejected.

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

function resolveDemoShare(store: any, shareToken: string) {
  const session = store.shareSessions.find(
    (s: any) => s.secureToken === shareToken && s.status === "published",
  );
  if (!session) {
    throw new Error("This link is invalid, expired, or no longer active.");
  }
  return session;
}

/** The item must belong to the session the token resolved to. */
function findSessionItem(store: any, itemId: string, sessionId: string) {
  const sessionItem = store.shareSessionItems.find(
    (i: any) => i.id === itemId && i.sessionId === sessionId,
  );
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
    organizationId: DEMO_ORG_ID,
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
      organizationId: DEMO_ORG_ID,
      projectId: payload.projectId,
      sessionId: session.id,
      deliverableId,
      orderIndex: index,
      createdAt: now,
    });
  });

  emitShareEvent(
    store,
    DEMO_ORG_ID,
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
  const [shareToken, email, displayName] = args;
  const store = shareCollections(getDemoStore());
  const organizationId = resolveDemoShare(store, shareToken).organizationId;

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

  const session = resolveDemoShare(store, payload.shareToken);
  const sessionItem = findSessionItem(store, payload.itemId, session.id);

  const comment = {
    id: nextDemoId(store),
    organizationId: sessionItem.organizationId,
    projectId: sessionItem.projectId,
    sessionId: session.id,
    itemId: payload.itemId,
    authorIdentityId: session.identityId ?? null,
    content: payload.content,
    parentId: payload.parentId ?? null,
    createdAt: new Date(),
  };
  store.shareComments.push(comment);

  emitShareEvent(
    store,
    sessionItem.organizationId,
    sessionItem.projectId,
    session.id,
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

  const session = resolveDemoShare(store, payload.shareToken);
  const sessionItem = findSessionItem(store, payload.itemId, session.id);

  const annotation = {
    id: nextDemoId(store),
    organizationId: sessionItem.organizationId,
    projectId: sessionItem.projectId,
    sessionId: session.id,
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
    session.id,
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

  const session = resolveDemoShare(store, payload.shareToken);

  if (!payload.explicitConfirmationToken) {
    throw new Error("Invalid or Expired Token (Replay Protection)");
  }

  const sessionItem = findSessionItem(store, payload.itemId, session.id);

  const event = emitShareEvent(
    store,
    sessionItem.organizationId,
    sessionItem.projectId,
    session.id,
    "Share.ApprovalSubmitted",
    {
      itemId: payload.itemId,
      identityId: session.identityId ?? null,
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

  const session = resolveDemoShare(store, payload.shareToken);
  const sessionItem = findSessionItem(store, payload.itemId, session.id);

  const event = emitShareEvent(
    store,
    sessionItem.organizationId,
    sessionItem.projectId,
    session.id,
    "Share.MeetingRequested",
    {
      itemId: payload.itemId,
      commentId: payload.commentId,
      identityId: session.identityId ?? null,
    },
  );

  return event as any;
}
