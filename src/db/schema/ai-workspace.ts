import {
  pgTable,
  uuid,
  text,
  jsonb,
  integer,
  boolean,
  decimal,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { auditFields } from "./_shared";
import { organizations } from "./organizations";
import { users } from "./users";
import { projects } from "./projects";
import {
  aiCapabilityEnum,
  aiProviderEnum,
  aiMemoryLayerEnum,
  aiMessageRoleEnum,
  aiApprovalStatusEnum,
} from "./enums";

// AI Workspaces (Preferences and Settings)
export const aiWorkspaces = pgTable(
  "ai_workspaces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .references(() => organizations.organizationId)
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.userId)
      .notNull(),
    ...auditFields,
  },
  (table) => [
    index("ai_workspaces_org_idx").on(table.organizationId),
    index("ai_workspaces_user_idx").on(table.userId),
  ],
);

export const aiWorkspacePreferences = pgTable(
  "ai_workspace_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .references(() => aiWorkspaces.id)
      .notNull(),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    ...auditFields,
  },
  (table) => [index("ai_workspace_prefs_ws_idx").on(table.workspaceId)],
);

// AI Sessions (Groups of Conversations and temporary memory)
export const aiSessions = pgTable(
  "ai_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .references(() => organizations.organizationId)
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.userId)
      .notNull(),
    status: text("status").notNull().default("active"),
    ...auditFields,
  },
  (table) => [
    index("ai_sessions_org_idx").on(table.organizationId),
    index("ai_sessions_user_idx").on(table.userId),
  ],
);

// AI Conversations (Threads)
export const aiConversations = pgTable(
  "ai_conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .references(() => organizations.organizationId)
      .notNull(),
    sessionId: uuid("session_id").references(() => aiSessions.id),
    projectId: uuid("project_id").references(() => projects.projectId),
    title: text("title"),
    summary: text("summary"),
    ...auditFields,
  },
  (table) => [
    index("ai_conversations_org_idx").on(table.organizationId),
    index("ai_conversations_session_idx").on(table.sessionId),
    index("ai_conversations_project_idx").on(table.projectId),
  ],
);

// AI Messages
export const aiMessages = pgTable(
  "ai_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .references(() => aiConversations.id)
      .notNull(),
    role: aiMessageRoleEnum("role").notNull(),
    content: text("content"),
    name: text("name"),
    functionCall: jsonb("function_call"),
    ...auditFields,
  },
  (table) => [index("ai_messages_conv_idx").on(table.conversationId)],
);

// Execution Context
export const aiContexts = pgTable(
  "ai_contexts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    messageId: uuid("message_id")
      .references(() => aiMessages.id)
      .notNull(),
    rawContext: jsonb("raw_context"),
    compressedContext: jsonb("compressed_context"),
    totalTokens: integer("total_tokens"),
    budgetUsed: decimal("budget_used", { precision: 10, scale: 4 }),
    ...auditFields,
  },
  (table) => [index("ai_contexts_msg_idx").on(table.messageId)],
);

export const aiContextSources = pgTable(
  "ai_context_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contextId: uuid("context_id")
      .references(() => aiContexts.id)
      .notNull(),
    sourceType: text("source_type").notNull(),
    sourceId: text("source_id").notNull(), // Generic reference string/UUID
    relevanceScore: decimal("relevance_score", { precision: 5, scale: 4 }),
    ...auditFields,
  },
  (table) => [index("ai_context_sources_ctx_idx").on(table.contextId)],
);

// Execution Metadata
export const aiExecutionLogs = pgTable(
  "ai_execution_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    messageId: uuid("message_id")
      .references(() => aiMessages.id)
      .notNull(),
    provider: aiProviderEnum("provider"),
    modelProfileId: uuid("model_profile_id"),
    promptVersionId: uuid("prompt_version_id"),
    parameters: jsonb("parameters"),
    latencyMs: integer("latency_ms"),
    ...auditFields,
  },
  (table) => [
    index("ai_execution_logs_msg_idx").on(table.messageId),
    index("ai_execution_logs_model_idx").on(table.modelProfileId),
  ],
);

