import { db } from "@/db";
import { aiAgentMemory } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

/**
 * Service to automatically compact obsolete working memory into structured summaries.
 * This prevents the context window from blowing up over long agent sessions.
 */
export async function compactWorkingMemory(
  organizationId: string,
  agentId: string,
  sessionId: string,
  summarizationFn: (memories: string[]) => Promise<string>,
) {
  // 1. Fetch uncompacted working memories for the session
  const uncompactedMemories = await db
    .select()
    .from(aiAgentMemory)
    .where(
      and(
        eq(aiAgentMemory.sessionId, sessionId),
        eq(aiAgentMemory.memoryType, "working"),
        eq(aiAgentMemory.isCompacted, false),
      ),
    )
    .orderBy(asc(aiAgentMemory.createdAt));

  if (uncompactedMemories.length === 0) {
    return null; // Nothing to compact
  }

  // 2. Generate summary using the provided LLM function (from Module 16)
  const memoryTexts = uncompactedMemories.map((m) => m.summary);
  const compactedSummaryText = await summarizationFn(memoryTexts);

  return await db.transaction(async (tx) => {
    // 3. Mark old memories as compacted
    const memoryIds = uncompactedMemories.map((m) => m.id);
    for (const id of memoryIds) {
      await tx
        .update(aiAgentMemory)
        .set({ isCompacted: true })
        .where(eq(aiAgentMemory.id, id));
    }

    // 4. Insert the new structured summary as a single compacted memory entry
    const [compactedMemory] = await tx
      .insert(aiAgentMemory)
      .values({
        organizationId,
        agentId,
        sessionId,
        memoryType: "working", // The summary is still working memory for the session
        summary: compactedSummaryText,
        isCompacted: false, // The new summary itself is not compacted yet
      })
      .returning();

    return compactedMemory;
  });
}
