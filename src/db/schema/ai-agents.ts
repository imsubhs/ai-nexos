import { pgTable, text, timestamp, uuid, jsonb, integer, boolean, varchar, index } from "drizzle-orm/pg-core";
import { auditFields } from "./_shared";
import { organizations } from "./organizations";
import { users } from "./users";
import { 
  agentStateEnum, 
  agentConfidenceThresholdEnum, 
  agentMemoryTypeEnum, 
  agentPlanStatusEnum 
} from "./enums";

export const aiAgents = pgTable("ai_agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.organizationId),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  ...auditFields
}, (t) => ({
  orgIdx: index("idx_ai_agents_org_id").on(t.organizationId),
  createdAtIdx: index("idx_ai_agents_created_at").on(t.createdAt),
}));

export const aiAgentVersions = pgTable("ai_agent_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.organizationId),
  agentId: uuid("agent_id").notNull().references(() => aiAgents.id),
  versionNumber: integer("version_number").notNull(),
  configuration: jsonb("configuration").notNull(),
  ...auditFields
}, (t) => ({
  orgIdx: index("idx_ai_agent_versions_org_id").on(t.organizationId),
  agentIdx: index("idx_ai_agent_versions_agent_id").on(t.agentId),
}));

// Tool Capability Manifest
export const aiAgentSkills = pgTable("ai_agent_skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.organizationId),
  agentId: uuid("agent_id").notNull().references(() => aiAgents.id),
  toolName: varchar("tool_name", { length: 255 }).notNull(),
  permissions: jsonb("permissions"),
  approvalRequirements: jsonb("approval_requirements"),
  inputs: jsonb("inputs"),
  outputs: jsonb("outputs"),
  sideEffects: jsonb("side_effects"),
  ...auditFields
}, (t) => ({
  orgIdx: index("idx_ai_agent_skills_org_id").on(t.organizationId),
  agentIdx: index("idx_ai_agent_skills_agent_id").on(t.agentId),
}));

export const aiAgentCapabilities = pgTable("ai_agent_capabilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.organizationId),
  agentId: uuid("agent_id").notNull().references(() => aiAgents.id),
  capabilityName: varchar("capability_name", { length: 255 }).notNull(),
  ...auditFields
}, (t) => ({
  orgIdx: index("idx_ai_agent_capabilities_org_id").on(t.organizationId),
  agentIdx: index("idx_ai_agent_capabilities_agent_id").on(t.agentId),
}));

export const aiAgentGoals = pgTable("ai_agent_goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.organizationId),
  agentId: uuid("agent_id").notNull().references(() => aiAgents.id),
  description: text("description").notNull(),
  successCriteria: jsonb("success_criteria"),
  constraints: jsonb("constraints"),
  ...auditFields
}, (t) => ({
  orgIdx: index("idx_ai_agent_goals_org_id").on(t.organizationId),
  agentIdx: index("idx_ai_agent_goals_agent_id").on(t.agentId),
}));

export const aiAgentSessions = pgTable("ai_agent_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.organizationId),
  agentId: uuid("agent_id").notNull().references(() => aiAgents.id),
  userId: uuid("user_id").references(() => users.userId),
  status: agentStateEnum("status").notNull().default("CREATED"),
  ...auditFields
}, (t) => ({
  orgIdx: index("idx_ai_agent_sessions_org_id").on(t.organizationId),
  agentIdx: index("idx_ai_agent_sessions_agent_id").on(t.agentId),
  userIdx: index("idx_ai_agent_sessions_user_id").on(t.userId),
}));

export const aiAgentExecutionRuns = pgTable("ai_agent_execution_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.organizationId),
  goalId: uuid("goal_id").notNull().references(() => aiAgentGoals.id),
  sessionId: uuid("session_id").references(() => aiAgentSessions.id),
  status: agentStateEnum("status").notNull().default("CREATED"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  ...auditFields
}, (t) => ({
  orgIdx: index("idx_ai_agent_runs_org_id").on(t.organizationId),
  goalIdx: index("idx_ai_agent_runs_goal_id").on(t.goalId),
  sessionIdx: index("idx_ai_agent_runs_session_id").on(t.sessionId),
}));

export const aiAgentPlans = pgTable("ai_agent_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.organizationId),
  runId: uuid("run_id").notNull().references(() => aiAgentExecutionRuns.id),
  planVersion: integer("plan_version").notNull().default(1),
  status: agentPlanStatusEnum("status").notNull().default("active"),
  isImmutable: boolean("is_immutable").notNull().default(true),
  ...auditFields
}, (t) => ({
  orgIdx: index("idx_ai_agent_plans_org_id").on(t.organizationId),
  runIdx: index("idx_ai_agent_plans_run_id").on(t.runId),
}));

