import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { auditFields } from "./_shared";
import { organizations } from "./organizations";
import { projects } from "./projects";
import { users } from "./users";
import {
  dependencyTypeEnum,
  milestoneStatusEnum,
  projectPhaseNameEnum,
  timelineStatusEnum,
} from "./enums";

export const timelines = pgTable(
  "timelines",
  {
    timelineId: uuid("timeline_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.projectId, { onDelete: "cascade" }),
    status: timelineStatusEnum("status").notNull().default("planning"),
    currentVersion: integer("current_version").notNull().default(1),
    overallProgress: integer("overall_progress").notNull().default(0),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    ...auditFields,
  },
  (table) => [
    index("idx_timelines_org").on(table.organizationId),
    uniqueIndex("uq_timelines_project").on(table.projectId),
  ],
);

export const timelineVersions = pgTable(
  "timeline_versions",
  {
    versionId: uuid("version_id").primaryKey().defaultRandom(),
    timelineId: uuid("timeline_id")
      .notNull()
      .references(() => timelines.timelineId, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    userId: uuid("user_id").references(() => users.userId, {
      onDelete: "set null",
    }),
    changeSummary: text("change_summary").notNull(),
    reason: text("reason"),
    snapshotData: jsonb("snapshot_data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_timeline_versions_timeline").on(table.timelineId),
    uniqueIndex("uq_timeline_versions_num").on(
      table.timelineId,
      table.versionNumber,
    ),
  ],
);

export const projectPhases = pgTable(
  "project_phases",
  {
    phaseId: uuid("phase_id").primaryKey().defaultRandom(),
    timelineId: uuid("timeline_id")
      .notNull()
      .references(() => timelines.timelineId, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "cascade" }),
    name: projectPhaseNameEnum("name").notNull(),
    orderIndex: integer("order_index").notNull(),
    status: milestoneStatusEnum("status").notNull().default("not_started"),
    progress: integer("progress").notNull().default(0),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    ...auditFields,
  },
  (table) => [
    index("idx_project_phases_timeline").on(table.timelineId),
    uniqueIndex("uq_project_phases_order").on(table.timelineId, table.name),
  ],
);

export const milestones = pgTable(
  "milestones",
  {
    milestoneId: uuid("milestone_id").primaryKey().defaultRandom(),
    phaseId: uuid("phase_id")
      .notNull()
      .references(() => projectPhases.phaseId, { onDelete: "cascade" }),
    timelineId: uuid("timeline_id")
      .notNull()
      .references(() => timelines.timelineId, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    status: milestoneStatusEnum("status").notNull().default("not_started"),
    progress: integer("progress").notNull().default(0),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    ...auditFields,
  },
  (table) => [
    index("idx_milestones_phase").on(table.phaseId),
    index("idx_milestones_timeline").on(table.timelineId),
  ],
);

export const timelineDependencies = pgTable(
  "timeline_dependencies",
  {
    dependencyId: uuid("dependency_id").primaryKey().defaultRandom(),
    timelineId: uuid("timeline_id")
      .notNull()
      .references(() => timelines.timelineId, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "cascade" }),
    predecessorId: uuid("predecessor_id")
      .notNull()
      .references(() => milestones.milestoneId, { onDelete: "cascade" }),
    successorId: uuid("successor_id")
      .notNull()
      .references(() => milestones.milestoneId, { onDelete: "cascade" }),
    dependencyType: dependencyTypeEnum("dependency_type")
      .notNull()
      .default("FS"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid("created_by").references(() => users.userId, {
      onDelete: "set null",
    }),
  },
  (table) => [
    uniqueIndex("uq_timeline_deps_nodes").on(
      table.predecessorId,
      table.successorId,
    ),
    index("idx_timeline_deps_timeline").on(table.timelineId),
  ],
);

/**
 * Relational-query graph for the timeline tables.
 *
 * Drizzle's `db.query.*` builder resolves `with: { … }` against these
 * declarations, not against the foreign keys — a table with no `relations()`
 * entry has an empty relation map, and asking for a nested key throws while the
 * SQL is being built ("Cannot read properties of undefined (reading
 * 'referencedTable')"), before any row is read. The timeline read paths have
 * always asked for these embeds — `getTimelines` for `phases`,
 * `getProjectTimeline` for `phases` + `versions`, `createTimelineSnapshot` for
 * `phases.milestones.successors` — so the declarations are what was missing,
 * not the queries.
 *
 * `predecessors`/`successors` need explicit relation names because
 * `timeline_dependencies` reaches `milestones` through two foreign keys and
 * drizzle cannot otherwise tell which one an embed means. A milestone's
 * `successors` are the dependency edges on which it is the PREDECESSOR — the
 * edges pointing at what comes after it.
 */
export const timelinesRelations = relations(timelines, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [timelines.organizationId],
    references: [organizations.organizationId],
  }),
  project: one(projects, {
    fields: [timelines.projectId],
    references: [projects.projectId],
  }),
  phases: many(projectPhases),
  milestones: many(milestones),
  versions: many(timelineVersions),
  dependencies: many(timelineDependencies),
}));

export const timelineVersionsRelations = relations(
  timelineVersions,
  ({ one }) => ({
    timeline: one(timelines, {
      fields: [timelineVersions.timelineId],
      references: [timelines.timelineId],
    }),
    user: one(users, {
      fields: [timelineVersions.userId],
      references: [users.userId],
    }),
  }),
);

export const projectPhasesRelations = relations(
  projectPhases,
  ({ one, many }) => ({
    timeline: one(timelines, {
      fields: [projectPhases.timelineId],
      references: [timelines.timelineId],
    }),
    milestones: many(milestones),
  }),
);

export const milestonesRelations = relations(milestones, ({ one, many }) => ({
  phase: one(projectPhases, {
    fields: [milestones.phaseId],
    references: [projectPhases.phaseId],
  }),
  timeline: one(timelines, {
    fields: [milestones.timelineId],
    references: [timelines.timelineId],
  }),
  successors: many(timelineDependencies, {
    relationName: "timeline_dependency_predecessor",
  }),
  predecessors: many(timelineDependencies, {
    relationName: "timeline_dependency_successor",
  }),
}));

export const timelineDependenciesRelations = relations(
  timelineDependencies,
  ({ one }) => ({
    timeline: one(timelines, {
      fields: [timelineDependencies.timelineId],
      references: [timelines.timelineId],
    }),
    predecessor: one(milestones, {
      fields: [timelineDependencies.predecessorId],
      references: [milestones.milestoneId],
      relationName: "timeline_dependency_predecessor",
    }),
    successor: one(milestones, {
      fields: [timelineDependencies.successorId],
      references: [milestones.milestoneId],
      relationName: "timeline_dependency_successor",
    }),
  }),
);
