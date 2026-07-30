import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  unique,
  index,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  revisionTypeEnum,
  revisionStatusEnum,
  revisionPriorityEnum,
} from "./enums";
import { organizations } from "./organizations";
import { projects } from "./projects";
import { deliverables } from "./deliverables";
import { users } from "./users";
import { files } from "./files";
import { tasks, labels } from "./tasks";
import { auditFields } from "./_shared";

/**
 * RLS Policies for Revisions
 */
const projectIsolationPolicy = pgPolicy("project_isolation_policy", {
  as: "permissive",
  to: "authenticated",
  for: "all",
  using: sql`organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()) AND project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())`,
});

/**
 * REVISIONS
 */
export const revisions = pgTable(
  "revisions",
  {
    revisionId: uuid("revision_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.projectId, { onDelete: "cascade" }),
    deliverableId: uuid("deliverable_id")
      .notNull()
      .references(() => deliverables.deliverableId, { onDelete: "cascade" }),

    // Connect to global time tracking and task management
    taskId: uuid("task_id").references(() => tasks.taskId, {
      onDelete: "set null",
    }),

    name: text("name").notNull(),
    description: text("description"),
    versionNumber: integer("version_number").notNull(),

    type: revisionTypeEnum("type").notNull().default("MINOR"),
    status: revisionStatusEnum("status").notNull().default("CREATED"),
    priority: revisionPriorityEnum("priority").notNull().default("MEDIUM"),

    // Architectural Requirements
    isLocked: boolean("is_locked").notNull().default(false), // Automatically locked when entering Approval

    // Sequential / Parallel Branching Architecture (Reserved)
    parentRevisionId: uuid("parent_revision_id"),
    branchName: text("branch_name"),
    isMainBranch: boolean("is_main_branch").notNull().default(true),

    // AI Reserved
    aiMetadata: jsonb("ai_metadata"),

    ...auditFields,
  },
  (table) => [
    index("idx_revisions_project").on(table.projectId),
    index("idx_revisions_deliverable").on(table.deliverableId),
    unique("uq_revision_branch").on(table.deliverableId, table.branchName),
    projectIsolationPolicy,
  ],
);

/**
 * REVISION ITEMS
 */
export const revisionItems = pgTable(
  "revision_items",
  {
    itemId: uuid("item_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => revisions.revisionId, { onDelete: "cascade" }),

    fileId: uuid("file_id").references(() => files.fileId, {
      onDelete: "cascade",
    }),
    action: text("action").notNull(), // e.g. ADD, MODIFY, DELETE

    // Merge conflict architecture (Reserved)
    conflictStatus: text("conflict_status"), // e.g. NONE, DETECTED, RESOLVED
    conflictResolutionMetadata: jsonb("conflict_resolution_metadata"),

    ...auditFields,
  },
  () => [projectIsolationPolicy],
);

/**
 * REVISION REQUESTS
 */
export const revisionRequests = pgTable(
  "revision_requests",
  {
    requestId: uuid("request_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    deliverableId: uuid("deliverable_id")
      .notNull()
      .references(() => deliverables.deliverableId, { onDelete: "cascade" }),
    revisionId: uuid("revision_id").references(() => revisions.revisionId, {
      onDelete: "set null",
    }),

    requesterId: uuid("requester_id").references(() => users.userId, {
      onDelete: "set null",
    }),
    clientRequesterName: text("client_requester_name"),

    requestDetails: text("request_details").notNull(),

    ...auditFields,
  },
  () => [projectIsolationPolicy],
);

/**
 * REVISION THREADS
 */
export const revisionThreads = pgTable(
  "revision_threads",
  {
    threadId: uuid("thread_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => revisions.revisionId, { onDelete: "cascade" }),

    status: text("status").notNull().default("open"), // open, resolved

    ...auditFields,
  },
  () => [projectIsolationPolicy],
);

/**
 * REVISION COMMENTS
 */
export const revisionComments = pgTable(
  "revision_comments",
  {
    commentId: uuid("comment_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => revisionThreads.threadId, { onDelete: "cascade" }),

    authorId: uuid("author_id").references(() => users.userId, {
      onDelete: "set null",
    }),
    content: jsonb("content").notNull(), // Rich text
    isPinned: boolean("is_pinned").notNull().default(false),

    ...auditFields,
  },
  () => [projectIsolationPolicy],
);

/**
 * REVISION CHANGES
 */
export const revisionChanges = pgTable(
  "revision_changes",
  {
    changeId: uuid("change_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => revisions.revisionId, { onDelete: "cascade" }),

    changeSummary: text("change_summary").notNull(),
    reason: text("reason"),
    impact: text("impact"),

    // AI Reserved
    aiDifferenceDetection: jsonb("ai_difference_detection"),
    aiMergeRecommendation: jsonb("ai_merge_recommendation"),
    aiRiskAssessment: jsonb("ai_risk_assessment"),

    ...auditFields,
  },
  () => [projectIsolationPolicy],
);

/**
 * REVISION HISTORY
 */
export const revisionHistory = pgTable(
  "revision_history",
  {
    historyId: uuid("history_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => revisions.revisionId, { onDelete: "cascade" }),

    previousStatus: text("previous_status"),
    newStatus: text("new_status").notNull(),

    actionBy: uuid("action_by").references(() => users.userId, {
      onDelete: "set null",
    }),
    notes: text("notes"),

    ...auditFields,
  },
  () => [projectIsolationPolicy],
);

/**
 * REVISION ASSIGNMENTS
 */
export const revisionAssignments = pgTable(
  "revision_assignments",
  {
    assignmentId: uuid("assignment_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => revisions.revisionId, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),

    ...auditFields,
  },
  (table) => [
    unique("uq_revision_assignment").on(table.revisionId, table.userId),
    projectIsolationPolicy,
  ],
);

/**
 * REVISION CHECKLISTS
 */
export const revisionChecklists = pgTable(
  "revision_checklists",
  {
    checklistId: uuid("checklist_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => revisions.revisionId, { onDelete: "cascade" }),

    title: text("title").notNull(),
    isCompleted: boolean("is_completed").notNull().default(false),
    orderIndex: integer("order_index").notNull().default(0),

    ...auditFields,
  },
  () => [projectIsolationPolicy],
);

/**
 * REVISION ACTIVITY
 */
export const revisionActivity = pgTable(
  "revision_activity",
  {
    activityId: uuid("activity_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => revisions.revisionId, { onDelete: "cascade" }),

    eventType: text("event_type").notNull(),
    metadata: jsonb("metadata"), // Structured revision activity events

    userId: uuid("user_id").references(() => users.userId, {
      onDelete: "set null",
    }),

    ...auditFields,
  },
  () => [projectIsolationPolicy],
);

/**
 * REVISION LABELS
 */
export const revisionLabels = pgTable(
  "revision_labels",
  {
    mappingId: uuid("mapping_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => revisions.revisionId, { onDelete: "cascade" }),
    labelId: uuid("label_id")
      .notNull()
      .references(() => labels.labelId, { onDelete: "cascade" }),
    ...auditFields,
  },
  (table) => [
    unique("uq_revision_label").on(table.revisionId, table.labelId),
    projectIsolationPolicy,
  ],
);

/**
 * REVISION TAGS
 */
export const revisionTags = pgTable(
  "revision_tags",
  {
    mappingId: uuid("mapping_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => revisions.revisionId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    ...auditFields,
  },
  (table) => [
    unique("uq_revision_tag").on(table.revisionId, table.name),
    projectIsolationPolicy,
  ],
);

/**
 * REVISION MERGE PREVIEWS
 * Support merge preview architecture.
 */
export const revisionMergePreviews = pgTable(
  "revision_merge_previews",
  {
    previewId: uuid("preview_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => revisions.revisionId, { onDelete: "cascade" }),

    previewData: jsonb("preview_data"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),

    ...auditFields,
  },
  () => [projectIsolationPolicy],
);
