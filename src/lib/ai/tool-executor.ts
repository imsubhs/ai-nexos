import { db } from "@/db";
import { aiToolCalls, aiTools } from "@/db/schema/ai-workspace";
import type { AIApprovalStatus } from "./types";
import { eq } from "drizzle-orm";

export interface ToolCallRequest {
  id: string; 
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolCallResult {
  toolCallId: string;
  result: unknown;
  status: AIApprovalStatus;
  executionTimeMs: number;
}

export class ToolExecutor {
  /**
   * Evaluates tools requested by the LLM. 
   * If a tool requires human approval, it halts execution and persists the pending tool call.
   */
  static async processToolCalls(
    messageId: string,
    calls: ToolCallRequest[],
    _organizationId: string,
    _userId: string
  ): Promise<{ results: ToolCallResult[], pendingHumanApproval: boolean }> {
    const results: ToolCallResult[] = [];
    let pendingHumanApproval = false;

    for (const call of calls) {
      const startTime = Date.now();
      
      const toolDef = await db.query.aiTools.findFirst({
        where: eq(aiTools.name, call.name)
      });

      if (!toolDef) {
        results.push({
          toolCallId: call.id,
          result: { error: `Tool ${call.name} not found or not registered.` },
          status: "rejected",
          executionTimeMs: Date.now() - startTime
        });
        continue;
      }

      // Check if tool requires approval (In real logic, we'd check permissions/Module 09 rules)
      const permissions = toolDef.permissions as string[] | null;
      const requiresApproval = permissions && permissions.includes("require_human_approval");
      
      let status: AIApprovalStatus = requiresApproval ? "pending_human" : "auto_approved";
      let executionResult: unknown = null;

      if (status === "auto_approved") {
        try {
          executionResult = { success: true, data: `Executed ${call.name}` };
        } catch (e: unknown) {
          const err = e as Error;
          executionResult = { error: err.message };
          status = "rejected";
        }
      } else {
        pendingHumanApproval = true;
        executionResult = { message: "Execution paused pending human approval via Module 09." };
        
        // In real execution, we would dispatch an Event to Module 09 here:
        // EventEngine.emit("approval_requested", { entityType: "ai_tool_call", ... })
      }

      // Persist the tool call in DB for auditing AND resumption
      await db.insert(aiToolCalls).values({
        messageId,
        toolId: toolDef.id,
        arguments: call.arguments,
        result: executionResult,
        status,
        executionTimeMs: Date.now() - startTime
      }).returning({ id: aiToolCalls.id });

      results.push({
        toolCallId: call.id,
        result: executionResult,
        status,
        executionTimeMs: Date.now() - startTime
      });
    }

    return { results, pendingHumanApproval };
  }
}
