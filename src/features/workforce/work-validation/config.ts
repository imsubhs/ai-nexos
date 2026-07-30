// ============================================================
// WORK VALIDATION — ENGINE CONFIGURATION (Sprint 4A)
// ------------------------------------------------------------
// Business rules are never hardcoded (TRD §13). Every policy knob
// lives here and can be overridden per call (tests) or per org
// (WorkforcePolicy.activityConfig, doc 14 §5). Defaults derive from
// PRD §24 (idle threshold) and TRD §22 (activity windows).
// ============================================================

import { MINUTE_MS } from "./value-objects";
import { InvalidConfigError } from "./errors";

/**
 * Deterministic policy inputs for the Work Validation engine. Every field is
 * required internally; callers pass a {@link PartialEngineConfig} and the
 * engine fills gaps from {@link DEFAULT_ENGINE_CONFIG}.
 */
export interface EngineConfig {
  /**
   * Continuous inactivity required before a span is *considered* idle at all
   * (PRD §24, default 10 min). Surfaced as `derived.idleThresholdMs`; used to
   * raise a warning when a single idle block is unusually long.
   */
  readonly idleThresholdMs: number;
  /**
   * Idle blocks shorter than this (after clamping to the session and removing
   * break overlap) are reclassified as effective work rather than idle.
   * Default 0 — upstream trackers already qualify idle, so the engine trusts
   * the provided periods unless a policy opts into extra filtering.
   */
  readonly minIdleBlockMs: number;
  /**
   * Adjacent same-kind blocks separated by a gap no larger than this are
   * merged into one block (smooths tracker jitter). Default 0 — merge only
   * touching/overlapping blocks.
   */
  readonly mergeGapMs: number;
  /**
   * Focus blocks shorter than this are dropped from the focus metric (they are
   * too brief to count as sustained focus). Default 0 — keep every focus block.
   */
  readonly minFocusBlockMs: number;
  /**
   * When true, an open session/period (no clock-out) is closed at `now`. When
   * false the engine treats the latest known instant as the bound. Default true.
   */
  readonly autoCloseOpenSession: boolean;
}

/** Caller-facing override shape — every field optional. */
export type PartialEngineConfig = Partial<EngineConfig>;

/** Shipped defaults (PRD §24 / TRD §22). Override per-call or per-org. */
export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  idleThresholdMs: 10 * MINUTE_MS,
  minIdleBlockMs: 0,
  mergeGapMs: 0,
  minFocusBlockMs: 0,
  autoCloseOpenSession: true,
};

/**
 * Resolve a partial override against the shipped defaults and validate it.
 * Throws {@link InvalidConfigError} on a nonsensical value so misconfiguration
 * fails fast rather than silently corrupting metrics.
 */
export function resolveConfig(override?: PartialEngineConfig): EngineConfig {
  const config: EngineConfig = { ...DEFAULT_ENGINE_CONFIG, ...override };

  const nonNegative: readonly (keyof EngineConfig)[] = [
    "idleThresholdMs",
    "minIdleBlockMs",
    "mergeGapMs",
    "minFocusBlockMs",
  ];
  for (const key of nonNegative) {
    const value = config[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new InvalidConfigError(`config.${key} must be a finite number ≥ 0`);
    }
  }
  return config;
}
