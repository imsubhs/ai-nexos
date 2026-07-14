import { pgTable, uuid, text, timestamp, boolean, jsonb, integer, unique, index } from "drizzle-orm/pg-core";
import { 
  taskStatusEnum, 
  taskPriorityEnum, 
  taskTypeEnum, 
  taskDependencyTypeEnum,
  taskActivityEventEnum
} from "./enums";
import { organizations } from "./organizations";
import { projects } from "./projects";
import { timelines, projectPhases, milestones } from "./timelines";
import { users } from "./users";
import { auditFields } from "./_shared";

/**
 * LABEL TAXONOMY (Org & Project)
 */
export const labels = pgTable(
  "labels",
  {
    labelId: uuid("label_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.organizationId, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.projectId, { onDelete: "cascade" }), // null = org-level label
    name: text("name").notNull(),
    color: text("color").notNull().default("#3B82F6"),
    ...auditFields,
  },
  (table) => [
    unique("unique_label_name_per_org_or_project").on(table.organizationId, table.projectId, table.name),
  ]
);

/**
 * TASK CORE
 */
export const tasks = pgTable(
  "tasks",
  {
    taskId: uuid("task_id").primaryKey().defaultRandom(),
    
    // Hierarchy Strict FKs
    organizationId: uuid("organization_id").notNull().references(() => organizations.organizationId, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull().references(() => projects.projectId, { onDelete: "cascade" }),
    timelineId: uuid("timeline_id").notNull().references(() => timelines.timelineId, { onDelete: "cascade" }),
    phaseId: uuid("phase_id").notNull().references(() => projectPhases.phaseId, { onDelete: "cascade" }),
    milestoneId: uuid("milestone_id").notNull().references(() => milestones.milestoneId, { onDelete: "cascade" }),
    
    // Subtask inheritance
    parentTaskId: uuid("parent_task_id"),

    // Task details
    taskCode: text("task_code").notNull().unique(), // AIC-T-YYYY-XXXX
    name: text("name").notNull(),
    description: jsonb("description"), // Rich text
    status: taskStatusEnum("status").notNull().default("backlog"),
    priority: taskPriorityEnum("priority").notNull().default("medium"),
    taskType: taskTypeEnum("task_type").notNull().default("other"),
    
    // Scheduling
    startDate: timestamp("start_date", { withTimezone: true }),
    dueDate: timestamp("due_date", { withTimezone: true }),
    
    // Tracking & Rollups
    estimatedDurationMins: integer("estimated_duration_mins").default(0),
    actualDurationMins: integer("actual_duration_mins").default(0),
    progress: integer("progress").notNull().default(0),
    
    // Template & Recurrence Architecture
    isTemplate: boolean("is_template").notNull().default(false),
    recurrenceRule: text("recurrence_rule"), // e.g. RRule string

    // Visibility
    isPrivate: boolean("is_private").notNull().default(false),
    
    ...auditFields,
  },
  (table) => [
    index("idx_tasks_milestone").on(table.milestoneId),
    index("idx_tasks_project_status").on(table.projectId, table.status),
    index("idx_tasks_parent").on(table.parentTaskId),
    index("idx_tasks_deleted").on(table.taskId, table.deletedAt),
  ]
);

/**
 * TASK ASSIGNEES
 */
export const taskAssignees = pgTable(
  "task_assignees",
  {
    assigneeId: uuid("assignee_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    taskId: uuid("task_id").notNull().references(() => tasks.taskId, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.userId, { onDelete: "cascade" }),
    ...auditFields,
  },
  (table) => [
    unique("unique_task_assignee").on(table.taskId, table.userId)
  ]
);

/**
 * TASK DEPENDENCIES
 */
export const taskDependencies = pgTable(
  "task_dependencies",
  {
    dependencyId: uuid("dependency_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    predecessorId: uuid("predecessor_id").notNull().references(() => tasks.taskId, { onDelete: "cascade" }),
    successorId: uuid("successor_id").notNull().references(() => tasks.taskId, { onDelete: "cascade" }),
    dependencyType: taskDependencyTypeEnum("dependency_type").notNull().default("finish_to_start"),
    ...auditFields,
  },
  (table) => [
    unique("unique_task_dependency").on(table.predecessorId, table.successorId),
  ]
);

/**
 * TASK COMMENTS
 */
export const taskComments = pgTable(
  "task_comments",
  {
    commentId: uuid("comment_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    taskId: uuid("task_id").notNull().references(() => tasks.taskId, { onDelete: "cascade" }),
    content: jsonb("content").notNull(),
    ...auditFields,
  }
);

/**
 * TASK CHECKLISTS
 */
export const taskChecklists = pgTable(
  "task_checklists",
  {
    checklistId: uuid("checklist_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    taskId: uuid("task_id").notNull().references(() => tasks.taskId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    orderIndex: integer("order_index").notNull().default(0),
    ...auditFields,
  }
);

export const taskChecklistItems = pgTable(
  "task_checklist_items",
  {
    itemId: uuid("item_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    taskId: uuid("task_id").notNull().references(() => tasks.taskId, { onDelete: "cascade" }),
    checklistId: uuid("checklist_id").notNull().references(() => taskChecklists.checklistId, { onDelete: "cascade" }),
    content: text("content").notNull(),
    isCompleted: boolean("is_completed").notNull().default(false),
    orderIndex: integer("order_index").notNull().default(0),
    ...auditFields,
  }
);

/**
 * TASK LABELS & TAGS
 */
export const taskLabels = pgTable(
  "task_labels",
  {
    mappingId: uuid("mapping_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    taskId: uuid("task_id").notNull().references(() => tasks.taskId, { onDelete: "cascade" }),
    labelId: uuid("label_id").notNull().references(() => labels.labelId, { onDelete: "cascade" }),
    ...auditFields,
  },
  (table) => [
    unique("unique_task_label").on(table.taskId, table.labelId),
  ]
);

export const taskTags = pgTable(
  "task_tags",
  {
    mappingId: uuid("mapping_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    taskId: uuid("task_id").notNull().references(() => tasks.taskId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    ...auditFields,
  },
  (table) => [
    unique("unique_task_tag_name").on(table.taskId, table.name),
  ]
);

/**
 * TIME TRACKING
 */
export const taskTimeEntries = pgTable(
  "task_time_entries",
  {
    timeEntryId: uuid("time_entry_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    taskId: uuid("task_id").notNull().references(() => tasks.taskId, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.userId, { onDelete: "cascade" }),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }),
    durationMins: integer("duration_mins"),
    isManual: boolean("is_manual").notNull().default(false),
    notes: text("notes"),
    ...auditFields,
  }
);

/**
 * WATCHERS
 */
export const taskWatchers = pgTable(
  "task_watchers",
  {
    watcherId: uuid("watcher_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    taskId: uuid("task_id").notNull().references(() => tasks.taskId, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.userId, { onDelete: "cascade" }),
    ...auditFields,
  },
  (table) => [
    unique("unique_task_watcher").on(table.taskId, table.userId),
  ]
);

/**
 * ATTACHMENTS (Links to future file system)
 */
export const taskAttachments = pgTable(
  "task_attachments",
  {
    attachmentId: uuid("attachment_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    taskId: uuid("task_id").notNull().references(() => tasks.taskId, { onDelete: "cascade" }),
    fileId: uuid("file_id").notNull(), // Future generic file reference
    ...auditFields,
  }
);

/**
 * ACTIVITY & HISTORY
 */
export const taskActivity = pgTable(
  "task_activity",
  {
    activityId: uuid("activity_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    taskId: uuid("task_id").notNull().references(() => tasks.taskId, { onDelete: "cascade" }),
    eventType: taskActivityEventEnum("event_type").notNull(),
    metadata: jsonb("metadata"), // Structured changes { field: string, old: any, new: any }
    ...auditFields,
  }
);
