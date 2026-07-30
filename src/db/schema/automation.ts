import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  integer,
  timestamp,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { auditFields } from "./_shared";
import { organizations } from "./organizations";
import {
  automationTriggerTypeEnum,
  automationActionTypeEnum,
  automationWorkflowStatusEnum,
  automationExecutionStatusEnum,
  automationVariableTypeEnum,
} from "./enums";

// -----------------------------------------------------------------------------
// Module 17: Automation Engine Schema
// -----------------------------------------------------------------------------

// 12. Automation Capability Registry (Global definition of capabilities)
export const automationCapabilities = pgTable("automation_capabilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  allowedTriggers: jsonb("allowed_triggers").default("[]").notNull(),
  allowedActions: jsonb("allowed_actions").default("[]").notNull(),
  requiredPermissions: jsonb("required_permissions").default("[]").notNull(),
  requiresApproval: boolean("requires_approval").default(false).notNull(),
  aiAvailable: boolean("ai_available").default(false).notNull(),
  ...auditFields,
});

// 1. Workflows
export const automationWorkflows = pgTable("automation_workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .references(() => organizations.organizationId, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: automationWorkflowStatusEnum("status").notNull().default("draft"),
  currentVersionId: uuid("current_version_id"), // Self-reference added below or via relations
  capabilityId: uuid("capability_id").references(
    () => automationCapabilities.id,
  ),
  ...auditFields,
});

// 2. Workflow Versions (Immutable executions run against these)
export const automationWorkflowVersions = pgTable(
  "automation_workflow_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.organizationId, { onDelete: "cascade" })
      .notNull(),
    workflowId: uuid("workflow_id")
      .references(() => automationWorkflows.id, { onDelete: "cascade" })
      .notNull(),
    versionNumber: integer("version_number").notNull(),
    executablePlan: jsonb("executable_plan"), // Compiled plan
    rulesCompiledAt: timestamp("rules_compiled_at", { withTimezone: true }),
    isValid: boolean("is_valid").default(false).notNull(),
    ...auditFields,
  },
);

// 3. Triggers
export const automationTriggers = pgTable("automation_triggers", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .references(() => organizations.organizationId, { onDelete: "cascade" })
    .notNull(),
  versionId: uuid("version_id")
    .references(() => automationWorkflowVersions.id, { onDelete: "cascade" })
    .notNull(),
  type: automationTriggerTypeEnum("type").notNull(),
  config: jsonb("config").notNull().default("{}"), // Platform event types, schedule cron, webhook config
  ...auditFields,
});

// 4. Conditions
export const automationConditions = pgTable("automation_conditions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .references(() => organizations.organizationId, { onDelete: "cascade" })
    .notNull(),
  versionId: uuid("version_id")
    .references(() => automationWorkflowVersions.id, { onDelete: "cascade" })
    .notNull(),
  groupId: uuid("group_id"), // References condition_groups
  operator: varchar("operator", { length: 50 }).notNull(),
  field: varchar("field", { length: 255 }),
  value: jsonb("value"),
  ...auditFields,
});

// 5. Condition Groups
export const automationConditionGroups = pgTable(
  "automation_condition_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.organizationId, { onDelete: "cascade" })
      .notNull(),
    versionId: uuid("version_id")
      .references(() => automationWorkflowVersions.id, { onDelete: "cascade" })
      .notNull(),
    parentGroupId: uuid("parent_group_id"),
    logicalOperator: varchar("logical_operator", { length: 10 }).notNull(), // AND, OR, NOT
    ...auditFields,
  },
);

// 6. Actions (Supports Compensation)
export const automationActions = pgTable("automation_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .references(() => organizations.organizationId, { onDelete: "cascade" })
    .notNull(),
  versionId: uuid("version_id")
    .references(() => automationWorkflowVersions.id, { onDelete: "cascade" })
    .notNull(),
  type: automationActionTypeEnum("type").notNull(),
  config: jsonb("config").notNull().default("{}"),
  compensationActionId: uuid("compensation_action_id"), // Self-reference for reversible workflows
  ...auditFields,
});

// 7. Execution Runs (Idempotency Key)
export const automationExecutionRuns = pgTable(
  "automation_execution_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.organizationId, { onDelete: "cascade" })
      .notNull(),
    workflowId: uuid("workflow_id")
      .references(() => automationWorkflows.id)
      .notNull(),
    versionId: uuid("version_id")
      .references(() => automationWorkflowVersions.id)
      .notNull(),
    status: automationExecutionStatusEnum("status").notNull().default("queued"),
    idempotencyKey: varchar("idempotency_key", { length: 255 }),
    triggerSource: varchar("trigger_source", { length: 255 }),
    triggerPayload: jsonb("trigger_payload"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...auditFields,
  },
  (t) => ({
    idempotencyIdx: uniqueIndex("idx_automation_runs_idempotency").on(
      t.organizationId,
      t.workflowId,
      t.idempotencyKey,
    ),
    workflowIdx: index("idx_automation_runs_workflow").on(t.workflowId),
    statusIdx: index("idx_automation_runs_status").on(t.status),
  }),
);