// Model Usage Tracking
export const aiModelUsage = pgTable(
  "ai_model_usage",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .references(() => organizations.organizationId)
      .notNull(),
    modelProfileId: uuid("model_profile_id").notNull(),
    date: timestamp("date").notNull(),
    totalRequests: integer("total_requests").default(0),
    totalErrors: integer("total_errors").default(0),
    ...auditFields,
  },
  (table) => [
    index("ai_model_usage_org_idx").on(table.organizationId),
    index("ai_model_usage_model_idx").on(table.modelProfileId),
  ],
);

export const aiTokenUsage = pgTable(
  "ai_token_usage",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .references(() => organizations.organizationId)
      .notNull(),
    messageId: uuid("message_id")
      .references(() => aiMessages.id)
      .notNull(),
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    ...auditFields,
  },
  (table) => [
    index("ai_token_usage_org_idx").on(table.organizationId),
    index("ai_token_usage_msg_idx").on(table.messageId),
  ],
);

export const aiCostTracking = pgTable(
  "ai_cost_tracking",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .references(() => organizations.organizationId)
      .notNull(),
    tokenUsageId: uuid("token_usage_id").references(() => aiTokenUsage.id),
    costInUsd: decimal("cost_in_usd", { precision: 12, scale: 6 })
      .notNull()
      .default("0"),
    ...auditFields,
  },
  (table) => [
    index("ai_cost_tracking_org_idx").on(table.organizationId),
    index("ai_cost_tracking_usage_idx").on(table.tokenUsageId),
  ],
);

// Memory Layers
export const aiMemory = pgTable(
  "ai_memory",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .references(() => organizations.organizationId)
      .notNull(),
    layer: aiMemoryLayerEnum("layer").notNull(),
    conversationId: uuid("conversation_id").references(
      () => aiConversations.id,
    ),
    sessionId: uuid("session_id").references(() => aiSessions.id),
    projectId: uuid("project_id").references(() => projects.projectId),
    fact: text("fact").notNull(),
    confidence: decimal("confidence", { precision: 5, scale: 4 }),
    sourceMetadata: jsonb("source_metadata"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    ...auditFields,
  },
  (table) => [
    index("ai_memory_org_idx").on(table.organizationId),
    index("ai_memory_conv_idx").on(table.conversationId),
    index("ai_memory_session_idx").on(table.sessionId),
    index("ai_memory_project_idx").on(table.projectId),
    index("ai_memory_expires_idx").on(table.expiresAt),
  ],
);

// Providers and Profiles
export const aiModelProviders = pgTable("ai_model_providers", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: aiProviderEnum("provider").notNull(),
  baseUrl: text("base_url"),
  isActive: boolean("is_active").default(true),
  ...auditFields,
});

export const aiModelProfiles = pgTable(
  "ai_model_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    providerId: uuid("provider_id")
      .references(() => aiModelProviders.id)
      .notNull(),
    modelName: text("model_name").notNull(),
    capability: aiCapabilityEnum("capability").notNull(),
    contextWindow: integer("context_window").notNull(),
    costPer1kPrompt: decimal("cost_per_1k_prompt", { precision: 12, scale: 6 }),
    costPer1kCompletion: decimal("cost_per_1k_completion", {
      precision: 12,
      scale: 6,
    }),
    isDefault: boolean("is_default").default(false),
    isActive: boolean("is_active").default(true),
    ...auditFields,
  },
  (table) => [index("ai_model_profiles_prov_idx").on(table.providerId)],
);

export const aiModelLimits = pgTable(
  "ai_model_limits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .references(() => organizations.organizationId)
      .notNull(),
    modelProfileId: uuid("model_profile_id").references(
      () => aiModelProfiles.id,
    ), // Null means all models
    maxRequestsPerMinute: integer("max_requests_per_minute"),
    maxTokensPerDay: integer("max_tokens_per_day"),
    ...auditFields,
  },
  (table) => [index("ai_model_limits_org_idx").on(table.organizationId)],
);

// Governance & Budgets
export const aiBudgets = pgTable(
  "ai_budgets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .references(() => organizations.organizationId)
      .notNull(),
    layer: aiMemoryLayerEnum("layer").notNull(),
    projectId: uuid("project_id").references(() => projects.projectId),
    conversationId: uuid("conversation_id").references(
      () => aiConversations.id,
    ),
    limitInUsd: decimal("limit_in_usd", { precision: 12, scale: 4 }).notNull(),
    currentSpendInUsd: decimal("current_spend_in_usd", {
      precision: 12,
      scale: 4,
    })
      .notNull()
      .default("0"),
    ...auditFields,
  },
  (table) => [
    index("ai_budgets_org_idx").on(table.organizationId),
    index("ai_budgets_project_idx").on(table.projectId),
    index("ai_budgets_conv_idx").on(table.conversationId),
  ],
);

