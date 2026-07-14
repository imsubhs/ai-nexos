import { db } from "@/db";
import { aiAgentContext } from "@/db/schema";

export type ContextData = Record<string, any>;

/**
 * Persists an immutable context snapshot for a specific execution step.
 * This guarantees that we know exactly what data the agent used to make a decision.
 */
export async function createImmutableContextSnapshot(
  organizationId: string,
  stepId: string,
  contextData: ContextData
) {
  const [snapshot] = await db
    .insert(aiAgentContext)
    .values({
      organizationId,
      stepId,
      contextSnapshot: contextData,
      isImmutable: true,
    })
    .returning();
    
  return snapshot;
}
