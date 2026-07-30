import { getDemoStore, logDemoActivity, nextDemoId, DEMO_USER_ID } from "@/lib/demo/store";
import type { createAgentAction as real_createAgentAction, startAgentRunAction as real_startAgentRunAction, pauseAgentRunAction as real_pauseAgentRunAction, resumeAgentRunAction as real_resumeAgentRunAction, cancelAgentRunAction as real_cancelAgentRunAction } from "./real-actions";

export async function createAgentAction(data: {
  organizationId: string;
  name: string;
  description?: string;
}): Promise<Awaited<ReturnType<typeof real_createAgentAction>>> {
  const store = getDemoStore();
  const newId = nextDemoId(store);
  
  const agent = {
    id: newId,
    organizationId: data.organizationId,
    name: data.name,
    description: data.description || null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    deletedAt: null,
    deletedBy: null,
    isArchived: false,
  };
  
  store.aiAgents.push(agent);
  
  logDemoActivity(
    store,
    "ai_agents",
    "create",
    "agent",
    newId,
    `Created AI Agent: ${agent.name}`
  );
  
  return agent as any;
}

export async function startAgentRunAction(
  organizationId: string,
  agentId: string,
  goalId: string,
  userId: string
): Promise<Awaited<ReturnType<typeof real_startAgentRunAction>>> {
  const store = getDemoStore();
  const sessionId = nextDemoId(store);
  const runId = nextDemoId(store);
  
  const session = {
    id: sessionId,
    organizationId,
    agentId,
    userId,
    status: "CREATED",
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    deletedAt: null,
    deletedBy: null,
    isArchived: false,
  };
  store.aiAgentSessions.push(session);
  
  const run = {
    id: runId,
    organizationId,
    goalId,
    sessionId,
    status: "PLANNING", // Transitioned
    startedAt: new Date(),
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    deletedAt: null,
    deletedBy: null,
    isArchived: false,
  };
  store.aiAgentExecutionRuns.push(run);
  
  logDemoActivity(
    store,
    "ai_agents",
    "start_run",
    "run",
    runId,
    `Started agent run for agent: ${agentId}`
  );
  
  return run as any;
}

function updateRunStatus(runId: string, status: string) {
  const store = getDemoStore();
  const run = store.aiAgentExecutionRuns.find(r => r.id === runId);
  if (run) {
    run.status = status;
    run.updatedAt = new Date();
    
    logDemoActivity(
      store,
      "ai_agents",
      "update_status",
      "run",
      runId,
      `Transitioned run to ${status}`
    );
    return run;
  }
  throw new Error("Run not found in DemoStore");
}

export async function pauseAgentRunAction(runId: string): Promise<Awaited<ReturnType<typeof real_pauseAgentRunAction>>> {
  return updateRunStatus(runId, "PAUSED") as any;
}

export async function resumeAgentRunAction(runId: string): Promise<Awaited<ReturnType<typeof real_resumeAgentRunAction>>> {
  return updateRunStatus(runId, "RUNNING") as any;
}

export async function cancelAgentRunAction(runId: string): Promise<Awaited<ReturnType<typeof real_cancelAgentRunAction>>> {
  return updateRunStatus(runId, "CANCELLED") as any;
}
