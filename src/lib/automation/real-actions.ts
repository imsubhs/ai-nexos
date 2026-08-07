/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { db } from "@/db";
import { and, eq } from "drizzle-orm";
import {
  automationWorkflows,
  automationWorkflowVersions,
  automationExecutionRuns,
  automationDeadLetterQueue,
} from "@/db/schema/automation";
import { requireCurrentUser } from "@/features/auth/current-user";
import { requirePermission } from "@/features/permissions";
import { WorkflowCompiler, RawWorkflowDefinition } from "./compiler";

/**
 * Automation server actions.
 *
 * These carried the comment:
 *
 *     // We assume these are properly authenticated via standard Next.js /
 *     // Auth mechanisms
 *     // Organization isolation must be enforced in DB queries or RLS.
 *
 * Neither assumption held. `"use server"` exports are HTTP endpoints — the
 * browser can invoke them directly — and not one of these functions called
 * `requireCurrentUser`. Worse, each took `orgId` as a *parameter*, so the
 * tenant a write landed in was chosen by the caller. Creating a workflow in
 * another organisation, publishing a version into it, and triggering it were
 * all one argument away. RLS would not have saved this either: these queries
 * run through the Drizzle connection, which is not the user's JWT session.
 *
 * Two rules now hold throughout this file:
 *
 *   1. The organisation comes from the authenticated user, never from an
 *      argument. The `orgId` parameters are gone rather than validated,
 *      because a parameter that must always equal a derived value is a trap
 *      waiting for the one call site that forgets to check it.
 *   2. Every write is scoped by `organizationId` in its WHERE clause.
 *      `cancelExecutionRun` previously matched on run id alone and ignored the
 *      `orgId` it was handed entirely, so any run id cancelled any tenant's
 *      run.
 */

export async function createWorkflow(
  name: string,
  description?: string,
  capabilityId?: string,
) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "settings", "create");

  const [workflow] = await db
    .insert(automationWorkflows)
    .values({
      organizationId: user.organizationId,
      name,
      description,
      capabilityId,
      status: "draft",
    })
    .returning();
  return workflow;
}

export async function publishWorkflowVersion(
  workflowId: string,
  rawDefinition: RawWorkflowDefinition,
) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "settings", "update");

  // Confirm the workflow belongs to the caller's organisation before compiling
  // anything. Without this the insert below would attach a version to another
  // tenant's workflow, and the update would flip that workflow to active.
  const [workflow] = await db
    .select({ id: automationWorkflows.id })
    .from(automationWorkflows)
    .where(
      and(
        eq(automationWorkflows.id, workflowId),
        eq(automationWorkflows.organizationId, user.organizationId),
      ),
    )
    .limit(1);

  if (!workflow) throw new Error("Workflow not found.");

  const compiler = new WorkflowCompiler();

  // Find current max version
  // Mock logic: const currentVersion = ... (from DB)
  const nextVersionNumber = 1;

  // Compile
  const compiledPlan = compiler.compile(rawDefinition, nextVersionNumber);

  // Transaction: Create version and update workflow
  return await db.transaction(async (tx) => {
    const [version] = await tx
      .insert(automationWorkflowVersions)
      .values({
        organizationId: user.organizationId,
        workflowId,
        versionNumber: nextVersionNumber,
        executablePlan: compiledPlan as any,
        rulesCompiledAt: new Date(),
        isValid: true,
      })
      .returning();

    await tx
      .update(automationWorkflows)
      .set({ currentVersionId: version.id, status: "active" })
      .where(
        and(
          eq(automationWorkflows.id, workflowId),
          eq(automationWorkflows.organizationId, user.organizationId),
        ),
      );

    // In a full implementation, we'd also insert triggers, conditions, actions here.
    return version;
  });
}

export async function triggerManualWorkflow(
  workflowId: string,
  payload: Record<string, any>,
) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "settings", "update");

  const [workflow] = await db
    .select({ id: automationWorkflows.id })
    .from(automationWorkflows)
    .where(
      and(
        eq(automationWorkflows.id, workflowId),
        eq(automationWorkflows.organizationId, user.organizationId),
      ),
    )
    .limit(1);

  if (!workflow) throw new Error("Workflow not found.");

  // Finds the active version of the workflow
  // Evaluates policies
  // Enqueues an execution run

  // Generate Idempotency key based on payload hash (simplified)
  const idempotencyKey = "manual_" + Date.now();

  const [run] = await db
    .insert(automationExecutionRuns)
    .values({
      organizationId: user.organizationId,
      workflowId,
      versionId: "version_uuid_placeholder", // Looked up in DB
      status: "queued",
      triggerSource: "manual_api",
      triggerPayload: payload,
      idempotencyKey,
    })
    .returning();

  // Send to queue
  // await queueProvider.enqueue("automation_execution", { runId: run.id, ... })

  return run;
}

export async function cancelExecutionRun(runId: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "settings", "update");

  const [run] = await db
    .update(automationExecutionRuns)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(automationExecutionRuns.id, runId),
        eq(automationExecutionRuns.organizationId, user.organizationId),
      ),
    )
    .returning();

  if (!run) throw new Error("Execution run not found.");
  return run;
}

export async function replayDlqItem(dlqId: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "settings", "update");

  const [dlqItem] = await db
    .select()
    .from(automationDeadLetterQueue)
    .where(
      and(
        eq(automationDeadLetterQueue.id, dlqId),
        eq(automationDeadLetterQueue.organizationId, user.organizationId),
      ),
    );

  if (!dlqItem) throw new Error("DLQ item not found.");
  if (dlqItem.isTerminal) throw new Error("Cannot replay a terminal DLQ item.");

  // Delete from DLQ. Re-scoped rather than trusting the select above: the two
  // statements are not in one transaction, so the WHERE clause must stand on
  // its own.
  await db
    .delete(automationDeadLetterQueue)
    .where(
      and(
        eq(automationDeadLetterQueue.id, dlqId),
        eq(automationDeadLetterQueue.organizationId, user.organizationId),
      ),
    );

  // Requeue the payload
  // await queueProvider.enqueue("automation_execution", dlqItem.payload)

  return { success: true };
}
