// ============================================================
// WORK VALIDATION — DOMAIN ERRORS (Sprint 4A)
// ------------------------------------------------------------
// The engine is deterministic and total: for well-formed input it
// never throws. These errors are reserved for programmer errors and
// the "impossible" invariant breach — a broken invariant is a bug in
// the engine itself, never a data condition, so it fails loudly.
//
// Recoverable data problems (overlapping breaks, missing clock-out,
// idle beyond a threshold, …) are NOT errors — they are surfaced as
// structured `violations`/`warnings` on the ValidationResult.
// ============================================================

/** Stable, machine-readable codes for engine domain errors. */
export type WorkValidationErrorCode =
  | "work-validation/invariant-violation"
  | "work-validation/invalid-config"
  | "work-validation/invalid-input";

/** Base class for all Work Validation engine domain errors. */
export class WorkValidationError extends Error {
  readonly code: WorkValidationErrorCode;

  constructor(code: WorkValidationErrorCode, message: string) {
    super(message);
    this.name = "WorkValidationError";
    this.code = code;
  }
}

/**
 * Thrown when the canonical invariant `session = effective + idle + break`
 * fails to hold. This is a self-check on the engine's own arithmetic; if it
 * ever fires, the engine has a bug — it must never depend on caller input.
 */
export class InvariantViolationError extends WorkValidationError {
  constructor(message: string) {
    super("work-validation/invariant-violation", message);
    this.name = "InvariantViolationError";
  }
}

/** Thrown when the engine is configured with an impossible policy value. */
export class InvalidConfigError extends WorkValidationError {
  constructor(message: string) {
    super("work-validation/invalid-config", message);
    this.name = "InvalidConfigError";
  }
}

/** Thrown when structurally impossible input reaches the engine (e.g. NaN). */
export class InvalidInputError extends WorkValidationError {
  constructor(message: string) {
    super("work-validation/invalid-input", message);
    this.name = "InvalidInputError";
  }
}
