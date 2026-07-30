import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { auditFields } from "./_shared";
import { portalSessionStatusEnum, portalWidgetTypeEnum } from "./enums";
import { organizations } from "./organizations";
import { clients } from "./clients";
import { notifications } from "./notifications";

export const clientPortalSessions = pgTable(
  "client_portal_sessions",
  {
    sessionId: uuid("session_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.clientId, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    status: portalSessionStatusEnum("status").notNull().default("active"),
    deviceId: uuid("device_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...auditFields,
  },
  (table) => [
    index("idx_cp_sessions_org_id").on(table.organizationId),
    index("idx_cp_sessions_client_id").on(table.clientId),
    index("idx_cp_sessions_token").on(table.token),
  ],
);

export const clientPortalDevices = pgTable(
  "client_portal_devices",
  {
    deviceId: uuid("device_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.clientId, { onDelete: "cascade" }),
    fingerprint: text("fingerprint").notNull(),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    isTrusted: boolean("is_trusted").notNull().default(false),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    ...auditFields,
  },
  (table) => [
    index("idx_cp_devices_client_id").on(table.clientId),
    index("idx_cp_devices_fingerprint").on(table.fingerprint),
  ],
);

export const clientPortalPreferences = pgTable(
  "client_portal_preferences",
  {
    preferenceId: uuid("preference_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.clientId, { onDelete: "cascade" })
      .unique(),
    theme: text("theme").default("system"),
    notificationPreferences: jsonb("notification_preferences"),
    featureFlags: jsonb("feature_flags"),
    ...auditFields,
  },
  (table) => [index("idx_cp_preferences_client_id").on(table.clientId)],
);

export const clientPortalActivity = pgTable(
  "client_portal_activity",
  {
    activityId: uuid("activity_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.clientId, { onDelete: "cascade" }),
    sessionId: uuid("session_id"),
    action: text("action").notNull(),
    resourceType: text("resource_type"),
    resourceId: uuid("resource_id"),
    metadata: jsonb("metadata"),
    ...auditFields,
  },
  (table) => [
    index("idx_cp_activity_client_id").on(table.clientId),
    index("idx_cp_activity_resource").on(table.resourceType, table.resourceId),
    index("idx_cp_activity_client_created").on(
      table.clientId,
      table.createdAt.desc(),
    ),
  ],
);

export const clientPortalNotifications = pgTable(
  "client_portal_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.clientId, { onDelete: "cascade" }),
    notificationId: uuid("notification_id")
      .notNull()
      .references(() => notifications.notificationId, { onDelete: "cascade" }),
    isRead: boolean("is_read").notNull().default(false),
    readAt: timestamp("read_at", { withTimezone: true }),
    ...auditFields,
  },
  (table) => [index("idx_cp_notifications_client_id").on(table.clientId)],
);

export const clientPortalDashboardLayout = pgTable(
  "client_portal_dashboard_layout",
  {
    layoutId: uuid("layout_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.clientId, { onDelete: "cascade" }),
    widgetType: portalWidgetTypeEnum("widget_type").notNull(),
    isVisible: boolean("is_visible").notNull().default(true),
    displayOrder: integer("display_order").notNull(),
    config: jsonb("config"),
    ...auditFields,
  },
  (table) => [index("idx_cp_layout_client_id").on(table.clientId)],
);

export const clientPortalFavorites = pgTable(
  "client_portal_favorites",
  {
    favoriteId: uuid("favorite_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.clientId, { onDelete: "cascade" }),
    resourceType: text("resource_type").notNull(),
    resourceId: uuid("resource_id").notNull(),
    ...auditFields,
  },
  (table) => [index("idx_cp_favorites_client_id").on(table.clientId)],
);

export const clientPortalSecurity = pgTable("client_portal_security", {
  securityId: uuid("security_id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.organizationId, { onDelete: "cascade" }),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.clientId, { onDelete: "cascade" })
    .unique(),
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
  mfaSecret: text("mfa_secret"),
  allowedIps: jsonb("allowed_ips"),
  ...auditFields,
});
