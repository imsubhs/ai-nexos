import { boolean, integer, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Standard audit fields required on every table (DBD §5).
 * `created_by` / `updated_by` / `deleted_by` reference users.user_id but are
 * declared as plain uuids here to avoid circular imports; cross-table
 * constraints live in database/migrations/0001_security_rls_foundation.sql.
 */
export const auditFields = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: uuid("created_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedBy: uuid("updated_by"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: uuid("deleted_by"),
  isArchived: boolean("is_archived").notNull().default(false),
  version: integer("version").notNull().default(1),
};
