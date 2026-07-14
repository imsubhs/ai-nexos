/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { db } from "@/db";
import { eq } from "drizzle-orm";
import { 
  automationWorkflows, 
  automationWorkflowVersions, 
  automationExecutionRuns,
  automationDeadLetterQueue
} from "@/db/schema/automation";
import { WorkflowCompiler, RawWorkflowDefinition } from "./compiler";

// We assume these are properly authenticated via standard Next.js / Auth mechanisms
// Organization isolation must be enforced in DB queries or RLS.

export async function createWorkflow(orgId: string, name: string, description?: string, capabilityId?: string) {
  const [workflow] = await db.insert(automationWorkflows).values({
    organizationId: orgId,
    name,
    description,
    capabilityId,
    status: "draft"
  }).returning();
  return workflow;
}

export async function publishWorkflowVersion(workflowId: string, orgId: string, rawDefinition: RawWorkflowDefinition) {
  const compiler = new WorkflowCompiler();
  
  // Find current max version
  // Mock logic: const currentVersion = ... (from DB)
  const nextVersionNumber = 1;

  // Compile
  const compiledPlan = compiler.compile(rawDefinition, nextVersionNumber);

  // Transaction: Create version and update workflow
  return await db.transaction(async (tx) => {
    const [version] = await tx.insert(automationWorkflowVersions).values({
      organizationId: orgId,
      workflowId,
      versionNumber: nextVersionNumber,
      executablePlan: compiledPlan as any,
      rulesCompiledAt: new Date(),
      isValid: true
    }).returning();

    await tx.update(automationWorkflows)
      .set({ currentVersionId: version.id, status: "active" })
      .where(eq(automationWorkflows.id, workflowId));

    // In a full implementation, we'd also insert triggers, conditions, actions here.
    return version;
  });
}

export async function triggerManualWorkflow(workflowId: string, orgId: string, payload: Record<string, any>) {
  // Finds the active version of the workflow
  // Evaluates policies
  // Enqueues an execution run
  
  // Generate Idempotency key based on payload hash (simplified)
  const idempotencyKey = "manual_" + Date.now();

  const [run] = await db.insert(automationExecutionRuns).values({
    organizationId: orgId,
    workflowId,
    versionId: "version_uuid_placeholder", // Looked up in DB
    status: "queued",
    triggerSource: "manual_api",
    triggerPayload: payload,
    idempotencyKey
  }).returning();

  // Send to queue
  // await queueProvider.enqueue("automation_execution", { runId: run.id, ... })

  return run;
}

export async function cancelExecutionRun(runId: string, orgId: string) {
  const [run] = await db.update(automationExecutionRuns)
    .set({ status: "cancelled" })
    .where(eq(automationExecutionRuns.id, runId))
    .returning();
  return run;
}

export async function replayDlqItem(dlqId: string, orgId: string) {
  const [dlqItem] = await db.select().from(automationDeadLetterQueue).where(eq(automationDeadLetterQueue.id, dlqId));
  
  if (!dlqItem) throw new Error("DLQ item not found.");
  if (dlqItem.isTerminal) throw new Error("Cannot replay a terminal DLQ item.");

  // Delete from DLQ
  await db.delete(automationDeadLetterQueue).where(eq(automationDeadLetterQueue.id, dlqId));

  // Requeue the payload
  // await queueProvider.enqueue("automation_execution", dlqItem.payload)
  
  return { success: true };
}
