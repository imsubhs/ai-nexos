import { db } from "@/db";
import { aiAgents, aiAgentExecutionRuns, aiAgentSessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireCurrentUser } from "@/features/auth/current-user";
import { requirePermission } from "@/features/permissions";
import { transitionRunState, type AgentState } from "./engine/executor";
// Assuming there's a queue service in Module 12 or 17
// import { enqueueAgentJob } from "@/lib/platform/queue";

/**
 * AI agent server actions.
 *
 * As written, none of these authenticated the caller, and the identifiers that
 * decide *whose* data is touched arrived as arguments:
 *
 *   · `createAgentAction` took `organizationId`, so an agent could be created
 *     inside any tenant.
 *   · `startAgentRunAction` took both `organizationId` and `userId` — the
 *     session row records who initiated an agent run, so a caller could
 *     attribute their run to any user in any organisation. That is
 *     impersonation in the audit trail of a subsystem that executes tools on
 *     the platform's behalf.
 *   · `pauseAgentRunAction`, `resumeAgentRunAction` and
 *     `cancelAgentRunAction` took a bare `runId` and transitioned it with no
 *     ownership check at all, so any run id controlled any tenant's run.
 *
 * Both identifiers now come from the authenticated session, and every
 * state transition first proves the run belongs to the caller's organisation.
 */

export async function createAgentAction(data: {
  name: string;
  description?: string;
}) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "ai", "create");

  const [agent] = await db
    .insert(aiAgents)
    .values({
      organizationId: user.organizationId,
      name: data.name,
      description: data.description,
    })
    .returning();
  return agent;
}

export async function startAgentRunAction(agentId: string, goalId: string) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "ai", "create");

  // The agent must belong to the caller's organisation. Without this, a known
  // agent id from another tenant could be run — and it is that tenant's tools
  // and context the agent would execute against.
  const [agent] = await db
    .select({ id: aiAgents.id })
    .from(aiAgents)
    .where(
      and(
        eq(aiAgents.id, agentId),
        eq(aiAgents.organizationId, user.organizationId),
      ),
    )
    .limit(1);

  if (!agent) throw new Error("Agent not found.");

  // 1. Create Session
  const [session] = await db
    .insert(aiAgentSessions)
    .values({
      organizationId: user.organizationId,
      agentId,
      userId: user.userId,
      status: "CREATED",
    })
    .returning();

  // 2. Create Run
  const [run] = await db
    .insert(aiAgentExecutionRuns)
    .values({
      organizationId: user.organizationId,
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
  return transitionOwnedRun(runId, "PAUSED");
}

export async function resumeAgentRunAction(runId: string) {
  return transitionOwnedRun(runId, "RUNNING");
}

export async function cancelAgentRunAction(runId: string) {
  return transitionOwnedRun(runId, "CANCELLED");
}

/**
 * Transitions a run after proving the caller's organisation owns it.
 *
 * Shared rather than repeated three times: the ownership check is the whole
 * control here, and three copies is three chances for one to be dropped.
 */
async function transitionOwnedRun(runId: string, state: AgentState) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "ai", "update");

  const [run] = await db
    .select({ id: aiAgentExecutionRuns.id })
    .from(aiAgentExecutionRuns)
    .where(
      and(
        eq(aiAgentExecutionRuns.id, runId),
        eq(aiAgentExecutionRuns.organizationId, user.organizationId),
      ),
    )
    .limit(1);

  if (!run) throw new Error("Agent run not found.");

  return transitionRunState(runId, state);
}
