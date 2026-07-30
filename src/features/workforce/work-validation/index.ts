// ============================================================
// WORK VALIDATION ENGINE — PUBLIC API (Sprint 4A)
// ------------------------------------------------------------
// The canonical implementation for all attendance calculations
// (doc 14 §6). Import ONLY from this barrel — never reach into
// individual files from outside the bounded context.
//
// This is a PURE DOMAIN SERVICE. It has zero dependencies on React,
// Next.js, Server Actions, DemoStore, Drizzle, Supabase, repositories,
// UI, or browser APIs (enforced by architecture.test.ts).
// ============================================================

// ── Orchestrator ────────────────────────────────────────────
export { validateWorkDay, computeWorkValidation, msToMinutes } from "./work-validation-engine";

// ── Sub-engines (composable, individually testable) ─────────
export { IntervalEngine } from "./interval-engine";
export { buildSession, type BuiltSession } from "./session-builder";
export { processBreaks, type ProcessedBreaks } from "./break-processor";
export { detectIdle, type DetectedIdle } from "./idle-detector";
export { calculateFocus, type CalculatedFocus } from "./focus-calculator";
export {
  calculateEffective,
  verifyInvariant,
  verifyMinuteInvariant,
  type EffectiveResult,
} from "./effective-calculator";
export {
  buildTimeline,
  computeDerived,
  partitionMinutes,
  toTimelineEntries,
} from "./validation-result";

// ── Configuration ───────────────────────────────────────────
export {
  DEFAULT_ENGINE_CONFIG,
  resolveConfig,
  type EngineConfig,
  type PartialEngineConfig,
} from "./config";

// ── Value objects & errors ──────────────────────────────────
export {
  MINUTE_MS,
  intervalDuration,
  periodToInterval,
  type Interval,
  type TimePeriod,
  type TimelineEntry,
  type TimelineKind,
} from "./value-objects";
export {
  WorkValidationError,
  InvariantViolationError,
  InvalidConfigError,
  InvalidInputError,
  type WorkValidationErrorCode,
} from "./errors";

// ── Data contracts ──────────────────────────────────────────
export type {
  ClockSegment,
  DerivedMetrics,
  Finding,
  FindingCode,
  Severity,
  ValidationResult,
  WorkSessionInput,
  WorkValidationInput,
  WorkValidationMetrics,
} from "./types";
