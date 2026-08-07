"use server";

import * as real from "./real-index";
import * as mock from "./mock-index";
import { isDemoMode } from "@/lib/env.server";

export async function createShareSessionAction(
  ...args: Parameters<typeof real.createShareSessionAction>
): Promise<ReturnType<typeof real.createShareSessionAction>> {
  if (isDemoMode()) return (mock as any).createShareSessionAction(...args);
  return (real as any).createShareSessionAction(...args);
}

export async function resolveExternalIdentityAction(
  ...args: Parameters<typeof real.resolveExternalIdentityAction>
): Promise<ReturnType<typeof real.resolveExternalIdentityAction>> {
  if (isDemoMode()) return (mock as any).resolveExternalIdentityAction(...args);
  return (real as any).resolveExternalIdentityAction(...args);
}

export async function submitExternalCommentAction(
  ...args: Parameters<typeof real.submitExternalCommentAction>
): Promise<ReturnType<typeof real.submitExternalCommentAction>> {
  if (isDemoMode()) return (mock as any).submitExternalCommentAction(...args);
  return (real as any).submitExternalCommentAction(...args);
}

export async function submitExternalAnnotationAction(
  ...args: Parameters<typeof real.submitExternalAnnotationAction>
): Promise<ReturnType<typeof real.submitExternalAnnotationAction>> {
  if (isDemoMode())
    return (mock as any).submitExternalAnnotationAction(...args);
  return (real as any).submitExternalAnnotationAction(...args);
}

export async function submitExternalApprovalAction(
  ...args: Parameters<typeof real.submitExternalApprovalAction>
): Promise<ReturnType<typeof real.submitExternalApprovalAction>> {
  if (isDemoMode()) return (mock as any).submitExternalApprovalAction(...args);
  return (real as any).submitExternalApprovalAction(...args);
}

export async function requestShareMeetingAction(
  ...args: Parameters<typeof real.requestShareMeetingAction>
): Promise<ReturnType<typeof real.requestShareMeetingAction>> {
  if (isDemoMode()) return (mock as any).requestShareMeetingAction(...args);
  return (real as any).requestShareMeetingAction(...args);
}
