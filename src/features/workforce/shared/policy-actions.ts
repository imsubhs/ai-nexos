"use server";

/**
 * Attendance policy read surface (merge doc 14 §6 / §10). Exposes the
 * resolved `WorkforcePolicy` to any workforce screen (the My Attendance
 * status stripe shows work start/end + late threshold). Read-only — no side
 * effects, no audit, no events.
 *
 * The settings source (`organization_settings.workforce`) is authored in
 * Phase 4.9; until then the resolver falls back to DEFAULT (doc 14 §6). This
 * changes no business rule — it only surfaces the same policy the clock
 * actions already consume.
 */
import { requireCurrentUser } from "@/features/auth/current-user";
import { requirePermission } from "@/features/permissions";
import { getDemoStore } from "@/lib/demo/store";
import {
  resolveWorkforcePolicy,
  type WorkforcePolicyOverride,
} from "./policy-resolver";
import type { WorkforcePolicy } from "./types";
import { isDemoMode } from "@/lib/env.server";

export async function getWorkforcePolicyAction(): Promise<WorkforcePolicy> {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "attendance", "read");

  let override: WorkforcePolicyOverride | null = null;
  if (isDemoMode()) {
    const org = (
      getDemoStore().organizations as {
        organizationId: string;
        workforceSettings?: WorkforcePolicyOverride;
      }[]
    ).find((o) => o.organizationId === user.organizationId);
    override = org?.workforceSettings ?? null;
  }
  // Real path (Phase 4.9): read organization_settings.workforce here.
  return resolveWorkforcePolicy(override);
}