// 8. Execution State (Leases for Workers)
export const automationExecutionState = pgTable(
  "automation_execution_state",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.organizationId, { onDelete: "cascade" })
      .notNull(),
    runId: uuid("run_id")
      .references(() => automationExecutionRuns.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    stateData: jsonb("state_data").notNull().default("{}"),
    workerId: varchar("worker_id", { length: 255 }),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    ...auditFields,
  },
  (t) => ({
    workerIdx: index("idx_automation_state_worker").on(t.workerId),
    runIdx: index("idx_automation_state_run").on(t.runId),
  }),
);

// 9. Execution Steps (Partitioned by created_at in production)
export const automationExecutionSteps = pgTable(
  "automation_execution_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.organizationId, { onDelete: "cascade" })
      .notNull(),
    runId: uuid("run_id")
      .references(() => automationExecutionRuns.id, { onDelete: "cascade" })
      .notNull(),
    actionId: uuid("action_id").references(() => automationActions.id),
    stepName: varchar("step_name", { length: 255 }).notNull(),
    status: automationExecutionStatusEnum("status").notNull(),
    result: jsonb("result"),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...auditFields,
  },
  (t) => ({
    runIdx: index("idx_automation_steps_run").on(t.runId),
    statusIdx: index("idx_automation_steps_status").on(t.status),
  }),
);

// 10. Execution Logs (Configurable Retention) (Partitioned by created_at in production)
export const automationExecutionLogs = pgTable(
  "automation_execution_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.organizationId, { onDelete: "cascade" })
      .notNull(),
    runId: uuid("run_id")
      .references(() => automationExecutionRuns.id, { onDelete: "cascade" })
      .notNull(),
    stepId: uuid("step_id").references(() => automationExecutionSteps.id),
    level: varchar("level", { length: 50 }).notNull(), // INFO, WARN, ERROR, DEBUG
    message: text("message").notNull(),
    details: jsonb("details"),
    ...auditFields,
  },
  (t) => ({
    runIdx: index("idx_automation_logs_run").on(t.runId),
  }),
);

// 11. Action Queue
export const automationActionQueue = pgTable(
  "automation_action_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.organizationId, { onDelete: "cascade" })
      .notNull(),
    runId: uuid("run_id")
      .references(() => automationExecutionRuns.id, { onDelete: "cascade" })
      .notNull(),
    actionId: uuid("action_id")
      .references(() => automationActions.id)
      .notNull(),
    status: automationExecutionStatusEnum("status").notNull().default("queued"),
    enqueuedAt: timestamp("enqueued_at", { withTimezone: true }).defaultNow(),
    ...auditFields,
  },
  (t) => ({
    runIdx: index("idx_automation_queue_run").on(t.runId),
    statusIdx: index("idx_automation_queue_status").on(t.status),
  }),
);

// 12. Dead Letter Queue
export const automationDeadLetterQueue = pgTable(
  "automation_dead_letter_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.organizationId, { onDelete: "cascade" })
      .notNull(),
    runId: uuid("run_id").references(() => automationExecutionRuns.id),
    stepId: uuid("step_id").references(() => automationExecutionSteps.id),
    payload: jsonb("payload").notNull(),
    errorMessage: text("error_message"),
    retriesCount: integer("retries_count").default(0).notNull(),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    isTerminal: boolean("is_terminal").default(false).notNull(),
    ...auditFields,
  },
  (t) => ({
    runIdx: index("idx_automation_dlq_run").on(t.runId),
    nextRetryIdx: index("idx_automation_dlq_next_retry").on(t.nextRetryAt),
  }),
);

// 13. Schedules (Idempotency Key)
export const automationSchedules = pgTable("automation_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .references(() => organizations.organizationId, { onDelete: "cascade" })
    .notNull(),
  workflowId: uuid("workflow_id")
    .references(() => automationWorkflows.id, { onDelete: "cascade" })
    .notNull(),
  cronExpression: varchar("cron_expression", { length: 255 }).notNull(),
  idempotencyKeyPrefix: varchar("idempotency_key_prefix", { length: 255 }),
  isActive: boolean("is_active").default(true).notNull(),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  ...auditFields,
});

// 14. Webhooks (Strengthened Security)
export const automationWebhooks = pgTable("automation_webhooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .references(() => organizations.organizationId, { onDelete: "cascade" })
    .notNull(),
  workflowId: uuid("workflow_id")
    .references(() => automationWorkflows.id, { onDelete: "cascade" })
    .notNull(),
  urlToken: varchar("url_token", { length: 255 }).notNull().unique(), // The public endpoint identifier
  secretHmac: varchar("secret_hmac", { length: 255 }),
  requiresNonce: boolean("requires_nonce").default(true).notNull(),
  requiresTimestamp: boolean("requires_timestamp").default(true).notNull(),
  expirationWindowSeconds: integer("expiration_window_seconds")
    .default(300)
    .notNull(),
  idempotencyKeyRequired: boolean("idempotency_key_required")
    .default(true)
    .notNull(),
  ...auditFields,
});

