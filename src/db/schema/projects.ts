import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { auditFields } from "./_shared";
import { clients } from "./clients";
import { departments } from "./departments";
import {
  projectHealthEnum,
  projectPriorityEnum,
  projectStatusEnum,
  projectVisibilityEnum,
} from "./enums";
import { organizations } from "./organizations";
import { users } from "./users";

export const projects = pgTable(
  "projects",
  {
    projectId: uuid("project_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.clientId, {
      onDelete: "set null",
    }),
    projectName: text("project_name").notNull(),
    projectCode: text("project_code").notNull(),
    description: text("description"),
    projectManager: uuid("project_manager").references(() => users.userId, {
      onDelete: "set null",
    }),
    creativeDirector: uuid("creative_director").references(() => users.userId, {
      onDelete: "set null",
    }),
    departmentId: uuid("department_id").references(
      () => departments.departmentId,
      { onDelete: "set null" },
    ),
    priority: projectPriorityEnum("priority").notNull().default("medium"),
    status: projectStatusEnum("status").notNull().default("planning"),
    startDate: timestamp("start_date", { withTimezone: true, mode: "date" }),
    estimatedEndDate: timestamp("estimated_end_date", {
      withTimezone: true,
      mode: "date",
    }),
    actualEndDate: timestamp("actual_end_date", {
      withTimezone: true,
      mode: "date",
    }),
    completionPercentage: integer("completion_percentage").notNull().default(0),
    budget: numeric("budget", { precision: 12, scale: 2 }),
    healthStatus: projectHealthEnum("health_status")
      .notNull()
      .default("on_track"),
    visibility: projectVisibilityEnum("visibility")
      .notNull()
      .default("internal"),
    tags: jsonb("tags").$type<string[]>().default([]),
    ...auditFields,
  },
  (table) => [
    index("idx_projects_organization_id").on(table.organizationId),
    index("idx_projects_client_id").on(table.clientId),
    index("idx_projects_status").on(table.status),
    index("idx_projects_code").on(table.organizationId, table.projectCode),
  ],
);

export const projectMembers = pgTable(
  "project_members",
  {
    memberId: uuid("member_id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.projectId, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),
    role: varchar("role", { length: 50 }).notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    status: varchar("status", { length: 50 }).notNull().default("active"),
  },
  (table) => [
    index("idx_project_members_project_id").on(table.projectId),
    index("idx_project_members_user_id").on(table.userId),
    uniqueIndex("uq_project_members_proj_user").on(
      table.projectId,
      table.userId,
    ),
  ],
);

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.organizationId],
  }),
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.clientId],
  }),
  manager: one(users, {
    fields: [projects.projectManager],
    references: [users.userId],
    relationName: "project_manager",
  }),
  creativeDirector: one(users, {
    fields: [projects.creativeDirector],
    references: [users.userId],
    relationName: "project_creative_director",
  }),
  department: one(departments, {
    fields: [projects.departmentId],
    references: [departments.departmentId],
  }),
  members: many(projectMembers),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.projectId],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.userId],
  }),
}));
