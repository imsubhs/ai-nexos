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
  bigint,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  fileLifecycleStatusEnum,
  fileTypeEnum,
  fileRelationTypeEnum,
  fileShareAccessEnum,
  fileActivityEventEnum,
} from "./enums";
import { organizations } from "./organizations";
import { projects } from "./projects";
import { users } from "./users";
import { auditFields } from "./_shared";

/**
 * RLS Policies
 */
const orgIsolationPolicy = pgPolicy("org_isolation_policy", {
  as: "permissive",
  to: "authenticated",
  for: "all",
  using: sql`organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid())`,
});

/**
 * FILE FOLDERS (Hierarchical Adjacency List)
 */
export const fileFolders = pgTable(
  "file_folders",
  {
    folderId: uuid("folder_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.projectId, { onDelete: "cascade" }),
    parentId: uuid("parent_id"), // Self-referencing FK added below
    name: text("name").notNull(),
    color: text("color").notNull().default("#3B82F6"),
    ...auditFields,
  },
  (table) => [
    index("idx_file_folders_project").on(table.projectId),
    index("idx_file_folders_parent").on(table.parentId),
    unique("unique_folder_name_per_parent").on(
      table.projectId,
      table.parentId,
      table.name,
    ),
    orgIsolationPolicy,
  ],
);

/**
 * FILES (Canonical Asset Record)
 */
export const files = pgTable(
  "files",
  {
    fileId: uuid("file_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.projectId, { onDelete: "cascade" }),
    folderId: uuid("folder_id").references(() => fileFolders.folderId, {
      onDelete: "set null",
    }),

    // Core details
    title: text("title").notNull(),
    description: text("description"),
    fileType: fileTypeEnum("file_type").notNull(),
    status: fileLifecycleStatusEnum("status").notNull().default("draft"),

    // Pointer to active version (FK added after version table)
    currentVersionId: uuid("current_version_id"),

    // Quota tracking cache
    totalSizeBytes: bigint("total_size_bytes", { mode: "number" })
      .notNull()
      .default(0),

    // AI Metadata placeholder (Reserved)
    aiMetadata: jsonb("ai_metadata"),

    ...auditFields,
  },
  (table) => [
    index("idx_files_project").on(table.projectId),
    index("idx_files_folder").on(table.folderId),
    index("idx_files_status").on(table.status),
    orgIsolationPolicy,
  ],
);

/**
 * FILE VERSIONS (Physical blobs)
 */
export const fileVersions = pgTable(
  "file_versions",
  {
    versionId: uuid("version_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.fileId, { onDelete: "cascade" }),

    versionNumber: integer("version_number").notNull().default(1),

    // Storage info
    storagePath: text("storage_path").notNull(),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    sha256Hash: text("sha256_hash").notNull(), // Canonical checksum

    // Metadata (EXIF, Dimensions, etc)
    metadata: jsonb("metadata"),

    changeReason: text("change_reason"),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.userId),

    ...auditFields, // Reusing auditFields for consistency, but mostly createdAt matters here
  },
  (table) => [
    index("idx_file_versions_file").on(table.fileId),
    index("idx_file_versions_hash").on(table.sha256Hash), // Duplicate detection
    orgIsolationPolicy,
  ],
);

/**
 * FILE RELATIONS (Polymorphic Bridge)
 */
export const fileRelations = pgTable(
  "file_relations",
  {
    relationId: uuid("relation_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.fileId, { onDelete: "cascade" }),

    entityType: fileRelationTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),

    ...auditFields,
  },
  (table) => [
    index("idx_file_relations_entity").on(table.entityType, table.entityId),
    unique("unique_file_entity_relation").on(
      table.fileId,
      table.entityType,
      table.entityId,
    ),
    orgIsolationPolicy,
  ],
);

/**
 * FILE COLLECTIONS (Logical Groups)
 */
export const fileCollections = pgTable(
  "file_collections",
  {
    collectionId: uuid("collection_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    ...auditFields,
  },
  () => [orgIsolationPolicy],
);

export const fileCollectionItems = pgTable(
  "file_collection_items",
  {
    mappingId: uuid("mapping_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => fileCollections.collectionId, { onDelete: "cascade" }),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.fileId, { onDelete: "cascade" }),
    ...auditFields,
  },
  (table) => [
    unique("unique_file_collection").on(table.collectionId, table.fileId),
    orgIsolationPolicy,
  ],
);

/**
 * FILE COMMENTS
 */
export const fileComments = pgTable(
  "file_comments",
  {
    commentId: uuid("comment_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.fileId, { onDelete: "cascade" }),
    versionId: uuid("version_id").references(() => fileVersions.versionId, {
      onDelete: "cascade",
    }), // Specific to version if applicable

    content: jsonb("content").notNull(),
    coordinateX: integer("coordinate_x"), // For image/video spatial commenting
    coordinateY: integer("coordinate_y"),
    timestampSeconds: integer("timestamp_seconds"), // For video/audio temporal commenting

    ...auditFields,
  },
  () => [orgIsolationPolicy],
);

/**
 * TAXONOMY
 */
export const fileLabels = pgTable(
  "file_labels",
  {
    mappingId: uuid("mapping_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.fileId, { onDelete: "cascade" }),
    labelId: uuid("label_id").notNull(), // Assuming cross-reference to global labels table
    ...auditFields,
  },
  (table) => [
    unique("unique_file_label").on(table.fileId, table.labelId),
    orgIsolationPolicy,
  ],
);

export const fileTags = pgTable(
  "file_tags",
  {
    mappingId: uuid("mapping_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.fileId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    ...auditFields,
  },
  (table) => [
    unique("unique_file_tag_name").on(table.fileId, table.name),
    orgIsolationPolicy,
  ],
);

/**
 * SHARE LINKS
 */
export const fileShares = pgTable(
  "file_shares",
  {
    shareId: uuid("share_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    versionId: uuid("version_id")
      .notNull()
      .references(() => fileVersions.versionId, { onDelete: "cascade" }), // Immutable reference

    token: text("token").notNull().unique(), // Secure random token
    accessLevel: fileShareAccessEnum("access_level")
      .notNull()
      .default("preview"),

    expiresAt: timestamp("expires_at", { withTimezone: true }),
    maxDownloads: integer("max_downloads"),
    downloadCount: integer("download_count").notNull().default(0),

    passwordHash: text("password_hash"),

    ...auditFields,
  },
  () => [orgIsolationPolicy],
);

/**
 * USAGE METRICS (Downloads, Views)
 */
export const fileMetrics = pgTable(
  "file_metrics",
  {
    metricId: uuid("metric_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.fileId, { onDelete: "cascade" }),
    versionId: uuid("version_id").references(() => fileVersions.versionId, {
      onDelete: "cascade",
    }),

    metricType: text("metric_type").notNull(), // 'view' or 'download'
    userId: uuid("user_id"), // Can be null for anonymous shares
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),

    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  () => [orgIsolationPolicy],
);

/**
 * AUDIT TRAIL
 */
export const fileActivity = pgTable(
  "file_activity",
  {
    activityId: uuid("activity_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.fileId, { onDelete: "cascade" }),
    versionId: uuid("version_id").references(() => fileVersions.versionId, {
      onDelete: "set null",
    }),

    eventType: fileActivityEventEnum("event_type").notNull(),
    metadata: jsonb("metadata"), // Structured changes { field: string, old: any, new: any }
    ...auditFields,
  },
  () => [orgIsolationPolicy],
);
