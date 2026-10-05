/**
 * Executive Intelligence Server Actions (Production Implementation).
 * Phase 4H — Executive Decision-Support Layer.
 *
 * Security & Boundary Controls:
 * - Internal authenticated access only (requireCurrentUser).
 * - Explicit role/permission enforcement (requirePermission(user.permissions, "analytics", "read")).
 * - Strict tenant isolation: All queries bound to user.organizationId; no caller-supplied org ID is accepted.
 * - Rate limited: resourceRead policy (120 req/min).
 * - Zero raw database leaks: Only sanitized ExecutiveIntelligenceDto is returned.
 */

import { requireCurrentUser } from "@/features/auth/current-user";
import { requirePermission } from "@/features/permissions";
import { consumeRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { ApiError } from "@/lib/security/errors";
import { computeExecutiveIntelligence } from "./service";
import type {
  ActionQueueItemDto,
  ExecutiveIntelligenceDto,
  ExecutivePulseDto,
  RiskItemDto,
} from "./types";

/**
 * Fetch full consolidated Executive Intelligence DTO for current user's organization.
 */
export async function getExecutiveIntelligence(
  timeWindow: "7d" | "30d" | "90d" = "30d",
): Promise<ExecutiveIntelligenceDto> {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "analytics", "read");

  // Rate limiting per user within organization
  const rateLimit = await consumeRateLimit(
    RATE_LIMITS.resourceRead,
    `intelligence:${user.organizationId}:${user.userId}`,
  );
  if (!rateLimit.allowed) {
    throw new ApiError(
      "rate_limited",
      `Too many requests. Please wait ${rateLimit.retryAfterSeconds}s before reloading executive intelligence.`,
    );
  }

  return computeExecutiveIntelligence({
    organizationId: user.organizationId,
    organizationName: user.organizationName,
    timeWindow,
  });
}

/**
 * Fetch prioritized Risk Radar items requiring executive intervention.
 */
export async function getExecutiveRisks(): Promise<RiskItemDto[]> {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "analytics", "read");

  const full = await computeExecutiveIntelligence({
    organizationId: user.organizationId,
    organizationName: user.organizationName,
  });

  return full.risks;
}

/**
 * Fetch "What Needs My Attention?" executive action queue.
 */
export async function getExecutiveAttentionQueue(): Promise<
  ActionQueueItemDto[]
> {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "analytics", "read");

  const full = await computeExecutiveIntelligence({
    organizationId: user.organizationId,
    organizationName: user.organizationName,
  });

  return full.actionQueue;
}

/**
 * Fetch lightweight Executive Pulse metrics snapshot.
 */
export async function getExecutivePulse(): Promise<ExecutivePulseDto> {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "analytics", "read");

  const full = await computeExecutiveIntelligence({
    organizationId: user.organizationId,
    organizationName: user.organizationName,
  });

  return full.pulse;
}
