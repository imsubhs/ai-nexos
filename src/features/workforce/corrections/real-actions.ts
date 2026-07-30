"use server";

/**
 * Corrections server actions (Sprint 3B) — real path. Thin binding of the
 * shared pipeline to the Drizzle repository; live runtime wired in Phase 7.
 */
import { buildCorrectionActions } from "./action-core";
import { realCorrectionRepository } from "./real-repository";
import { realAttendanceRepository } from "../attendance/real-repository";
import type {
  CancelCorrectionInput,
  GetCorrectionInput,
  ListMyCorrectionsInput,
  ListReviewQueueInput,
  MarkUnderReviewInput,
  ReviewCorrectionInput,
  SubmitCorrectionInput,
} from "./schemas";
import type { CorrectionDetail, CorrectionListResult } from "./types";

const actions = buildCorrectionActions(
  realCorrectionRepository,
  realAttendanceRepository,
);

export async function submitCorrectionAction(
  input: SubmitCorrectionInput,
): Promise<CorrectionDetail> {
  return actions.submit(input);
}

export async function cancelCorrectionAction(
  input: CancelCorrectionInput,
): Promise<CorrectionDetail> {
  return actions.cancel(input);
}

export async function markCorrectionUnderReviewAction(
  input: MarkUnderReviewInput,
): Promise<CorrectionDetail> {
  return actions.markUnderReview(input);
}

export async function reviewCorrectionAction(
  input: ReviewCorrectionInput,
): Promise<CorrectionDetail> {
  return actions.review(input);
}

export async function listMyCorrectionsAction(
  input?: ListMyCorrectionsInput,
): Promise<CorrectionListResult> {
  return actions.listMine(input);
}

export async function getCorrectionAction(
  input: GetCorrectionInput,
): Promise<CorrectionDetail | null> {
  return actions.get(input);
}

export async function listCorrectionReviewQueueAction(
  input?: ListReviewQueueInput,
): Promise<CorrectionListResult> {
  return actions.listQueue(input);
}