export const aiAgentPlanSteps = pgTable("ai_agent_plan_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.organizationId),
  planId: uuid("plan_id").notNull().references(() => aiAgentPlans.id),
  stepOrder: integer("step_order").notNull(),
  actionName: varchar("action_name", { length: 255 }).notNull(),
  dependencies: jsonb("dependencies"), // array of step ids
  confidenceThreshold: agentConfidenceThresholdEnum("confidence_threshold").notNull().default("auto_execute"),
  ...auditFields
}, (t) => ({
  orgIdx: index("idx_ai_agent_plan_steps_org_id").on(t.organizationId),
  planIdx: index("idx_ai_agent_plan_steps_plan_id").on(t.planId),
}));

export const aiAgentExecutionSteps = pgTable("ai_agent_execution_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.organizationId),
  runId: uuid("run_id").notNull().references(() => aiAgentExecutionRuns.id),
  planStepId: uuid("plan_step_id").notNull().references(() => aiAgentPlanSteps.id),
  status: agentStateEnum("status").notNull().default("CREATED"),
  ...auditFields
}, (t) => ({
  orgIdx: index("idx_ai_agent_exec_steps_org_id").on(t.organizationId),
  runIdx: index("idx_ai_agent_exec_steps_run_id").on(t.runId),
  planStepIdx: index("idx_ai_agent_exec_steps_plan_step_id").on(t.planStepId),
}));

export const aiAgentContext = pgTable("ai_agent_context", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.organizationId),
  stepId: uuid("step_id").notNull().references(() => aiAgentExecutionSteps.id),
  contextSnapshot: jsonb("context_snapshot").notNull(),
  isImmutable: boolean("is_immutable").notNull().default(true),
  ...auditFields
}, (t) => ({
  orgIdx: index("idx_ai_agent_context_org_id").on(t.organizationId),
  stepIdx: index("idx_ai_agent_context_step_id").on(t.stepId),
}));

export const aiAgentMemory = pgTable("ai_agent_memory", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.organizationId),
  agentId: uuid("agent_id").notNull().references(() => aiAgents.id),
  sessionId: uuid("session_id").references(() => aiAgentSessions.id),
  memoryType: agentMemoryTypeEnum("memory_type").notNull(),
  summary: text("summary").notNull(),
  isCompacted: boolean("is_compacted").notNull().default(false),
  ...auditFields
}, (t) => ({
  orgIdx: index("idx_ai_agent_memory_org_id").on(t.organizationId),
  agentIdx: index("idx_ai_agent_memory_agent_id").on(t.agentId),
  sessionIdx: index("idx_ai_agent_memory_session_id").on(t.sessionId),
}));

export const aiAgentObservations = pgTable("ai_agent_observations", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.organizationId),
  stepId: uuid("step_id").notNull().references(() => aiAgentExecutionSteps.id),
  result: jsonb("result"),
  ...auditFields
}, (t) => ({
  orgIdx: index("idx_ai_agent_observations_org_id").on(t.organizationId),
  stepIdx: index("idx_ai_agent_observations_step_id").on(t.stepId),
}));

export const aiAgentReflections = pgTable("ai_agent_reflections", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.organizationId),
  runId: uuid("run_id").notNull().references(() => aiAgentExecutionRuns.id),
  outcomeSummary: text("outcome_summary").notNull(),
  improvements: text("improvements"),
  ...auditFields
}, (t) => ({
  orgIdx: index("idx_ai_agent_reflections_org_id").on(t.organizationId),
  runIdx: index("idx_ai_agent_reflections_run_id").on(t.runId),
}));

export const aiAgentToolUsage = pgTable("ai_agent_tool_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.organizationId),
  stepId: uuid("step_id").notNull().references(() => aiAgentExecutionSteps.id),
  toolName: varchar("tool_name", { length: 255 }).notNull(),
  inputPayload: jsonb("input_payload"),
  outputPayload: jsonb("output_payload"),
  ...auditFields
}, (t) => ({
  orgIdx: index("idx_ai_agent_tool_usage_org_id").on(t.organizationId),
  stepIdx: index("idx_ai_agent_tool_usage_step_id").on(t.stepId),
}));

