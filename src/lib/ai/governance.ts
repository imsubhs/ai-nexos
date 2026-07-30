import { db } from "@/db";
import { aiBudgets } from "@/db/schema/ai-workspace";
import type { AIMemoryLayer, BudgetStatus } from "./types";
import { eq, and, sql } from "drizzle-orm";

export class AICostGovernance {
  /**
   * Checks the budget for a specific layer before execution.
   */
  static async checkBudget(
    organizationId: string,
    layer: AIMemoryLayer,
    entityId?: string,
  ): Promise<BudgetStatus> {
    const conditions = [
      eq(aiBudgets.organizationId, organizationId),
      eq(aiBudgets.layer, layer),
    ];

    if (layer === "project" && entityId) {
      conditions.push(eq(aiBudgets.projectId, entityId));
    } else if (layer === "conversation" && entityId) {
      conditions.push(eq(aiBudgets.conversationId, entityId));
    }

    const [budget] = await db
      .select()
      .from(aiBudgets)
      .where(and(...conditions));

    if (!budget) {
      return {
        layer,
        entityId: entityId || organizationId,
        limitInUsd: Infinity,
        currentSpendInUsd: 0,
        isExceeded: false,
      };
    }

    return {
      layer,
      entityId: entityId || organizationId,
      limitInUsd: Number(budget.limitInUsd),
      currentSpendInUsd: Number(budget.currentSpendInUsd),
      isExceeded: Number(budget.currentSpendInUsd) >= Number(budget.limitInUsd),
    };
  }

  /**
   * Deducts the cost from all applicable budgets transactionally.
   * Uses raw SQL increments to avoid race conditions during concurrent requests.
   */
  static async recordSpend(
    organizationId: string,
    costUsd: number,
    projectId?: string,
    conversationId?: string,
  ) {
    if (costUsd <= 0) return;

    await db.transaction(async (tx) => {
      // 1. Update Organization Budget
      await tx
        .update(aiBudgets)
        .set({
          currentSpendInUsd: sql`${aiBudgets.currentSpendInUsd} + ${costUsd}`,
        })
        .where(
          and(
            eq(aiBudgets.organizationId, organizationId),
            eq(aiBudgets.layer, "organization"),
          ),
        );

      // 2. Update Project Budget if applicable
      if (projectId) {
        await tx
          .update(aiBudgets)
          .set({
            currentSpendInUsd: sql`${aiBudgets.currentSpendInUsd} + ${costUsd}`,
          })
          .where(
            and(
              eq(aiBudgets.organizationId, organizationId),
              eq(aiBudgets.layer, "project"),
              eq(aiBudgets.projectId, projectId),
            ),
          );
      }

      // 3. Update Conversation Budget if applicable
      if (conversationId) {
        await tx
          .update(aiBudgets)
          .set({
            currentSpendInUsd: sql`${aiBudgets.currentSpendInUsd} + ${costUsd}`,
          })
          .where(
            and(
              eq(aiBudgets.organizationId, organizationId),
              eq(aiBudgets.layer, "conversation"),
              eq(aiBudgets.conversationId, conversationId),
            ),
          );
      }
    });
  }
}
