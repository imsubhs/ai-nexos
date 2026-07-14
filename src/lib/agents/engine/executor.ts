import { db } from "@/db";
import { aiAgentExecutionRuns } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { agentStateEnum } from "@/db/schema";

export type AgentState = "CREATED" | "PLANNING" | "WAITING_FOR_APPROVAL" | "READY" | "RUNNING" | "PAUSED" | "REPLANNING" | "COMPLETED" | "FAILED" | "CANCELLED";

// Define the valid transitions in the Agent State Machine
const VALID_TRANSITIONS: Record<AgentState, AgentState[]> = {
  CREATED: ["PLANNING", "CANCELLED"],
  PLANNING: ["READY", "FAILED", "CANCELLED"],
  READY: ["RUNNING", "CANCELLED"],
  RUNNING: ["WAITING_FOR_APPROVAL", "PAUSED", "REPLANNING", "COMPLETED", "FAILED", "CANCELLED"],
  WAITING_FOR_APPROVAL: ["RUNNING", "FAILED", "CANCELLED"],
  PAUSED: ["RUNNING", "CANCELLED"],
  REPLANNING: ["READY", "FAILED", "CANCELLED"],
  COMPLETED: [], // Terminal state
  FAILED: [],    // Terminal state
  CANCELLED: []  // Terminal state
};

export class InvalidStateTransitionError extends Error {
  constructor(currentState: AgentState, targetState: AgentState) {
    super(`Invalid transition from ${currentState} to ${targetState}`);
    this.name = "InvalidStateTransitionError";
  }
}

/**
 * Transitions the execution run to a new state if valid.
 */
export async function transitionRunState(runId: string, newState: AgentState) {
  return await db.transaction(async (tx) => {
    // 1. Fetch current state
    const [run] = await tx
      .select({ status: aiAgentExecutionRuns.status })
      .from(aiAgentExecutionRuns)
      .where(eq(aiAgentExecutionRuns.id, runId));

    if (!run) {
      throw new Error(`Execution run ${runId} not found`);
    }

    const currentState = run.status as AgentState;

    // 2. Validate transition
    const allowedTransitions = VALID_TRANSITIONS[currentState];
    if (!allowedTransitions.includes(newState)) {
      throw new InvalidStateTransitionError(currentState, newState);
    }

    // 3. Apply transition
    const updateData: any = { status: newState };
    
    // Set completedAt for terminal states
    if (newState === "COMPLETED" || newState === "FAILED" || newState === "CANCELLED") {
      updateData.completedAt = new Date();
    }
    
    // Set startedAt when first transitioning to RUNNING
    if (newState === "RUNNING" && currentState === "READY") {
       // Only set if not already set, although for simplicity we could check if it's null in DB
       updateData.startedAt = new Date();
    }

    const [updatedRun] = await tx
      .update(aiAgentExecutionRuns)
      .set(updateData)
      .where(eq(aiAgentExecutionRuns.id, runId))
      .returning();

    return updatedRun;
  });
}
