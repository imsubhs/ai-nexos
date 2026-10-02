import {
  date,
  index,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { auditFields } from "./_shared";
import { employmentTypeEnum, entityStatusEnum } from "./enums";
import { departments } from "./departments";
import { organizations } from "./organizations";
import { roles } from "./roles";

export type WorkingHours = {
  /** ISO weekday (1 = Monday … 7 = Sunday) → { start: "09:00", end: "18:00" } */
  [isoWeekday: string]: { start: string; end: string } | null;
};

/**
 * Internal authenticated users only — clients never have accounts (PRD §9).
 * user_id mirrors auth.users.id (Supabase Auth); the FK lives in
 * database/sql/0001_constraints.sql because Drizzle does not manage the
 * auth schema.
 */
export const users = pgTable(
  "users",
  {
    userId: uuid("user_id").primaryKey(),
    /**
     * LEGACY COMPATIBILITY FIELD.
     * In target multi-tenant SaaS architecture (Phase 3+), tenancy moves to
     * `organization_memberships`. Kept for backward compatibility during migration.
     */
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "restrict" }),
    departmentId: uuid("department_id").references(
      () => departments.departmentId,
      { onDelete: "set null" },
    ),
    /**
     * LEGACY COMPATIBILITY FIELD.
     * In target multi-tenant SaaS architecture (Phase 3+), role authority moves
     * to `organization_memberships.role_id`. Kept for backward compatibility during migration.
     */
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.roleId, { onDelete: "restrict" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name"),
    email: text("email").notNull(),
    phone: text("phone"),
    avatarUrl: text("avatar_url"),
    designation: text("designation"),
    timezone: text("timezone").notNull().default("UTC"),
    workingHours: jsonb("working_hours").$type<WorkingHours>(),
    employmentType: employmentTypeEnum("employment_type")
      .notNull()
      .default("full_time"),
    joiningDate: date("joining_date"),
    status: entityStatusEnum("status").notNull().default("active"),
    ...auditFields,
  },
  (table) => [
    uniqueIndex("uq_users_email").on(table.email),
    index("idx_users_organization").on(table.organizationId),
    index("idx_users_department").on(table.departmentId),
    index("idx_users_role").on(table.roleId),
    index("idx_users_status").on(table.organizationId, table.status),
  ],
);
