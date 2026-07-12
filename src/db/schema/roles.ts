import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { auditFields } from "./_shared";
import { organizations } from "./organizations";

/**
 * Role-based permission profiles (DBD §11, TRD §11).
 * `permissions` holds a module→actions map, e.g.
 * { "projects": ["read","create","update"], "clients": ["read"] }
 * The wildcard entry { "*": ["*"] } grants full access (Owner).
 * Enforced in Postgres by app.has_permission() and mirrored in
 * src/features/permissions for the application layer.
 */
export const roles = pgTable(
  "roles",
  {
    roleId: uuid("role_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "restrict" }),
    roleName: text("role_name").notNull(),
    /** Stable machine key, e.g. "owner", "project_manager". */
    roleKey: text("role_key").notNull(),
    description: text("description"),
    permissions: jsonb("permissions")
      .$type<Record<string, string[]>>()
      .notNull()
      .default({}),
    /** System roles ship with the platform and cannot be deleted. */
    isSystem: boolean("is_system").notNull().default(false),
    ...auditFields,
  },
  (table) => [
    uniqueIndex("uq_roles_org_key").on(table.organizationId, table.roleKey),
    index("idx_roles_organization").on(table.organizationId),
  ],
);
