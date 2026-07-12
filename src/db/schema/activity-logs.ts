import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";

/**
 * Immutable platform-wide activity log (SDS §12, TRD §35).
 * Append-only: RLS forbids UPDATE/DELETE for all non-service roles.
 * project_id is a plain uuid until the projects table lands in M2;
 * the FK is added by that milestone's migration.
 * High-volume table — partitioning candidate per DBD §50.
 */
export const activityLogs = pgTable(
  "activity_logs",
  {
    activityId: uuid("activity_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "restrict" }),
    userId: uuid("user_id").references(() => users.userId, {
      onDelete: "set null",
    }),
    projectId: uuid("project_id"),
    module: text("module").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    description: text("description").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_activity_org_created").on(table.organizationId, table.createdAt),
    index("idx_activity_project").on(table.projectId),
    index("idx_activity_user").on(table.userId),
    index("idx_activity_entity").on(table.entityType, table.entityId),
  ],
);