// 15. API Keys
export const automationApiKeys = pgTable("automation_api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .references(() => organizations.organizationId, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  keyHash: varchar("key_hash", { length: 255 }).notNull().unique(),
  scopes: jsonb("scopes").default("[]").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  ...auditFields,
});

// 16. Variables (Strongly Typed)
export const automationVariables = pgTable(
  "automation_variables",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.organizationId, { onDelete: "cascade" })
      .notNull(),
    workflowId: uuid("workflow_id")
      .references(() => automationWorkflows.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    type: automationVariableTypeEnum("type").notNull(),
    valueRaw: text("value_raw"),
    isRequired: boolean("is_required").default(false).notNull(),
    ...auditFields,
  },
  (t) => ({
    nameIdx: uniqueIndex("idx_automation_variables_name").on(
      t.workflowId,
      t.name,
    ),
  }),
);

// 17. Templates
export const automationTemplates = pgTable("automation_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .references(() => organizations.organizationId, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(), // e.g. email, webhook_payload
  body: text("body").notNull(),
  ...auditFields,
});

// 18. Rate Limits
export const automationRateLimits = pgTable("automation_rate_limits", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .references(() => organizations.organizationId, { onDelete: "cascade" })
    .notNull(),
  entityId: uuid("entity_id").notNull(), // Could be workflow_id or organization_id
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  limitCount: integer("limit_count").notNull(),
  windowSeconds: integer("window_seconds").notNull(),
  ...auditFields,
});

// 19. Retry Policy
export const automationRetryPolicy = pgTable("automation_retry_policy", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .references(() => organizations.organizationId, { onDelete: "cascade" })
    .notNull(),
  workflowId: uuid("workflow_id").references(() => automationWorkflows.id),
  actionId: uuid("action_id").references(() => automationActions.id),
  maxRetries: integer("max_retries").default(3).notNull(),
  backoffStrategy: varchar("backoff_strategy", { length: 50 })
    .default("exponential")
    .notNull(),
  initialDelaySeconds: integer("initial_delay_seconds").default(5).notNull(),
  ...auditFields,
});

// 20. Permissions
export const automationPermissions = pgTable("automation_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .references(() => organizations.organizationId, { onDelete: "cascade" })
    .notNull(),
  workflowId: uuid("workflow_id")
    .references(() => automationWorkflows.id)
    .notNull(),
  roleId: uuid("role_id"), // referencing roles table
  userId: uuid("user_id"), // referencing users table
  scope: varchar("scope", { length: 255 }).notNull(),
  ...auditFields,
});

// 21. Statistics
export const automationStatistics = pgTable("automation_statistics", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .references(() => organizations.organizationId, { onDelete: "cascade" })
    .notNull(),
  workflowId: uuid("workflow_id")
    .references(() => automationWorkflows.id)
    .notNull(),
  metrics: jsonb("metrics").notNull().default("{}"), // { runsCount: 0, failCount: 0, avgDurationMs: 0 }
  ...auditFields,
});

// 22. Audit (Workflow specific audit log)
export const automationAudit = pgTable("automation_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .references(() => organizations.organizationId, { onDelete: "cascade" })
    .notNull(),
  workflowId: uuid("workflow_id").references(() => automationWorkflows.id),
  actionName: varchar("action_name", { length: 255 }).notNull(),
  changedData: jsonb("changed_data"),
  ...auditFields,
});

// -----------------------------------------------------------------------------
// Relations
// -----------------------------------------------------------------------------

export const automationWorkflowsRelations = relations(
  automationWorkflows,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [automationWorkflows.organizationId],
      references: [organizations.organizationId],
    }),
    versions: many(automationWorkflowVersions),
    runs: many(automationExecutionRuns),
    capability: one(automationCapabilities, {
      fields: [automationWorkflows.capabilityId],
      references: [automationCapabilities.id],
    }),
  }),
);

export const automationWorkflowVersionsRelations = relations(
  automationWorkflowVersions,
  ({ one, many }) => ({
    workflow: one(automationWorkflows, {
      fields: [automationWorkflowVersions.workflowId],
      references: [automationWorkflows.id],
    }),
    triggers: many(automationTriggers),
    conditions: many(automationConditions),
    actions: many(automationActions),
  }),
);

export const automationExecutionRunsRelations = relations(
  automationExecutionRuns,
  ({ one, many }) => ({
    workflow: one(automationWorkflows, {
      fields: [automationExecutionRuns.workflowId],
      references: [automationWorkflows.id],
    }),
    version: one(automationWorkflowVersions, {
      fields: [automationExecutionRuns.versionId],
      references: [automationWorkflowVersions.id],
    }),
    state: one(automationExecutionState, {
      fields: [automationExecutionRuns.id],
      references: [automationExecutionState.runId],
    }),
    steps: many(automationExecutionSteps),
    logs: many(automationExecutionLogs),
  }),
);

export const automationExecutionStepsRelations = relations(
  automationExecutionSteps,
  ({ one }) => ({
    run: one(automationExecutionRuns, {
      fields: [automationExecutionSteps.runId],
      references: [automationExecutionRuns.id],
    }),
    action: one(automationActions, {
      fields: [automationExecutionSteps.actionId],
      references: [automationActions.id],
    }),
  }),
);
