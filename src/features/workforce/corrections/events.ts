/**
 * Correction L3 domain-event names (merge doc 14 §11.1). Published through the
 * platform publisher; M12 notification templates consume them (doc 14 §11.3):
 * submitted → reviewers in scope; approved/rejected → requester. Actions never
 * call the notification API directly — see notify.ts for the demo consumer.
 */
export const CORRECTION_EVENTS = {
  /** CorrectionRequested — a new request was submitted (C-5). */
  requested: "workforce.correction.submitted",
  cancelled: "workforce.correction.cancelled",
  underReview: "workforce.correction.under_review",
  /** CorrectionApproved (C-8 approve). */
  approved: "workforce.correction.approved",
  /** CorrectionRejected (C-8 reject). */
  rejected: "workforce.correction.rejected",
} as const;

export type CorrectionEventName =
  (typeof CORRECTION_EVENTS)[keyof typeof CORRECTION_EVENTS];
