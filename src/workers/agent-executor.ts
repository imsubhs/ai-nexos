import { transitionRunState } from "@/lib/agents/engine/executor";
import { getActivePlan } from "@/lib/agents/engine/planner";
import { createImmutableContextSnapshot } from "@/lib/agents/engine/context";
import { getToolManifest, validateToolExecution } from "@/lib/agents/tools/manifest";
import { db } from "@/db";
import { 
  aiAgentExecutionSteps, 
  aiAgentToolUsage, 
  aiAgentCheckpointLedger, 
  aiAgentHumanApprovals,
  aiAgentExecutionRuns
} from "@/db/schema";
import { eq } from "drizzle-orm";
// Real Module 17 integration
import { QueueProvider, InMemoryQueueProvider } from "@/lib/automation/queue";

// Initialize Module 17 services
const queueProvider: QueueProvider = new InMemoryQueueProvider(); // Assuming default config

/**
 * Worker function for background DAG execution.
 */
export async function handleAgentExecutionJob(jobData: { runId: string, agentId: string }) {
  if (process.env.DEMO_MODE === "true") {
    console.log("[Demo Mode] Mocking agent execution job:", jobData);
    return;
  }

  const { runId, agentId } = jobData;

  try {
    await transitionRunState(runId, "RUNNING");

    const activePlan = await getActivePlan(runId);
    if (!activePlan) {
      throw new Error("No active plan found for run.");
    }

    const { plan, steps } = activePlan;
    
    // DAG Scheduling State
    const completedStepIds = new Set<string>();
    const runningStepIds = new Set<string>();
    const pendingSteps = [...steps];
    
    const MAX_CONCURRENCY = 5;

    // Cycle detection and topological resolution
    const resolveDAG = () => {
      return pendingSteps.filter(step => {
        const deps = (step.dependencies as string[]) || [];
        return deps.every(dep => completedStepIds.has(dep));
      });
    };

    while (pendingSteps.length > 0) {
      const readySteps = resolveDAG();
      
      // Cycle protection
      if (readySteps.length === 0 && runningStepIds.size === 0) {
        throw new Error("DAG cycle detected or unresolved dependencies. Execution halted.");
      }

      // Concurrency limit
      const stepsToStart = readySteps.slice(0, MAX_CONCURRENCY - runningStepIds.size);
      
      const executionPromises = stepsToStart.map(async (step) => {
        runningStepIds.add(step.id);
        const index = pendingSteps.findIndex(s => s.id === step.id);
        if (index > -1) pendingSteps.splice(index, 1);

        // 1. Create DB Record for Step
        const [executionStep] = await db
          .insert(aiAgentExecutionSteps)
          .values({
            organizationId: plan.organizationId,
            runId,
            planStepId: step.id,
            status: "RUNNING"
          })
          .returning();

        // 2. Context Snapshot
        const contextData = {
          agentId,
          timestamp: new Date().toISOString(),
          // Add gathered working memory here
        };
        await createImmutableContextSnapshot(
          plan.organizationId,
          executionStep.id,
          contextData
        );

        // 3. Confidence Evaluation & Runtime Threshold Enforcement
        if (step.confidenceThreshold === "abort") {
          throw new Error(`Step ${step.id} has abort threshold. Halting run.`);
        }
        
        if (step.confidenceThreshold === "human_approval") {
          await db
            .insert(aiAgentHumanApprovals)
            .values({
              organizationId: plan.organizationId,
              stepId: executionStep.id,
              status: "WAITING_FOR_APPROVAL"
            });
          
          await transitionRunState(runId, "WAITING_FOR_APPROVAL");
          throw new Error("PAUSED_FOR_APPROVAL");
        }

        // 4. Runtime Tool Manifest Validation
        const manifest = await getToolManifest(agentId, step.actionName);
        if (manifest) {
           const validation = validateToolExecution(manifest, contextData);
           if (!validation.valid) {
             throw new Error(`Tool validation failed for ${step.actionName}: ${validation.errors.join(", ")}`);
           }
        }

        // 5. Delegate to Automation Engine (Module 17)
        // Since we are executing a single tool/action, we enqueue it as a workflow payload
        await queueProvider.enqueue("automation_execution", {
            id: crypto.randomUUID(),
            runId,
            actionId: step.actionName,
            payload: contextData,
            retryCount: 0
        });

        const automationResult = { status: "enqueued_in_module_17" };

        // 6. Update step status and Tool Usage Ledger
        await db
          .update(aiAgentExecutionSteps)
          .set({ status: "COMPLETED" })
          .where(eq(aiAgentExecutionSteps.id, executionStep.id));

        await db
          .insert(aiAgentToolUsage)
          .values({
            organizationId: plan.organizationId,
            stepId: executionStep.id,
            toolName: step.actionName,
            inputPayload: contextData,
            outputPayload: automationResult
          });
          
        completedStepIds.add(step.id);
        runningStepIds.delete(step.id);

        // 7. Structured Agent Checkpoint Ledger
        await db
          .insert(aiAgentCheckpointLedger)
          .values({
            organizationId: plan.organizationId,
            runId,
            planVersionReference: plan.id,
            completedSteps: Array.from(completedStepIds),
            pendingSteps: pendingSteps.map(s => s.id),
            contextSnapshot: contextData,
            automationReferences: [{ action: step.actionName, status: automationResult.status }],
          });
      });

      // Wait for at least one step in the current batch to complete
      await Promise.all(executionPromises);
    }

    // Ensure state hasn't been changed to PAUSED_FOR_APPROVAL by checking DB state
    const [currentRun] = await db.select({ status: aiAgentExecutionRuns.status }).from(aiAgentExecutionRuns).where(eq(aiAgentExecutionRuns.id, runId));
    if (currentRun.status === "RUNNING") {
        await transitionRunState(runId, "COMPLETED");
    }

  } catch (error: unknown) {
    if (error instanceof Error && error.message === "PAUSED_FOR_APPROVAL") {
      console.log(`Agent run ${runId} paused for human approval.`);
      return;
    }
    
    console.error(`Agent run ${runId} failed:`, error);
    await transitionRunState(runId, "FAILED");
  }
}
