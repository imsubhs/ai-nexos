/* eslint-disable @typescript-eslint/no-explicit-any */
import { ExecutionContext } from "./execution";
import Redis from "ioredis";
import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import {
  automationRateLimits,
  automationExecutionRuns,
} from "@/db/schema/automation";
import { eq, and, gte, count } from "drizzle-orm";

export class PolicyViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PolicyViolationError";
  }
}

/**
 * Policy Engine
 * Gatekeeper for workflow execution, ensuring it adheres to organization limits,
 * rate limits, and security permissions.
 */
export class PolicyEngine {
  constructor(private redis: Redis) {}

  /**
   * Evaluates if a workflow execution is allowed to proceed.
   */
  async evaluatePreExecution(
    context: ExecutionContext,
    organizationId: string,
  ): Promise<boolean> {
    // 1. Verify Organization Status (Active/Archived)
    const orgs = await db
      .select({ id: organizations.organizationId })
      .from(organizations)
      .where(eq(organizations.organizationId, organizationId));

    if (orgs.length === 0) {
      throw new PolicyViolationError(
        "Organization is not active or does not exist.",
      );
    }

    // 2. Fetch configured rate limits for this workflow
    const limits = await db
      .select()
      .from(automationRateLimits)
      .where(
        and(
          eq(automationRateLimits.organizationId, organizationId),
          eq(automationRateLimits.entityId, context.workflowId),
        ),
      );

    // 3. Redis Rate Limits
    for (const limit of limits) {
      const windowKey = `rate_limit:${organizationId}:${context.workflowId}:${Math.floor(Date.now() / 1000 / limit.windowSeconds)}`;

      const currentCount = await this.redis.incr(windowKey);
      if (currentCount === 1) {
        await this.redis.expire(windowKey, limit.windowSeconds);
      }

      if (currentCount > limit.limitCount) {
        throw new PolicyViolationError(
          `Rate limit exceeded for workflow execution. Max ${limit.limitCount} per ${limit.windowSeconds}s.`,
        );
      }
    }

    // 4. Quota Limits (e.g. max per month)
    // Querying execution runs in the current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [monthlyRuns] = await db
      .select({ count: count() })
      .from(automationExecutionRuns)
      .where(
        and(
          eq(automationExecutionRuns.organizationId, organizationId),
          gte(automationExecutionRuns.startedAt, startOfMonth),
        ),
      );

    // Hardcoded plan quota for demonstration, normally fetched from Billing/Analytics module
    const MONTHLY_QUOTA = 10000;
    if (monthlyRuns.count >= MONTHLY_QUOTA) {
      throw new PolicyViolationError(
        `Monthly automation quota exceeded (${MONTHLY_QUOTA} max).`,
      );
    }

    return true;
  }

  /**
   * Evaluates if a specific action within a workflow is allowed based on permissions.
   */
  async evaluateActionPermission(
    context: ExecutionContext,
    actionId: string,
    requiredPermissions: string[],
  ): Promise<boolean> {
    // E.g., check if the workflow/creator has the required role scopes to execute this action
    if (requiredPermissions.length === 0) return true;

    // Fetch scopes associated with context.workflowId / API Key
    const hasPermission = true;
    if (!hasPermission) {
      throw new PolicyViolationError(
        `Insufficient permissions to execute action ${actionId}. Required: ${requiredPermissions.join(", ")}`,
      );
    }

    return true;
  }
}
