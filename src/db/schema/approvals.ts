import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { auditFields } from "./_shared";
import { organizations } from "./organizations";
import { users } from "./users";
import {
  approvalCycleStatusEnum,
  approvalEntityTypeEnum,
  approvalEventTypeEnum,
  approvalReviewStatusEnum,
  approvalStageStatusEnum,
} from "./enums";

export const approvalWorkflows = pgTable(
  "approval_workflows",
  {
    workflowId: uuid("workflow_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    routingRules: jsonb("routing_rules_json"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_approval_workflows_org_id").on(table.organizationId),
    index("idx_approval_workflows_routing").using("gin", table.routingRules),
  ]
);

export const approvalCycles = pgTable(
  "approval_cycles",
  {
    cycleId: uuid("cycle_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "cascade" }),
    entityType: approvalEntityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    workflowId: uuid("workflow_id").references(() => approvalWorkflows.workflowId, { onDelete: "set null" }),
    snapshotData: jsonb("snapshot_data_json").notNull(),
    snapshotHash: text("snapshot_hash").notNull(),
    status: approvalCycleStatusEnum("status").notNull().default("pending"),
    currentStageId: uuid("current_stage_id"),
    createdBy: uuid("created_by").notNull().references(() => users.userId),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_approval_cycles_org_entity").on(table.organizationId, table.entityType, table.entityId),
    index("idx_approval_cycles_status").on(table.status),
  ]
);

export const approvalStages = pgTable(
  "approval_stages",
  {
    stageId: uuid("stage_id").primaryKey().defaultRandom(),
    cycleId: uuid("cycle_id")
      .notNull()
      .references(() => approvalCycles.cycleId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    orderIndex: integer("order_index").notNull(),
    status: approvalStageStatusEnum("status").notNull().default("pending"),
    quorumCount: integer("quorum_count").notNull().default(1),
    slaDeadline: timestamp("sla_deadline", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_approval_stages_cycle_id").on(table.cycleId),
  ]
);

export const reviews = pgTable(
  "reviews",
  {
    reviewId: uuid("review_id").primaryKey().defaultRandom(),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => approvalStages.stageId, { onDelete: "cascade" }),
    reviewerId: uuid("reviewer_id").references(() => users.userId, { onDelete: "set null" }),
    delegatedFromId: uuid("delegated_from_id").references(() => users.userId, { onDelete: "set null" }),
    externalEmail: text("external_email"),
    externalToken: text("external_token"),
    status: approvalReviewStatusEnum("status").notNull().default("pending"),
    comments: text("comments"),
    aiRecommendation: jsonb("ai_recommendation_json"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_reviews_stage_id").on(table.stageId),
    index("idx_reviews_reviewer_id").on(table.reviewerId),
    index("idx_reviews_external_token").on(table.externalToken),
  ]
);

export const approvalConditions = pgTable(
  "approval_conditions",
  {
    conditionId: uuid("condition_id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.reviewId, { onDelete: "cascade" }),
    conditionText: text("condition_text").notNull(),
    isResolved: boolean("is_resolved").notNull().default(false),
    resolvedBy: uuid("resolved_by").references(() => users.userId, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_approval_conditions_review_id").on(table.reviewId),
  ]
);

export const approvalEvents = pgTable(
  "approval_events",
  {
    eventId: uuid("event_id").primaryKey().defaultRandom(),
    cycleId: uuid("cycle_id")
      .notNull()
      .references(() => approvalCycles.cycleId, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.userId, { onDelete: "set null" }),
    eventType: approvalEventTypeEnum("event_type").notNull(),
    payload: jsonb("payload_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_approval_events_cycle_id").on(table.cycleId),
  ]
);

export const approvalWorkflowsRelations = relations(approvalWorkflows, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [approvalWorkflows.organizationId],
    references: [organizations.organizationId],
  }),
  cycles: many(approvalCycles),
}));

export const approvalCyclesRelations = relations(approvalCycles, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [approvalCycles.organizationId],
    references: [organizations.organizationId],
  }),
  workflow: one(approvalWorkflows, {
    fields: [approvalCycles.workflowId],
    references: [approvalWorkflows.workflowId],
  }),
  stages: many(approvalStages),
  events: many(approvalEvents),
  createdBy: one(users, {
    fields: [approvalCycles.createdBy],
    references: [users.userId],
  }),
}));

export const approvalStagesRelations = relations(approvalStages, ({ one, many }) => ({
  cycle: one(approvalCycles, {
    fields: [approvalStages.cycleId],
    references: [approvalCycles.cycleId],
  }),
  reviews: many(reviews),
}));

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  stage: one(approvalStages, {
    fields: [reviews.stageId],
    references: [approvalStages.stageId],
  }),
  reviewer: one(users, {
    fields: [reviews.reviewerId],
    references: [users.userId],
    relationName: "reviewer",
  }),
  delegatedFrom: one(users, {
    fields: [reviews.delegatedFromId],
    references: [users.userId],
    relationName: "delegated_from",
  }),
  conditions: many(approvalConditions),
}));

export const approvalConditionsRelations = relations(approvalConditions, ({ one }) => ({
  review: one(reviews, {
    fields: [approvalConditions.reviewId],
    references: [reviews.reviewId],
  }),
  resolvedBy: one(users, {
    fields: [approvalConditions.resolvedBy],
    references: [users.userId],
  }),
}));

export const approvalEventsRelations = relations(approvalEvents, ({ one }) => ({
  cycle: one(approvalCycles, {
    fields: [approvalEvents.cycleId],
    references: [approvalCycles.cycleId],
  }),
  actor: one(users, {
    fields: [approvalEvents.actorId],
    references: [users.userId],
  }),
}));
