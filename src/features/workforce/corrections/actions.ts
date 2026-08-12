"use server";

/**
 * Corrections slice dispatcher (merge doc 15 §0 transport convention) —
 * DEMO_MODE switch identical to the attendance/employees pattern.
 */
import * as real from "./real-actions";
import * as mock from "./mock-actions";
import { isDemoMode } from "@/lib/env.server";

export async function submitCorrectionAction(
  ...args: Parameters<typeof real.submitCorrectionAction>
): Promise<Awaited<ReturnType<typeof real.submitCorrectionAction>>> {
  if (isDemoMode()) return mock.submitCorrectionAction(...args);
  return real.submitCorrectionAction(...args);
}

export async function cancelCorrectionAction(
  ...args: Parameters<typeof real.cancelCorrectionAction>
): Promise<Awaited<ReturnType<typeof real.cancelCorrectionAction>>> {
  if (isDemoMode()) return mock.cancelCorrectionAction(...args);
  return real.cancelCorrectionAction(...args);
}

export async function markCorrectionUnderReviewAction(
  ...args: Parameters<typeof real.markCorrectionUnderReviewAction>
): Promise<Awaited<ReturnType<typeof real.markCorrectionUnderReviewAction>>> {
  if (isDemoMode()) {
    return mock.markCorrectionUnderReviewAction(...args);
  }
  return real.markCorrectionUnderReviewAction(...args);
}

export async function reviewCorrectionAction(
  ...args: Parameters<typeof real.reviewCorrectionAction>
): Promise<Awaited<ReturnType<typeof real.reviewCorrectionAction>>> {
  if (isDemoMode()) return mock.reviewCorrectionAction(...args);
  return real.reviewCorrectionAction(...args);
}

export async function listMyCorrectionsAction(
  ...args: Parameters<typeof real.listMyCorrectionsAction>
): Promise<Awaited<ReturnType<typeof real.listMyCorrectionsAction>>> {
  if (isDemoMode()) return mock.listMyCorrectionsAction(...args);
  return real.listMyCorrectionsAction(...args);
}

export async function getCorrectionAction(
  ...args: Parameters<typeof real.getCorrectionAction>
): Promise<Awaited<ReturnType<typeof real.getCorrectionAction>>> {
  if (isDemoMode()) return mock.getCorrectionAction(...args);
  return real.getCorrectionAction(...args);
}

export async function listCorrectionReviewQueueAction(
  ...args: Parameters<typeof real.listCorrectionReviewQueueAction>
): Promise<Awaited<ReturnType<typeof real.listCorrectionReviewQueueAction>>> {
  if (isDemoMode()) {
    return mock.listCorrectionReviewQueueAction(...args);
  }
  return real.listCorrectionReviewQueueAction(...args);
}

export async function getCorrectionReviewContextAction(
  ...args: Parameters<typeof real.getCorrectionReviewContextAction>
): Promise<Awaited<ReturnType<typeof real.getCorrectionReviewContextAction>>> {
  if (isDemoMode()) {
    return mock.getCorrectionReviewContextAction(...args);
  }
  return real.getCorrectionReviewContextAction(...args);
}
