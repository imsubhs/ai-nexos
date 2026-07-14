import { z } from "zod";
import type { 
  aiCapabilityEnum, 
  aiProviderEnum,
  aiMemoryLayerEnum,
  aiApprovalStatusEnum
} from "@/db/schema/enums";

// AI Core Type Exports based on Enums
export type AICapability = typeof aiCapabilityEnum.enumValues[number];
export type AIProvider = typeof aiProviderEnum.enumValues[number];
export type AIMemoryLayer = typeof aiMemoryLayerEnum.enumValues[number];
export type AIApprovalStatus = typeof aiApprovalStatusEnum.enumValues[number];

// Context Budgeting interfaces
export interface ContextBudget {
  maxTokens: number;
  remainingTokens: number;
  priorityWeights: Record<string, number>; // e.g., { 'project_brief': 10, 'recent_messages': 8 }
}

export interface ContextItem {
  id: string;
  sourceType: string;
  content: string;
  relevanceScore: number; // 0.0 to 1.0
  tokenCount: number;
}

// Tool Schema interfaces
export const ToolArgumentSchema = z.object({
  type: z.enum(["string", "number", "boolean", "object", "array"]),
  description: z.string(),
  required: z.boolean().default(false),
  properties: z.record(z.string(), z.any()).optional(), // For object types
  items: z.any().optional(), // For array types
});

export const ToolDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(z.string(), ToolArgumentSchema),
  permissions: z.array(z.string()).optional(), // Required permission strings
  timeoutMs: z.number().default(5000),
  costPerRun: z.number().optional()
});

export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

// AI Skill Registry Interfaces
export interface AISkill {
  id: string;
  name: string;
  capability: AICapability;
  promptTemplateId: string;
  allowedTools: string[]; // Tool IDs
  allowedModels: string[]; // Model Profile IDs
  permissions: string[];
}

// Cost Governance
export interface BudgetStatus {
  layer: AIMemoryLayer; // Org, Project, Session, Conv layer concept applied to budgeting
  entityId: string;
  limitInUsd: number;
  currentSpendInUsd: number;
  isExceeded: boolean;
}

// Model Routing
export interface ModelRoutingRequest {
  capability: AICapability;
  minContextWindow: number;
  maxCostPer1kTokens?: number;
  providerPreference?: AIProvider;
}

// Metadata for Replay
export interface ExecutionMetadata {
  provider: AIProvider;
  modelProfileId: string;
  promptVersionId: string;
  parameters: Record<string, unknown>;
  latencyMs: number;
  toolCalls: {
    toolId: string;
    arguments: Record<string, unknown>;
    result: unknown;
    status: AIApprovalStatus;
  }[];
}
