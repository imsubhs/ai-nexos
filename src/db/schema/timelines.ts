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
