/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueueProvider } from "./queue";
import { CompiledExecutablePlan } from "./compiler";
import { db } from "@/db";
import { automationExecutionState } from "@/db/schema/automation";
import { eq, and, isNull, lt, sql } from "drizzle-orm";

export interface ExecutionContext {
  runId: string;
  workflowId: string;
  versionId: string;
  workerId: string;
  variables: Record<string, any>;
}

export class LeaseExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeaseExpiredError";
  }
}

const MAX_PAYLOAD_SIZE_BYTES = 100 * 1024; // 100KB threshold

/**
 * Execution Engine responsible for managing the lease heartbeat and executing compiled plans.
 */
export class ExecutionEngine {
  private queueProvider: QueueProvider;

  constructor(queueProvider: QueueProvider) {
    this.queueProvider = queueProvider;
  }

  /**
   * Acquires an atomic lease for an execution run.
   */
  async acquireLease(
    runId: string,
    workerId: string,
    durationSeconds: number = 30,
  ): Promise<boolean> {
    const result = await db
      .update(automationExecutionState)
      .set({
        workerId,
        leaseExpiresAt: sql`NOW() + interval '${sql.raw(durationSeconds.toString())} seconds'`,
      })
      .where(
        and(
          eq(automationExecutionState.runId, runId),
          sql`(lease_expires_at IS NULL OR lease_expires_at < NOW())`,
        ),
      )
      .returning();

    return result.length > 0;
  }

  /**
   * Heartbeat to renew an existing lease.
   */
  async renewLease(
    runId: string,
    workerId: string,
    durationSeconds: number = 30,
  ): Promise<void> {
    const result = await db
      .update(automationExecutionState)
      .set({
        leaseExpiresAt: sql`NOW() + interval '${sql.raw(durationSeconds.toString())} seconds'`,
      })
      .where(
        and(
          eq(automationExecutionState.runId, runId),
          eq(automationExecutionState.workerId, workerId),
        ),
      )
      .returning();

    if (result.length === 0) {
      throw new LeaseExpiredError(`Lost lease for run ${runId}`);
    }
  }

  /**
   * Releases the lease so another worker or the next step can acquire it cleanly.
   */
  async releaseLease(runId: string, workerId: string): Promise<void> {
    await db
      .update(automationExecutionState)
      .set({ workerId: null, leaseExpiresAt: null })
      .where(
        and(
          eq(automationExecutionState.runId, runId),
          eq(automationExecutionState.workerId, workerId),
        ),
      );
  }

  /**
   * Offloads payloads to object storage if they exceed the size threshold.
   */
  private async offloadPayloadIfLarge(payload: any): Promise<any> {
    const payloadString = JSON.stringify(payload);
    if (Buffer.byteLength(payloadString, "utf8") > MAX_PAYLOAD_SIZE_BYTES) {
      // Mock Object Storage upload (e.g. AWS S3)
      const objectKey = `payloads/automation_${crypto.randomUUID()}.json`;
      console.log(`Offloading large payload to ${objectKey}`);
      return { _offloaded: true, objectKey };
    }
    return payload;
  }

  /**
   * Executes a step within a workflow, with heartbeat wrapped.
   */
  async executeStep(
    context: ExecutionContext,
    plan: CompiledExecutablePlan,
    stepId: string,
  ) {
    const heartbeatInterval = setInterval(() => {
      this.renewLease(context.runId, context.workerId).catch((err) => {
        console.error("Failed to renew lease:", err);
      });
    }, 10000); // 10s heartbeat

    try {
      const node = plan.executionGraph[stepId];
      if (!node)
        throw new Error(`Step ${stepId} not found in executable plan.`);

      // Execute Action logic here...
      const actionResult = {
        success: true,
        generatedData: { someLargeData: "..." },
      };

      // Evaluate next steps (Parallel / Sequential)
      if (actionResult.success) {
        for (const nextNodeId of node.nextNodes) {
          const payloadToEnqueue = await this.offloadPayloadIfLarge({
            context,
            generatedData: actionResult.generatedData,
          });

          await this.queueProvider.enqueue("automation_execution", {
            id: crypto.randomUUID(),
            runId: context.runId,
            actionId: nextNodeId,
            payload: payloadToEnqueue,
            retryCount: 0,
          });
        }
      } else {
        await this.triggerCompensation(context, plan, stepId);
      }
    } finally {
      clearInterval(heartbeatInterval);
      await this.releaseLease(context.runId, context.workerId).catch(
        console.error,
      );
    }
  }

  /**
   * Resolves the reverse execution path for compensations.
   */
  async triggerCompensation(
    context: ExecutionContext,
    plan: CompiledExecutablePlan,
    failedStepId: string,
  ) {
    console.log(
      `Triggering compensation for run ${context.runId} starting from step ${failedStepId}`,
    );
  }
}
