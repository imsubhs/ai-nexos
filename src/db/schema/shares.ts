import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { auditFields } from "./_shared";
import { organizations } from "./organizations";
import { projects } from "./projects";
import { files } from "./files";
import { deliverables } from "./deliverables";
import { users } from "./users";
import {
  shareTypeEnum,
  shareSessionStatusEnum,
  sharePermissionLevelEnum,
  annotationTypeEnum,
  feedbackStatusEnum,
} from "./enums";

// 1. External Identities
export const externalIdentities = pgTable(
  "external_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    displayName: varchar("display_name", { length: 255 }),
    company: varchar("company", { length: 255 }),
    avatarUrl: text("avatar_url"),
    lastIp: varchar("last_ip", { length: 45 }),
    lastUserAgent: text("last_user_agent"),
    ...auditFields,
  },
  (table) => {
    return {
      orgEmailIdx: uniqueIndex("idx_external_identities_org_email").on(
        table.organizationId,
        table.email,
      ),
    };
  },
);

// 2. Share Policies
export const sharePolicies = pgTable("share_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.organizationId, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.projectId, {
    onDelete: "cascade",
  }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false).notNull(),
  allowDownloads: boolean("allow_downloads").default(false).notNull(),
  requirePassword: boolean("require_password").default(false).notNull(),
  requireWatermark: boolean("require_watermark").default(true).notNull(),
  expirationDays: integer("expiration_days"),
  maxViews: integer("max_views"),
  allowedIps: jsonb("allowed_ips").$type<string[]>(),
  allowedCountries: jsonb("allowed_countries").$type<string[]>(),
  ...auditFields,
});

// 3. Share Sessions
export const shareSessions = pgTable(
  "share_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.projectId, { onDelete: "cascade" }),
    policyId: uuid("policy_id").references(() => sharePolicies.id),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    shareType: shareTypeEnum("share_type").notNull(),
    status: shareSessionStatusEnum("status").default("draft").notNull(),
    secureToken: varchar("secure_token", { length: 255 }).unique(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...auditFields,
  },
  (table) => {
    return {
      orgIdx: index("idx_share_sessions_org").on(table.organizationId),
      projectIdx: index("idx_share_sessions_project").on(table.projectId),
      tokenIdx: index("idx_share_sessions_token").on(table.secureToken),
      statusIdx: index("idx_share_sessions_status").on(table.status),
    };
  },
);

// 4. Share Session Items
export const shareSessionItems = pgTable(
  "share_session_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => shareSessions.id), // Removed cascade for app-level archive
    deliverableId: uuid("deliverable_id").references(
      () => deliverables.deliverableId,
    ),
    fileId: uuid("file_id").references(() => files.fileId),
    orderIndex: integer("order_index").notNull().default(0),
    ...auditFields,
  },
  (table) => {
    return {
      sessionIdx: index("idx_share_session_items_session").on(table.sessionId),
    };
  },
);

// 5. Share Recipients
export const shareRecipients = pgTable(
  "share_recipients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => shareSessions.id),
    identityId: uuid("identity_id")
      .notNull()
      .references(() => externalIdentities.id),
    hasAccessed: boolean("has_accessed").default(false).notNull(),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
    ...auditFields,
  },
  (table) => {
    return {
      sessionIdentityUnique: uniqueIndex("idx_share_recipients_unique").on(
        table.sessionId,
        table.identityId,
      ),
      sessionIdx: index("idx_share_recipients_session").on(table.sessionId),
    };
  },
);

// 6. Share Permissions
export const sharePermissions = pgTable(
  "share_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => shareSessions.id),
    recipientId: uuid("recipient_id").references(() => shareRecipients.id),
    level: sharePermissionLevelEnum("level").notNull(),
    ...auditFields,
  },
  (table) => {
    return {
      sessionRecipientIdx: index("idx_share_permissions_session_recipient").on(
        table.sessionId,
        table.recipientId,
      ),
    };
  },
);

// 7. Share Comments
export const shareComments = pgTable(
  "share_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => shareSessions.id),
    itemId: uuid("item_id")
      .notNull()
      .references(() => shareSessionItems.id),
    authorIdentityId: uuid("author_identity_id").references(
      () => externalIdentities.id,
    ),
    authorUserId: uuid("author_user_id").references(() => users.userId),
    parentId: uuid("parent_id"), // Self-referencing for threads
    content: text("content").notNull(), // Rich text
    status: feedbackStatusEnum("status").default("open").notNull(),
    ...auditFields,
  },
  (table) => {
    return {
      itemIdx: index("idx_share_comments_item").on(table.itemId),
      sessionIdx: index("idx_share_comments_session").on(table.sessionId),
      sessionCreatedIdx: index("idx_share_comments_session_created").on(
        table.sessionId,
        table.createdAt,
      ),
      itemCreatedIdx: index("idx_share_comments_item_created").on(
        table.itemId,
        table.createdAt,
      ),
    };
  },
);

