import { db } from "@/db";
import { aiContexts } from "@/db/schema/ai-workspace";
import { projects } from "@/db/schema/projects";
import type { ContextItem, ContextBudget } from "./types";
import { ContextBudgetManager } from "./context-budget";
import { eq, and } from "drizzle-orm";

export interface ContextBuilderRequest {
  organizationId: string;
  userId: string;
  projectId?: string;
  conversationId: string;
  references: string[];
}

export class ExecutionContext {
  public rawItems: ContextItem[] = [];
  public finalItems: ContextItem[] = [];
  public totalTokens: number = 0;
  private messageId: string | null = null;

  constructor(public readonly organizationId: string) {}

  appendToolResults(results: unknown[]) {
    const toolResultString = JSON.stringify(results, null, 2);
    this.finalItems.push({
      id: "tool_results_" + Date.now(),
      sourceType: "tool_execution",
      content: toolResultString,
      relevanceScore: 1.0,
      tokenCount: Math.ceil(toolResultString.length / 4),
    });
    this.totalTokens += Math.ceil(toolResultString.length / 4);
  }

  get formattedString(): string {
    return this.finalItems
      .map((item) => `[Source: ${item.sourceType}]\n${item.content}`)
      .join("\n\n");
  }

  async persist(messageId: string) {
    this.messageId = messageId;
    await db.insert(aiContexts).values({
      messageId,
      rawContext: this.rawItems,
      compressedContext: this.finalItems,
      totalTokens: this.totalTokens,
    });
  }
}

export class ContextBuilder {
  /**
   * Main function to build execution context for the LLM.
   * STRICLY ENFORCES TENANT BOUNDARIES: Will not fetch context outside of the requested organizationId.
   */
  static async build(req: ContextBuilderRequest): Promise<ExecutionContext> {
    const context = new ExecutionContext(req.organizationId);
    const rawItems: ContextItem[] = [
      {
        id: "sys_time",
        sourceType: "system",
        content: `Current time: ${new Date().toISOString()}`,
        relevanceScore: 1.0,
        tokenCount: 15,
      },
    ];

    // Security: Enforce tenant boundary dynamically here before injecting Project Context
    if (req.projectId) {
      const project = await db.query.projects.findFirst({
        where: and(
          eq(projects.projectId, req.projectId),
          eq(projects.organizationId, req.organizationId), // Tenant boundary enforcement!
        ),
      });

      if (!project) {
        throw new Error(
          `Security Violation: Project ${req.projectId} does not exist or belongs to a different organization.`,
        );
      }

      rawItems.push({
        id: req.projectId,
        sourceType: "project",
        content: `Project Context: ${JSON.stringify(project)}`,
        relevanceScore: 0.9,
        tokenCount: Math.ceil(JSON.stringify(project).length / 4) + 10,
      });
    }

    context.rawItems = rawItems;

    const budget: ContextBudget = {
      maxTokens: 8000,
      remainingTokens: 8000,
      priorityWeights: {
        system: 1.0,
        project: 0.9,
        file: 0.8,
        meeting: 0.7,
      },
    };

    let budgetedItems = ContextBudgetManager.applyBudget(rawItems, budget);

    budgetedItems = await Promise.all(
      budgetedItems.map((item) => ContextBudgetManager.compressContext(item)),
    );

    context.finalItems = budgetedItems;
    context.totalTokens = budgetedItems.reduce(
      (acc, item) => acc + item.tokenCount,
      0,
    );

    return context;
  }
}
