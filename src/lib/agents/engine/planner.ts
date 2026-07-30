import { db } from "@/db";
import { aiAgentPlans, aiAgentPlanSteps } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import type { agentConfidenceThresholdEnum } from "@/db/schema";

export type PlanStepInput = {
  actionName: string;
  dependencies: string[];
  confidenceThreshold?: "auto_execute" | "human_approval" | "abort";
};

/**
 * Creates a new, immutable plan version for the execution run.
 * Previous plans for the run are marked as superseded.
 */
export async function createPlan(
  organizationId: string,
  runId: string,
  steps: PlanStepInput[],
) {
  return await db.transaction(async (tx) => {
    // 1. Mark existing active plans for this run as superseded
    await tx
      .update(aiAgentPlans)
      .set({ status: "superseded" })
      .where(
        and(eq(aiAgentPlans.runId, runId), eq(aiAgentPlans.status, "active")),
      );

    // 2. Determine the next plan version
    const existingPlans = await tx
      .select({ version: aiAgentPlans.planVersion })
      .from(aiAgentPlans)
      .where(eq(aiAgentPlans.runId, runId));

    const nextVersion =
      existingPlans.length > 0
        ? Math.max(...existingPlans.map((p) => p.version)) + 1
        : 1;

    // 3. Insert the new immutable plan
    const [newPlan] = await tx
      .insert(aiAgentPlans)
      .values({
        organizationId,
        runId,
        planVersion: nextVersion,
        status: "active",
        isImmutable: true,
      })
      .returning();

    // 4. Insert the plan steps
    if (steps.length > 0) {
      const stepRecords = steps.map((step, index) => ({
        organizationId,
        planId: newPlan.id,
        stepOrder: index + 1,
        actionName: step.actionName,
        dependencies: step.dependencies,
        confidenceThreshold: step.confidenceThreshold || "auto_execute",
      }));

      await tx.insert(aiAgentPlanSteps).values(stepRecords);
    }

    return newPlan;
  });
}

/**
 * Retrieves the active plan for a run.
 */
export async function getActivePlan(runId: string) {
  const [plan] = await db
    .select()
    .from(aiAgentPlans)
    .where(
      and(eq(aiAgentPlans.runId, runId), eq(aiAgentPlans.status, "active")),
    );

  if (!plan) return null;

  const steps = await db
    .select()
    .from(aiAgentPlanSteps)
    .where(eq(aiAgentPlanSteps.planId, plan.id));

  return { plan, steps };
}
