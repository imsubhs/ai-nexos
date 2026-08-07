import { db } from "@/db";
import { aiConversations, aiMessages } from "@/db/schema/ai-workspace";
import type { AICapability } from "./types";
import { AIGuardrails } from "./guardrails";
import { ContextBuilder } from "./context-builder";
import { routeModel } from "./model-router";
import { executeProvider } from "./provider-factory";
import { ToolExecutor } from "./tool-executor";
import { isDemoMode } from "@/lib/env.server";

export interface GatewayRequest {
  organizationId: string;
  userId: string;
  sessionId?: string;
  projectId?: string;
  conversationId?: string;
  capability: AICapability;
  messageContent: string;
  contextReferences?: string[];
}

export interface GatewayResponse {
  messageId: string;
  conversationId: string;
  content: string;
  toolCallsMade: number;
  status: "completed" | "paused_for_approval";
}

export class AIExecutionGateway {
  static async processRequest(req: GatewayRequest): Promise<GatewayResponse> {
    if (isDemoMode()) {
      return {
        messageId: `mock-msg-${Date.now()}`,
        conversationId: req.conversationId || `mock-conv-${Date.now()}`,
        content:
          "This is a mocked response from the AI Execution Gateway in Demo Mode. Real AI APIs are currently bypassed.",
        toolCallsMade: 0,
        status: "completed",
      };
    }

    // 1. Resolve or Create Conversation
    let conversationId = req.conversationId;
    if (!conversationId) {
      const [newConv] = await db
        .insert(aiConversations)
        .values({
          organizationId: req.organizationId,
          sessionId: req.sessionId,
          projectId: req.projectId,
          title: "New AI Conversation",
        })
        .returning({ id: aiConversations.id });
      conversationId = newConv.id;
    }

    // 2. Save User Message
    const [userMessage] = await db
      .insert(aiMessages)
      .values({
        conversationId,
        role: "user",
        content: req.messageContent,
      })
      .returning({ id: aiMessages.id });

    // 3. Prompt Firewall
    const isSafe = await AIGuardrails.validatePrompt(
      req.messageContent,
      req.organizationId,
    );
    if (!isSafe) {
      throw new Error("Request blocked by AI Prompt Firewall.");
    }

    // 4. Context Budgeting & Builder
    const context = await ContextBuilder.build({
      organizationId: req.organizationId,
      userId: req.userId,
      projectId: req.projectId,
      conversationId,
      references: req.contextReferences || [],
    });

    // 5. AI Capability Profiles & Model Router
    const routedModel = await routeModel({
      capability: req.capability,
      minContextWindow: context.totalTokens + 1000,
    });

    if (!routedModel) {
      throw new Error("No suitable AI Model Profile found.");
    }

    // 6. Execution via Provider Factory
    const startTime = Date.now();
    let providerResponse = await executeProvider(
      routedModel,
      context,
      req.messageContent,
    );
    let finalStatus: "completed" | "paused_for_approval" = "completed";
    let toolCallsProcessed = 0;

    let assistantMessageId: string;

    // 7. Process Tool Calls (if any)
    if (providerResponse.toolCalls && providerResponse.toolCalls.length > 0) {
      const [assistantMessage] = await db
        .insert(aiMessages)
        .values({
          conversationId,
          role: "assistant",
          content: providerResponse.content,
          functionCall: providerResponse.toolCalls as unknown,
        })
        .returning({ id: aiMessages.id });
      assistantMessageId = assistantMessage.id;

      const { results, pendingHumanApproval } =
        await ToolExecutor.processToolCalls(
          assistantMessage.id,
          providerResponse.toolCalls,
          req.organizationId,
          req.userId,
        );

      toolCallsProcessed = results.length;

      if (pendingHumanApproval) {
        finalStatus = "paused_for_approval";
      } else {
        context.appendToolResults(results);
        providerResponse = await executeProvider(routedModel, context, null);

        await db.insert(aiMessages).values({
          conversationId,
          role: "assistant",
          content: providerResponse.content,
        });
      }
    } else {
      const [assistantMessage] = await db
        .insert(aiMessages)
        .values({
          conversationId,
          role: "assistant",
          content: providerResponse.content,
        })
        .returning({ id: aiMessages.id });
      assistantMessageId = assistantMessage.id;
    }

    // 8. Dispatch Execution Logs & Token Usage asynchronously via Events (Scalability)
    const latencyMs = Date.now() - startTime;

    // In a real environment, we call EventEngine.emit() to let a background worker
    // insert into ai_token_usage and ai_execution_logs to avoid blocking the API response.
    this.dispatchAuditLogsAsync({
      organizationId: req.organizationId,
      messageId: assistantMessageId,
      provider: routedModel.primary.providerId,
      modelProfileId: routedModel.primary.id,
      parameters: providerResponse.parametersUsed,
      latencyMs,
      tokens: {
        promptTokens: context.totalTokens,
        completionTokens: 250, // Estimated
      },
    });

    return {
      messageId: userMessage.id,
      conversationId,
      content: providerResponse.content,
      toolCallsMade: toolCallsProcessed,
      status: finalStatus,
    };
  }

  static async resumeExecution(
    _toolCallId: string,
    _approvalStatus: string,
    _approverId: string,
  ) {
    // 1. Fetch persisted tool call and update status
    // 2. Fetch original context and conversation
    // 3. Inject approval status/result back into context
    // 4. Trigger second-pass LLM execution
    // 5. Stream or notify user of completion
  }

  private static dispatchAuditLogsAsync(payload: unknown) {
    // Non-blocking fire-and-forget payload dispatch to Module 12
    console.log(
      "Async dispatching AI Execution logs to EventEngine...",
      payload,
    );
  }
}
