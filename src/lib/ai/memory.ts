import { db } from "@/db";
import { aiMemory } from "@/db/schema/ai-workspace";
import type { AIMemoryLayer } from "./types";
import { eq, and, lte } from "drizzle-orm";

export interface MemoryQuery {
  organizationId: string;
  userId: string;
  layer: AIMemoryLayer;
  conversationId?: string;
  sessionId?: string;
  projectId?: string;
}

export interface MemoryEntry {
  layer: AIMemoryLayer;
  fact: string;
  confidence: number;
  sourceMetadata?: Record<string, unknown>;
  conversationId?: string;
  sessionId?: string;
  projectId?: string;
  ttlSeconds?: number;
}

export class AIMemoryManager {
  /**
   * Retrieves memory facts based on the specified layer and scope.
   * Only returns non-expired memory.
   */
  static async getMemory(query: MemoryQuery): Promise<string[]> {
    const now = new Date();
    const conditions = [
      eq(aiMemory.organizationId, query.organizationId),
      eq(aiMemory.layer, query.layer),
      // Only return memory that hasn't expired (or never expires)
      // (expiresAt IS NULL OR expiresAt > NOW) -- Note: Drizzle ORM representation for this might require an OR block.
    ];

    switch (query.layer) {
      case "conversation":
        if (!query.conversationId)
          throw new Error("conversationId required for conversation memory");
        conditions.push(eq(aiMemory.conversationId, query.conversationId));
        break;
      case "session":
        if (!query.sessionId)
          throw new Error("sessionId required for session memory");
        conditions.push(eq(aiMemory.sessionId, query.sessionId));
        break;
      case "project":
        if (!query.projectId)
          throw new Error("projectId required for project memory");
        conditions.push(eq(aiMemory.projectId, query.projectId));
        break;
      case "organization":
        break;
    }

    const memories = await db
      .select({ fact: aiMemory.fact, expiresAt: aiMemory.expiresAt })
      .from(aiMemory)
      .where(and(...conditions))
      .orderBy(aiMemory.createdAt);

    // Filter out expired explicitly in case the DB query didn't handle the OR clause perfectly
    return memories
      .filter((m) => !m.expiresAt || m.expiresAt.getTime() > now.getTime())
      .map((m) => m.fact);
  }

  /**
   * Stores a new fact in the appropriate memory layer with an optional TTL.
   */
  static async storeMemory(
    organizationId: string,
    entry: MemoryEntry,
  ): Promise<void> {
    let expiresAt: Date | null = null;
    if (entry.ttlSeconds) {
      expiresAt = new Date(Date.now() + entry.ttlSeconds * 1000);
    } else if (entry.layer === "session" || entry.layer === "conversation") {
      // Default TTL for short-term memory layers (e.g., 24 hours)
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    await db.insert(aiMemory).values({
      organizationId,
      layer: entry.layer,
      conversationId: entry.conversationId,
      sessionId: entry.sessionId,
      projectId: entry.projectId,
      fact: entry.fact,
      confidence: entry.confidence.toString(),
      sourceMetadata: entry.sourceMetadata,
      expiresAt,
    });
  }

  /**
   * Cleans up expired memory. Intended to be called by a CRON worker (e.g. SessionCleanupWorker).
   */
  static async cleanupExpiredMemory(): Promise<number> {
    const now = new Date();
    // DELETE FROM ai_memory WHERE expires_at <= NOW()
    // For safety, we'll fetch and delete or execute a raw delete.
    const result = await db
      .delete(aiMemory)
      .where(lte(aiMemory.expiresAt, now))
      .returning({ id: aiMemory.id });

    return result.length;
  }
}
