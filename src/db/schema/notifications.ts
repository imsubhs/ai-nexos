import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { auditFields } from "./_shared";
import { organizations } from "./organizations";
import { users } from "./users";
import { projects } from "./projects";
import { events } from "./events";
import {
  eventTypeEnum,
  notificationChannelEnum,
  notificationDeliveryStatusEnum,
  notificationDigestFrequencyEnum,
  notificationDigestStatusEnum,
  notificationPreferenceLevelEnum,
  notificationPriorityEnum,
  notificationQueueStatusEnum,
  notificationStatusEnum,
  notificationActivityTypeEnum,
} from "./enums";

// Module 12: Notification & Event Engine - Notifications

export const notificationTemplates = pgTable(
  "notification_templates",
  {
    templateId: uuid("template_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "restrict" }),
    eventType: eventTypeEnum("event_type").notNull(),
    channel: notificationChannelEnum("channel").notNull(),
    subjectTemplate: text("subject_template").notNull(),
    bodyTemplate: text("body_template").notNull(),
    actionUrlTemplate: text("action_url_template"),
    ...auditFields,
  },
  (table) => [
    index("idx_notif_templates_org_event").on(
      table.organizationId,
      table.eventType,
    ),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    notificationId: uuid("notification_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "restrict" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.eventId, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "restrict" }),
    priority: notificationPriorityEnum("priority").notNull().default("normal"),
    status: notificationStatusEnum("status").notNull().default("queued"),
    readAt: timestamp("read_at", { withTimezone: true }),
    ...auditFields,
  },
  (table) => [
    index("idx_notifications_user_status").on(table.userId, table.status),
    index("idx_notifications_event").on(table.eventId),
    index("idx_notifications_org").on(table.organizationId),
  ],
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    preferenceId: uuid("preference_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "restrict" }),

    // Level determines if this applies to org defaults, a specific project, or a specific user
    level: notificationPreferenceLevelEnum("level").notNull(),

    userId: uuid("user_id").references(() => users.userId, {
      onDelete: "cascade",
    }),
    projectId: uuid("project_id").references(() => projects.projectId, {
      onDelete: "cascade",
    }),

    eventTypePreferences: jsonb("event_type_preferences").notNull(),

    quietHoursStart: time("quiet_hours_start"),
    quietHoursEnd: time("quiet_hours_end"),
    timezone: text("timezone").notNull().default("UTC"),
    digestFrequency: notificationDigestFrequencyEnum("digest_frequency")
      .notNull()
      .default("instant"),

    ...auditFields,
  },
  (table) => [
    index("idx_notif_prefs_user").on(table.userId),
    index("idx_notif_prefs_project").on(table.projectId),
    index("idx_notif_prefs_org_level").on(table.organizationId, table.level),
  ],
);

export const notificationChannels = pgTable(
  "notification_channels",
  {
    channelId: uuid("channel_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "restrict" }),
    channelType: notificationChannelEnum("channel_type").notNull(),
    providerConfig: jsonb("provider_config").notNull(), // e.g. sendgrid keys (abstracted)
    isActive: boolean("is_active").notNull().default(true),
    ...auditFields,
  },
  (table) => [
    index("idx_notif_channels_org_type").on(
      table.organizationId,
      table.channelType,
    ),
  ],
);

export const notificationDeliveries = pgTable(
  "notification_deliveries",
  {
    deliveryId: uuid("delivery_id").primaryKey().defaultRandom(),
    notificationId: uuid("notification_id")
      .notNull()
      .references(() => notifications.notificationId, { onDelete: "cascade" }),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => notificationChannels.channelId, {
        onDelete: "restrict",
      }),
    status: notificationDeliveryStatusEnum("status")
      .notNull()
      .default("queued"),
    providerMessageId: text("provider_message_id"),
    ...auditFields,
  },
  (table) => [
    index("idx_notif_deliveries_notification").on(table.notificationId),
    index("idx_notif_deliveries_status").on(table.status),
  ],
);

export const notificationQueue = pgTable(
  "notification_queue",
  {
    queueId: uuid("queue_id").primaryKey().defaultRandom(),
    deliveryId: uuid("delivery_id")
      .notNull()
      .unique()
      .references(() => notificationDeliveries.deliveryId, {
        onDelete: "cascade",
      }),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: notificationQueueStatusEnum("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"), // ID of the worker processing this
    ...auditFields,
  },
  (table) => [
    index("idx_notif_queue_polling").on(table.status, table.scheduledFor),
  ],
);

export const notificationDigest = pgTable(
  "notification_digest",
  {
    digestId: uuid("digest_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "restrict" }),
    frequency: notificationDigestFrequencyEnum("frequency").notNull(),
    status: notificationDigestStatusEnum("status")
      .notNull()
      .default("collecting"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    compiledPayload: jsonb("compiled_payload"),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"), // ID of the worker processing this
    ...auditFields,
  },
  (table) => [
    index("idx_notif_digest_polling").on(table.status, table.scheduledFor),
    index("idx_notif_digest_user").on(table.userId, table.status),
  ],
);

export const notificationLogs = pgTable(
  "notification_logs",
  {
    logId: uuid("log_id").primaryKey().defaultRandom(),
    deliveryId: uuid("delivery_id")
      .notNull()
      .references(() => notificationDeliveries.deliveryId, {
        onDelete: "cascade",
      }),
    action: text("action").notNull(), // e.g., 'dispatched_to_provider'
    logData: jsonb("log_data"),
    hmacSignature: text("hmac_signature"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_notif_logs_delivery").on(table.deliveryId)],
);

export const notificationFailures = pgTable(
  "notification_failures", // Dead Letter Queue
  {
    failureId: uuid("failure_id").primaryKey().defaultRandom(),
    deliveryId: uuid("delivery_id")
      .notNull()
      .references(() => notificationDeliveries.deliveryId, {
        onDelete: "cascade",
      }),
    errorCode: text("error_code").notNull(),
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").notNull().default(0),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    ...auditFields,
  },
  (table) => [index("idx_notif_failures_delivery").on(table.deliveryId)],
);

export const notificationWebhooks = pgTable(
  "notification_webhooks",
  {
    webhookId: uuid("webhook_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "restrict" }),
    endpointUrl: text("endpoint_url").notNull(),
    secretKey: text("secret_key").notNull(),
    eventTypes: jsonb("event_types").notNull(), // array of subscribed event types
    isActive: boolean("is_active").notNull().default(true),
    ...auditFields,
  },
  (table) => [index("idx_notif_webhooks_org").on(table.organizationId)],
);

export const notificationActivity = pgTable(
  "notification_activity",
  {
    activityId: uuid("activity_id").primaryKey().defaultRandom(),
    notificationId: uuid("notification_id")
      .notNull()
      .references(() => notifications.notificationId, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),
    activityType: notificationActivityTypeEnum("activity_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_notif_activity_notification").on(table.notificationId),
  ],
);
