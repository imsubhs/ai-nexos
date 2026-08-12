/**
 * COR-#### human code minting (merge doc 14 §3, WP-120 acceptance).
 *
 * `attendance_corrections` carries a UNIQUE index on
 * (organization_id, correction_code). The real repository used to insert the
 * literal "COR-PENDING" for every row, so the first request in an organization
 * succeeded and the second failed with 23505 — the feature could not ship.
 *
 * Codes now come from `organization_sequences` under the entity type below,
 * the same per-organization counter `generateProjectCode` uses for AIC-YYYY-####
 * (src/features/projects/real-actions.ts). The formatting half is pure and
 * lives here so it can be asserted without a database.
 */

/** `organization_sequences.entity_type` holding the correction counter. */
export const CORRECTION_SEQUENCE_ENTITY = "correction_code";

/**
 * Formats a sequence value as its human code.
 *
 * Padded to four digits for the COR-#### shape the specification names, and
 * deliberately *not* truncated past 9999: an organization's 10000th correction
 * becomes COR-10000 rather than colliding with an earlier code, because the
 * unique index would reject the collision and lose the request.
 */
export function formatCorrectionCode(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new RangeError(
      `Correction sequence must be a positive integer, received ${sequence}.`,
    );
  }
  return `COR-${sequence.toString().padStart(4, "0")}`;
}