// Tools
export const aiTools = pgTable(
  "ai_tools",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(
      () => organizations.organizationId,
    ),
    name: text("name").notNull(),
    description: text("description"),
    schema: jsonb("schema").notNull(),
    permissions: jsonb("permissions"),
    timeoutMs: integer("timeout_ms").default(5000),
    costPerRun: decimal("cost_per_run", { precision: 10, scale: 4 }),
    ...auditFields,
  },
  (table) => [index("ai_tools_org_idx").on(table.organizationId)],
);

export const aiToolCalls = pgTable(
  "ai_tool_calls",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    messageId: uuid("message_id")
      .references(() => aiMessages.id)
      .notNull(),
    toolId: uuid("tool_id")
      .references(() => aiTools.id)
      .notNull(),
    arguments: jsonb("arguments"),
    result: jsonb("result"),
    status: aiApprovalStatusEnum("status"),
    executionTimeMs: integer("execution_time_ms"),
    ...auditFields,
  },
  (table) => [
    index("ai_tool_calls_msg_idx").on(table.messageId),
    index("ai_tool_calls_tool_idx").on(table.toolId),
  ],
);

// Prompts
export const aiPromptTemplates = pgTable(
  "ai_prompt_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(
      () => organizations.organizationId,
    ),
    name: text("name").notNull(),
    description: text("description"),
    ownerId: uuid("owner_id").references(() => users.userId),
    isActive: boolean("is_active").default(true),
    ...auditFields,
  },
  (table) => [index("ai_prompt_templates_org_idx").on(table.organizationId)],
);

export const aiPromptVersions = pgTable(
  "ai_prompt_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    templateId: uuid("template_id")
      .references(() => aiPromptTemplates.id)
      .notNull(),
    promptVersion: text("prompt_version").notNull(),
    systemPrompt: text("system_prompt").notNull(),
    variablesSchema: jsonb("variables_schema"),
    isApproved: boolean("is_approved").default(false),
    approvedBy: uuid("approved_by").references(() => users.userId),
    rollbackFrom: uuid("rollback_from"),
    ...auditFields,
  },
  (table) => [index("ai_prompt_versions_tmpl_idx").on(table.templateId)],
);

// Skills
export const aiSkills = pgTable(
  "ai_skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(
      () => organizations.organizationId,
    ),
    name: text("name").notNull(),
    capability: aiCapabilityEnum("capability").notNull(),
    promptTemplateId: uuid("prompt_template_id")
      .references(() => aiPromptTemplates.id)
      .notNull(),
    allowedTools: jsonb("allowed_tools"),
    allowedModels: jsonb("allowed_models"),
    permissions: jsonb("permissions"),
    ...auditFields,
  },
  (table) => [index("ai_skills_org_idx").on(table.organizationId)],
);

export const aiRatings = pgTable(
  "ai_ratings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .references(() => organizations.organizationId)
      .notNull(),
    targetType: text("target_type").notNull(), // 'model', 'prompt', 'conversation'
    targetId: uuid("target_id").notNull(),
    score: integer("score").notNull(), // e.g. 1-5
    ...auditFields,
  },
  (table) => [
    index("ai_ratings_org_idx").on(table.organizationId),
    index("ai_ratings_target_idx").on(table.targetId),
  ],
);

export const aiFeedback = pgTable(
  "ai_feedback",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    messageId: uuid("message_id")
      .references(() => aiMessages.id)
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.userId)
      .notNull(),
    isPositive: boolean("is_positive").notNull(),
    comments: text("comments"),
    ...auditFields,
  },
  (table) => [
    index("ai_feedback_msg_idx").on(table.messageId),
    index("ai_feedback_user_idx").on(table.userId),
  ],
);

// Guardrails
export const aiGuardrails = pgTable(
  "ai_guardrails",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(
      () => organizations.organizationId,
    ), // Null for global
    ruleType: text("rule_type").notNull(), // 'blocked_keyword', 'pii_pattern', 'prompt_injection'
    pattern: text("pattern").notNull(),
    isActive: boolean("is_active").default(true),
    ...auditFields,
  },
  (table) => [index("ai_guardrails_org_idx").on(table.organizationId)],
);
