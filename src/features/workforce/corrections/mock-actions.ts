/**
 * Corrections server actions (Sprint 3B) — DEMO_MODE adapter. Thin binding of the
 * shared pipeline to the DemoStore repository; demo parity is behavioral (doc 15 §0).
 */
import { buildCorrectionActions } from "./action-core";
import { mockCorrectionRepository } from "./mock-repository";
import { mockAttendanceRepository } from "../attendance/mock-repository";
import type {
  CancelCorrectionInput,
  GetCorrectionInput,
  ListMyCorrectionsInput,
  ListReviewQueueInput,
  MarkUnderReviewInput,
  ReviewCorrectionInput,
  SubmitCorrectionInput,
} from "./schemas";
import type {
  CorrectionDetail,
  CorrectionListResult,
  ReviewContext,
} from "./types";

const actions = buildCorrectionActions(
  mockCorrectionRepository,
  mockAttendanceRepository,
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

export async function getCorrectionReviewContextAction(
  input: GetCorrectionInput,
): Promise<ReviewContext> {
  return actions.getReviewContext(input);
}
