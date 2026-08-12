"use server";

/**
 * The correction commands as the Corrections and Review Queue screens call
 * them: same guarded pipeline, domain violations returned as values rather than
 * thrown (see shared/action-result.ts).
 *
 * No authorization lives here. Each function delegates to the dispatcher in
 * actions.ts, which resolves CurrentUser and calls requirePermission — and, for
 * review, re-checks self-review and the state machine server-side. Hiding a
 * button is never the control.
 */
import {
  cancelCorrectionAction,
  markCorrectionUnderReviewAction,
  reviewCorrectionAction,
  submitCorrectionAction,
} from "./actions";
import { toActionResult, type ActionResult } from "../shared/action-result";
import type { SubmitCorrectionInput } from "./schemas";
import type { CorrectionDetail } from "./types";

export async function submitCorrection(
  input: SubmitCorrectionInput,
): Promise<ActionResult<CorrectionDetail>> {
  return toActionResult(() => submitCorrectionAction(input));
}

export async function cancelCorrection(
  correctionId: string,
): Promise<ActionResult<CorrectionDetail>> {
  return toActionResult(() => cancelCorrectionAction({ correctionId }));
}

export async function markUnderReview(
  correctionId: string,
): Promise<ActionResult<CorrectionDetail>> {
  return toActionResult(() =>
    markCorrectionUnderReviewAction({ correctionId }),
  );
}

export async function decideCorrection(input: {
  correctionId: string;
  decision: "APPROVED" | "REJECTED";
  reviewNote?: string;
}): Promise<ActionResult<CorrectionDetail>> {
  return toActionResult(() => reviewCorrectionAction(input));
}
