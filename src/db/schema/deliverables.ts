import { pgTable, uuid, text, timestamp, boolean, jsonb, integer, unique, index, pgPolicy } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { 
  deliverableTypeEnum,
  deliverableStatusEnum,
  approvalStatusEnum,
  reviewTypeEnum,
  shareLinkAccessLevelEnum
} from "./enums";
import { organizations } from "./organizations";
import { clients } from "./clients";
import { projects } from "./projects";
import { tasks } from "./tasks";
import { files } from "./files";
import { users } from "./users";
import { auditFields } from "./_shared";

/**
 * RLS Policies for Deliverables
 */
const orgIsolationPolicy = pgPolicy("org_isolation_policy", {
  as: "permissive",
  to: "authenticated",
  for: "all",
  using: sql`organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid())`
});

/**
 * DELIVERABLES (Core Package)
 */
export const deliverables = pgTable(
  "deliverables",
  {
    deliverableId: uuid("deliverable_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.organizationId, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull().references(() => projects.projectId, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.clientId, { onDelete: "set null" }),
    taskId: uuid("task_id").references(() => tasks.taskId, { onDelete: "set null" }),
    
    title: text("title").notNull(),
    description: text("description"),
    type: deliverableTypeEnum("type").notNull(),
    status: deliverableStatusEnum("status").notNull().default("draft"),
    
    currentRevisionId: uuid("current_revision_id"), // FK added in migrations to avoid circular logic
    isLocked: boolean("is_locked").notNull().default(false), // Locked after approval

    // Reserved Architecture
    aiMetadata: jsonb("ai_metadata"),
    
    ...auditFields,
  },
  (table) => [
    index("idx_deliverables_project").on(table.projectId),
    index("idx_deliverables_status").on(table.status),
    orgIsolationPolicy
  ]
);

/**
 * DELIVERABLE REVISIONS (Immutable states)
 */
export const deliverableRevisions = pgTable(
  "deliverable_revisions",
  {
    revisionId: uuid("revision_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    deliverableId: uuid("deliverable_id").notNull().references(() => deliverables.deliverableId, { onDelete: "cascade" }),
    
    versionNumber: integer("version_number").notNull(),
    reason: text("reason"),
    requestedBy: uuid("requested_by").references(() => users.userId, { onDelete: "set null" }), // if internal
    clientRequesterName: text("client_requester_name"), // if external
    
    status: deliverableStatusEnum("status").notNull().default("draft"),
    
    // Reserved for revision comparison logic
    comparisonMetadata: jsonb("comparison_metadata"),

    ...auditFields,
  },
  (table) => [
    unique("uq_deliverable_revision_num").on(table.deliverableId, table.versionNumber),
    orgIsolationPolicy
  ]
);

/**
 * DELIVERABLE FILES (Many-to-many bridge mapping files to specific revisions)
 */
export const deliverableFiles = pgTable(
  "deliverable_files",
  {
    mappingId: uuid("mapping_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    deliverableId: uuid("deliverable_id").notNull().references(() => deliverables.deliverableId, { onDelete: "cascade" }),
    revisionId: uuid("revision_id").notNull().references(() => deliverableRevisions.revisionId, { onDelete: "cascade" }),
    fileId: uuid("file_id").notNull().references(() => files.fileId, { onDelete: "cascade" }),
    
    orderIndex: integer("order_index").notNull().default(0),
    ...auditFields,
  },
  (table) => [
    unique("uq_deliverable_file_revision").on(table.revisionId, table.fileId),
    orgIsolationPolicy
  ]
);

/**
 * DELIVERABLE REFERENCE ATTACHMENTS (Client Upload Sandbox)
 * Client uploads are isolated here. Requires explicit internal approval to convert to production files.
 */
export const deliverableReferenceAttachments = pgTable(
  "deliverable_reference_attachments",
  {
    attachmentId: uuid("attachment_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    deliverableId: uuid("deliverable_id").notNull().references(() => deliverables.deliverableId, { onDelete: "cascade" }),
    
    // Raw external storage path before conversion
    temporaryStoragePath: text("temporary_storage_path").notNull(),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    
    uploadedByClientName: text("uploaded_by_client_name").notNull(),
    isConvertedToProduction: boolean("is_converted_to_production").notNull().default(false),
    convertedFileId: uuid("converted_file_id").references(() => files.fileId, { onDelete: "set null" }),

    ...auditFields,
  },
  () => [orgIsolationPolicy]
);

/**
 * DELIVERABLE REVIEW SESSIONS (The container for a review cycle)
 */
export const deliverableReviewSessions = pgTable(
  "deliverable_review_sessions",
  {
    sessionId: uuid("session_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    deliverableId: uuid("deliverable_id").notNull().references(() => deliverables.deliverableId, { onDelete: "cascade" }),
    revisionId: uuid("revision_id").notNull().references(() => deliverableRevisions.revisionId, { onDelete: "cascade" }),
    
    reviewType: reviewTypeEnum("review_type").notNull(),
    status: deliverableStatusEnum("status").notNull().default("preparing"),
    
    deadlineAt: timestamp("deadline_at", { withTimezone: true }),
    isExpired: boolean("is_expired").notNull().default(false),
    
    // Reserved for live presence detection during a session
    presenceMetadata: jsonb("presence_metadata"),

    ...auditFields,
  },
  () => [orgIsolationPolicy]
);

/**
 * DELIVERABLE REVIEW THREADS
 */
export const deliverableReviewThreads = pgTable(
  "deliverable_review_threads",
  {
    threadId: uuid("thread_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    sessionId: uuid("session_id").notNull().references(() => deliverableReviewSessions.sessionId, { onDelete: "cascade" }),
    
    fileId: uuid("file_id").references(() => files.fileId, { onDelete: "cascade" }), // Specific to a file if needed
    coordinateX: integer("coordinate_x"), // For image/video
    coordinateY: integer("coordinate_y"),
    timestampSeconds: integer("timestamp_seconds"), // For video
    
    status: text("status").notNull().default("open"), // open, resolved
    ...auditFields,
  },
  () => [orgIsolationPolicy]
);

/**
 * DELIVERABLE REVIEW COMMENTS
 */
export const deliverableReviewComments = pgTable(
  "deliverable_review_comments",
  {
    commentId: uuid("comment_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    threadId: uuid("thread_id").notNull().references(() => deliverableReviewThreads.threadId, { onDelete: "cascade" }),
    
    authorId: uuid("author_id").references(() => users.userId, { onDelete: "set null" }), // Internal
    clientAuthorName: text("client_author_name"), // External
    
    content: jsonb("content").notNull(),
    attachments: jsonb("attachments"), // E.g. array of deliverableReferenceAttachments IDs
    isInternalOnly: boolean("is_internal_only").notNull().default(false),
    
    ...auditFields,
  },
  () => [orgIsolationPolicy]
);

/**
 * DELIVERABLE APPROVALS
 */
export const deliverableApprovals = pgTable(
  "deliverable_approvals",
  {
    approvalId: uuid("approval_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    sessionId: uuid("session_id").notNull().references(() => deliverableReviewSessions.sessionId, { onDelete: "cascade" }),
    
    approverId: uuid("approver_id").references(() => users.userId, { onDelete: "set null" }), // Internal
    clientApproverSignature: text("client_approver_signature"), // External e.g. "John Doe"
    clientApproverEmail: text("client_approver_email"),
    
    status: approvalStatusEnum("status").notNull(),
    notes: text("notes"), // Mandatory if rejected or approved_with_comments
    
    ...auditFields,
  },
  () => [orgIsolationPolicy]
);

/**
 * DELIVERABLE SHARE LINKS
 */
export const deliverableShareLinks = pgTable(
  "deliverable_share_links",
  {
    shareId: uuid("share_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    deliverableId: uuid("deliverable_id").notNull().references(() => deliverables.deliverableId, { onDelete: "cascade" }),
    revisionId: uuid("revision_id").notNull().references(() => deliverableRevisions.revisionId, { onDelete: "cascade" }),
    
    token: text("token").notNull().unique(),
    accessLevel: shareLinkAccessLevelEnum("access_level").notNull().default("view_only"),
    
    // Security & Access
    passwordHash: text("password_hash"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    maxDownloads: integer("max_downloads"),
    downloadCount: integer("download_count").notNull().default(0),
    
    // Dynamic generation flags (Architectural decision 2)
    isWatermarkEnabled: boolean("is_watermark_enabled").notNull().default(false),
    
    // Email dispatch metadata (Architectural decision 3)
    sentViaEmail: boolean("sent_via_email").notNull().default(false),
    emailRecipient: text("email_recipient"),
    emailDeliveredAt: timestamp("email_delivered_at", { withTimezone: true }),
    
    ...auditFields,
  },
  (table) => [
    index("idx_share_links_token").on(table.token),
    orgIsolationPolicy
  ]
);

/**
 * TAXONOMY
 */
export const deliverableLabels = pgTable(
  "deliverable_labels",
  {
    mappingId: uuid("mapping_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    deliverableId: uuid("deliverable_id").notNull().references(() => deliverables.deliverableId, { onDelete: "cascade" }),
    labelId: uuid("label_id").notNull(), // Assuming global labels link
    ...auditFields,
  },
  (table) => [
    unique("uq_deliverable_label").on(table.deliverableId, table.labelId),
    orgIsolationPolicy
  ]
);

export const deliverableTags = pgTable(
  "deliverable_tags",
  {
    mappingId: uuid("mapping_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    deliverableId: uuid("deliverable_id").notNull().references(() => deliverables.deliverableId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    ...auditFields,
  },
  (table) => [
    unique("uq_deliverable_tag").on(table.deliverableId, table.name),
    orgIsolationPolicy
  ]
);

/**
 * ACTIVITY LOGS (Deliverable specific)
 */
export const deliverableActivity = pgTable(
  "deliverable_activity",
  {
    activityId: uuid("activity_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    deliverableId: uuid("deliverable_id").notNull().references(() => deliverables.deliverableId, { onDelete: "cascade" }),
    
    eventType: text("event_type").notNull(),
    metadata: jsonb("metadata"), // Structured changes { field: string, old: any, new: any }
    ...auditFields,
  },
  () => [orgIsolationPolicy]
);
