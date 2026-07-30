/**
 * WorkforcePolicyResolver (merge doc 14 §6) — resolves the effective
 * `WorkforcePolicy` from the settings chain: user prefs ▸
 * `organization_settings.workforce` ▸ `DEFAULT_WORKFORCE_POLICY`.
 *
 * Sprint 3B lands the pure resolver + fallback (doc 14 §6: "until Phase 4.9
 * lands the full helper, falls back organization_settings.workforce ▸
 * DEFAULTs"). It resolves no rule differently from Sprint 3A — the interim
 * finalizer and status derivation still consume `DEFAULT_WORKFORCE_POLICY`
 * when no override is supplied, so no business rule changes.
 */
import { DEFAULT_WORKFORCE_POLICY, type WorkforcePolicy } from "./types";

/** Partial override sourced from org/user settings (all keys optional). */
export type WorkforcePolicyOverride = Partial<
  Omit<WorkforcePolicy, "activityConfig">
> & {
  activityConfig?: Partial<WorkforcePolicy["activityConfig"]>;
};

/**
 * Overlay an override onto the defaults. Deep-merges `activityConfig` so a
 * partial settings document never drops engine thresholds. `activityConfig`
 * is carried through untouched by V1 writers (work validation is deferred).
 */
export function resolveWorkforcePolicy(
  override?: WorkforcePolicyOverride | null,
): WorkforcePolicy {
  if (!override) return DEFAULT_WORKFORCE_POLICY;
  return {
    ...DEFAULT_WORKFORCE_POLICY,
    ...override,
    workingDays: override.workingDays ?? DEFAULT_WORKFORCE_POLICY.workingDays,
    activityConfig: {
      ...DEFAULT_WORKFORCE_POLICY.activityConfig,
      ...(override.activityConfig ?? {}),
      activityThresholds: {
        ...DEFAULT_WORKFORCE_POLICY.activityConfig.activityThresholds,
        ...(override.activityConfig?.activityThresholds ?? {}),
      },
    },
  };
}
