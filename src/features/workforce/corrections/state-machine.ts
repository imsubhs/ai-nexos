/**
 * CorrectionRequest status transitions (merge doc 14 §8.2). Single guard
 * shared by cancel / mark-under-review / review, so the legal hops live in one
 * place. Mirrors the M09 cycle state (the correction row is the projection).
 *
 *   PENDING --(reviewer opens)--> UNDER_REVIEW --approve--> APPROVED
 *      |                              |    \--reject-------> REJECTED
 *      +--cancel (owner)--------------+---> CANCELLED
 *
 * APPROVED / REJECTED / CANCELLED are terminal. Direct PENDING→APPROVED/
 * REJECTED is legal (the UNDER_REVIEW hop is optional).
 */
import { CorrectionError } from "./repository";
import type { CorrectionStatus } from "../shared/enums";

export type CorrectionCommand =
  | "cancel"
  | "markUnderReview"
  | "review"; // approve or reject

const ALLOWED: Record<CorrectionCommand, CorrectionStatus[]> = {
  cancel: ["PENDING", "UNDER_REVIEW"],
  markUnderReview: ["PENDING", "UNDER_REVIEW"], // idempotent from UNDER_REVIEW
  review: ["PENDING", "UNDER_REVIEW"],
};

const ILLEGAL_KEY: Record<CorrectionCommand, string> = {
  cancel: "correction/not-cancellable",
  markUnderReview: "correction/not-reviewable",
  review: "correction/not-reviewable",
};

const MESSAGE: Record<CorrectionCommand, string> = {
  cancel: "Only an open request can be cancelled.",
  markUnderReview: "This request is no longer open for review.",
  review: "This request has already been decided.",
};

export function canTransition(
  status: CorrectionStatus,
  command: CorrectionCommand,
): boolean {
  return ALLOWED[command].includes(status);
}

export function assertTransition(
  status: CorrectionStatus,
  command: CorrectionCommand,
): void {
  if (!canTransition(status, command)) {
    throw new CorrectionError(ILLEGAL_KEY[command], MESSAGE[command]);
  }
}