// 8. Share Annotations
export const shareAnnotations = pgTable(
  "share_annotations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => shareSessions.id),
    itemId: uuid("item_id")
      .notNull()
      .references(() => shareSessionItems.id),
    commentId: uuid("comment_id").references(() => shareComments.id),
    type: annotationTypeEnum("type").notNull(),
    normX: real("norm_x"),
    normY: real("norm_y"),
    normWidth: real("norm_width"),
    normHeight: real("norm_height"),
    timeMs: integer("time_ms"),
    ...auditFields,
  },
  (table) => {
    return {
      itemIdx: index("idx_share_annotations_item").on(table.itemId),
      sessionCreatedIdx: index("idx_share_annotations_session_created").on(
        table.sessionId,
        table.createdAt,
      ),
      itemCreatedIdx: index("idx_share_annotations_item_created").on(
        table.itemId,
        table.createdAt,
      ),
    };
  },
);

// 9. Share Activity
export const shareActivity = pgTable(
  "share_activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => shareSessions.id),
    identityId: uuid("identity_id").references(() => externalIdentities.id),
    activityType: varchar("activity_type", { length: 50 }).notNull(),
    details: jsonb("details"),
    ...auditFields,
  },
  (table) => {
    return {
      sessionIdx: index("idx_share_activity_session").on(table.sessionId),
    };
  },
);

// 10. Share Events
export const shareEvents = pgTable("share_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id").notNull(),
  sessionId: uuid("session_id").references(() => shareSessions.id, {
    onDelete: "set null",
  }),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  payload: jsonb("payload").notNull(),
  emittedAt: timestamp("emitted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  ...auditFields,
});

// 11. Share Access Logs
export const shareAccessLogs = pgTable(
  "share_access_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => shareSessions.id),
    identityId: uuid("identity_id").references(() => externalIdentities.id),
    ipAddress: varchar("ip_address", { length: 45 }).notNull(),
    userAgent: text("user_agent"),
    deviceFingerprint: varchar("device_fingerprint", { length: 255 }),
    isSuccess: boolean("is_success").notNull(),
    failureReason: varchar("failure_reason", { length: 255 }),
    ...auditFields,
  },
  (table) => {
    return {
      sessionIdx: index("idx_share_access_logs_session").on(table.sessionId),
    };
  },
);

// 12. Share Download Logs
export const shareDownloadLogs = pgTable("share_download_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id").notNull(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => shareSessions.id, { onDelete: "cascade" }),
  itemId: uuid("item_id")
    .notNull()
    .references(() => shareSessionItems.id, { onDelete: "cascade" }),
  identityId: uuid("identity_id").references(() => externalIdentities.id),
  ipAddress: varchar("ip_address", { length: 45 }),
  ...auditFields,
});

// 13. Share Security Logs
export const shareSecurityLogs = pgTable("share_security_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id").notNull(),
  sessionId: uuid("session_id").references(() => shareSessions.id, {
    onDelete: "cascade",
  }),
  eventCategory: varchar("event_category", { length: 100 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  details: jsonb("details"),
  ...auditFields,
});

// 14. Share Notifications
export const shareNotifications = pgTable("share_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id").notNull(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => shareSessions.id, { onDelete: "cascade" }),
  notifyOnView: boolean("notify_on_view").default(false).notNull(),
  notifyOnComment: boolean("notify_on_comment").default(true).notNull(),
  notifyOnApproval: boolean("notify_on_approval").default(true).notNull(),
  targetUserIds: jsonb("target_user_ids").$type<string[]>(), // Array of internal user UUIDs to notify
  ...auditFields,
});

// 15. Share Expiration
export const shareExpiration = pgTable("share_expiration", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id").notNull(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => shareSessions.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  maxViews: integer("max_views"),
  currentViews: integer("current_views").default(0).notNull(),
  isRevoked: boolean("is_revoked").default(false).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  ...auditFields,
});

// 16. Share Passwords
export const sharePasswords = pgTable("share_passwords", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id").notNull(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => shareSessions.id, { onDelete: "cascade" }),
  hashedPassword: varchar("hashed_password", { length: 255 }).notNull(),
  salt: varchar("salt", { length: 255 }).notNull(),
  ...auditFields,
});

// 17. Share Watermarks
export const shareWatermarks = pgTable("share_watermarks", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id").notNull(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => shareSessions.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  content: text("content"),
  opacity: real("opacity").default(0.5).notNull(),
  position: varchar("position", { length: 50 }).default("center").notNull(),
  ...auditFields,
});

// 18. Share Versions
export const shareVersions = pgTable("share_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id").notNull(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => shareSessions.id, { onDelete: "cascade" }),
  snapshotData: jsonb("snapshot_data").notNull(),
  ...auditFields,
});

// 19. Share Labels
export const shareLabels = pgTable("share_labels", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id").notNull(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => shareSessions.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }),
  ...auditFields,
});

// 20. Share Tags
export const shareTags = pgTable("share_tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  projectId: uuid("project_id").notNull(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => shareSessions.id, { onDelete: "cascade" }),
  tag: varchar("tag", { length: 50 }).notNull(),
  ...auditFields,
});

// 21. Share Token Nonces (Replay Protection)
export const shareTokenNonces = pgTable(
  "share_token_nonces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nonce: varchar("nonce", { length: 255 }).unique().notNull(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => shareSessions.id),
    identityId: uuid("identity_id").references(() => externalIdentities.id),
    usedAt: timestamp("used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...auditFields,
  },
  (table) => {
    return {
      nonceIdx: uniqueIndex("idx_share_token_nonces_nonce").on(table.nonce),
    };
  },
);
