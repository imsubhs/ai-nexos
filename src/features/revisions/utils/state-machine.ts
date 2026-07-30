/**
 * Valid state transitions for the Revision Engine.
 */
export const REVISION_STATE_TRANSITIONS: Record<string, string[]> = {
  REQUESTED: ["CREATED", "REJECTED"],
  CREATED: ["ASSIGNED", "WIP"],
  ASSIGNED: ["WIP"],
  WIP: ["INTERNAL_REVIEW", "QA", "READY_FOR_APPROVAL"],
  INTERNAL_REVIEW: ["WIP", "QA", "READY_FOR_APPROVAL", "REJECTED"],
  QA: ["WIP", "READY_FOR_APPROVAL", "REJECTED"],
  READY_FOR_APPROVAL: ["APPROVED", "REJECTED"],
  APPROVED: ["MERGED"],
  REJECTED: ["WIP", "ARCHIVED"],
  MERGED: ["ARCHIVED"],
  ARCHIVED: [],
};

/**
 * Validates whether a state transition is legal in the business logic flow.
 * Throws an error if illegal.
 */
export function validateRevisionTransition(
  currentStatus: string,
  newStatus: string,
) {
  const allowedNext = REVISION_STATE_TRANSITIONS[currentStatus];

  if (!allowedNext || !allowedNext.includes(newStatus)) {
    throw new Error(
      `Illegal state transition from ${currentStatus} to ${newStatus}`,
    );
  }
}
