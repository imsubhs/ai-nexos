"use server";

import { db } from "@/db";
import { aiAgents, aiAgentExecutionRuns, aiAgentSessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { transitionRunState } from "./engine/executor";
// Assuming there's a queue service in Module 12 or 17
// import { enqueueAgentJob } from "@/lib/platform/queue";

export async function createAgentAction(data: {
  organizationId: string;
  name: string;
  description?: string;
}) {
  const [agent] = await db
    .insert(aiAgents)
    .values({
      organizationId: data.organizationId,
      name: data.name,
      description: data.description,
    })
    .returning();
  return agent;
}

export async function startAgentRunAction(
  organizationId: string,
  agentId: string,
  goalId: string,
  userId: string
) {
  // 1. Create Session
  const [session] = await db
    .insert(aiAgentSessions)
    .values({
      organizationId,
      agentId,
      userId,
      status: "CREATED",
    })
    .returning();

  // 2. Create Run
  const [run] = await db
    .insert(aiAgentExecutionRuns)
    .values({
      organizationId,
      goalId,
      sessionId: session.id,
      status: "CREATED",
    })
    .returning();


  // 3. Transition to PLANNING and enqueue
  await transitionRunState(run.id, "PLANNING");
  
  // enqueueAgentJob({ runId: run.id, type: "plan" });

  return run;
}

export async function pauseAgentRunAction(runId: string) {
  return await transitionRunState(runId, "PAUSED");
}

export async function resumeAgentRunAction(runId: string) {
  return await transitionRunState(runId, "RUNNING");
}

export async function cancelAgentRunAction(runId: string) {
  return await transitionRunState(runId, "CANCELLED");
}