export const aiAgentPermissions = pgTable("ai_agent_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.organizationId),
  agentId: uuid("agent_id").notNull().references(() => aiAgents.id),
  resourceType: varchar("resource_type", { length: 255 }).notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  ...auditFields
}, (t) => ({
  orgIdx: index("idx_ai_agent_permissions_org_id").on(t.organizationId),
  agentIdx: index("idx_ai_agent_permissions_agent_id").on(t.agentId),
}));

export const aiAgentHumanApprovals = pgTable("ai_agent_human_approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.organizationId),
  stepId: uuid("step_id").notNull().references(() => aiAgentExecutionSteps.id),
  approverId: uuid("approver_id").references(() => users.userId),
  status: agentStateEnum("status").notNull().default("WAITING_FOR_APPROVAL"),
  ...auditFields
}, (t) => ({
  orgIdx: index("idx_ai_agent_human_approvals_org_id").on(t.organizationId),
  stepIdx: index("idx_ai_agent_human_approvals_step_id").on(t.stepId),
}));

export const aiAgentCosts = pgTable("ai_agent_costs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.organizationId),
  runId: uuid("run_id").notNull().references(() => aiAgentExecutionRuns.id),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),
  ...auditFields
}, (t) => ({
  orgIdx: index("idx_ai_agent_costs_org_id").on(t.organizationId),
  runIdx: index("idx_ai_agent_costs_run_id").on(t.runId),
}));

export const aiAgentLimits = pgTable("ai_agent_limits", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.organizationId),
  agentId: uuid("agent_id").notNull().references(() => aiAgents.id),
  maxTokensPerRun: integer("max_tokens_per_run"),
  maxCostPerRun: integer("max_cost_per_run"),
  maxStepsPerRun: integer("max_steps_per_run"),
  ...auditFields
}, (t) => ({
  orgIdx: index("idx_ai_agent_limits_org_id").on(t.organizationId),
  agentIdx: index("idx_ai_agent_limits_agent_id").on(t.agentId),
}));

export const aiAgentStatistics = pgTable("ai_agent_statistics", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.organizationId),
  agentId: uuid("agent_id").notNull().references(() => aiAgents.id),
  totalRuns: integer("total_runs").notNull().default(0),
  successfulRuns: integer("successful_runs").notNull().default(0),
  failedRuns: integer("failed_runs").notNull().default(0),
  ...auditFields
}, (t) => ({
  orgIdx: index("idx_ai_agent_stats_org_id").on(t.organizationId),
  agentIdx: index("idx_ai_agent_stats_agent_id").on(t.agentId),
}));

// Explainability Ledger
export const aiAgentExplainabilityLedger = pgTable("ai_agent_explainability_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.organizationId),
  runId: uuid("run_id").notNull().references(() => aiAgentExecutionRuns.id),
  goalReference: uuid("goal_reference").references(() => aiAgentGoals.id),
  planVersionReference: uuid("plan_version_reference").references(() => aiAgentPlans.id),
  contextReference: uuid("context_reference").references(() => aiAgentContext.id),
  toolUsageReference: uuid("tool_usage_reference").references(() => aiAgentToolUsage.id),
  automationReference: varchar("automation_reference", { length: 255 }), // reference to Module 17 execution
  approvalReference: uuid("approval_reference").references(() => aiAgentHumanApprovals.id),
  outcomeSummary: text("outcome_summary"),
  ...auditFields
}, (t) => ({
  orgIdx: index("idx_ai_agent_expl_ledger_org_id").on(t.organizationId),
  runIdx: index("idx_ai_agent_expl_ledger_run_id").on(t.runId),
  planIdx: index("idx_ai_agent_expl_ledger_plan_id").on(t.planVersionReference),
  contextIdx: index("idx_ai_agent_expl_ledger_context_id").on(t.contextReference),
}));

// Agent Checkpoint Ledger
export const aiAgentCheckpointLedger = pgTable("ai_agent_checkpoint_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.organizationId),
  runId: uuid("run_id").notNull().references(() => aiAgentExecutionRuns.id),
  planVersionReference: uuid("plan_version_reference").notNull().references(() => aiAgentPlans.id),
  completedSteps: jsonb("completed_steps").notNull(),
  pendingSteps: jsonb("pending_steps").notNull(),
  contextSnapshot: jsonb("context_snapshot").notNull(),
  automationReferences: jsonb("automation_references"),
  approvalReferences: jsonb("approval_references"),
  ...auditFields
}, (t) => ({
  orgIdx: index("idx_ai_agent_checkpt_ledger_org_id").on(t.organizationId),
  runIdx: index("idx_ai_agent_checkpt_ledger_run_id").on(t.runId),
}));
