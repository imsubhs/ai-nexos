/* eslint-disable @typescript-eslint/no-explicit-any */
import type { createShareSessionAction as real_createShareSessionAction, resolveExternalIdentityAction as real_resolveExternalIdentityAction, submitExternalCommentAction as real_submitExternalCommentAction, submitExternalAnnotationAction as real_submitExternalAnnotationAction, submitExternalApprovalAction as real_submitExternalApprovalAction, requestShareMeetingAction as real_requestShareMeetingAction } from "./real-index";

export async function createShareSessionAction(...args: Parameters<typeof real_createShareSessionAction>): Promise<Awaited<ReturnType<typeof real_createShareSessionAction>>> {
  return { id: "mock-id", success: true } as any;
}

export async function resolveExternalIdentityAction(...args: Parameters<typeof real_resolveExternalIdentityAction>): Promise<Awaited<ReturnType<typeof real_resolveExternalIdentityAction>>> {
  return { id: "mock-id", data: [] } as any;
}

export async function submitExternalCommentAction(...args: Parameters<typeof real_submitExternalCommentAction>): Promise<Awaited<ReturnType<typeof real_submitExternalCommentAction>>> {
  return { id: "mock-id", data: [] } as any;
}

export async function submitExternalAnnotationAction(...args: Parameters<typeof real_submitExternalAnnotationAction>): Promise<Awaited<ReturnType<typeof real_submitExternalAnnotationAction>>> {
  return { id: "mock-id", data: [] } as any;
}

export async function submitExternalApprovalAction(...args: Parameters<typeof real_submitExternalApprovalAction>): Promise<Awaited<ReturnType<typeof real_submitExternalApprovalAction>>> {
  return { id: "mock-id", data: [] } as any;
}

export async function requestShareMeetingAction(...args: Parameters<typeof real_requestShareMeetingAction>): Promise<Awaited<ReturnType<typeof real_requestShareMeetingAction>>> {
  return { id: "mock-id", data: [] } as any;
}
