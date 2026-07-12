import { index, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { auditFields } from "./_shared";
import { entityStatusEnum } from "./enums";
import { organizations } from "./organizations";

/**
 * Internal departments (PRD Module 01, DBD §9).
 * `department_head` references users.user_id; the FK is added in
 * database/sql/0001_constraints.sql to break the users↔departments cycle.
 */
export const departments = pgTable(
  "departments",
  {
    departmentId: uuid("department_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "restrict" }),
    departmentName: text("department_name").notNull(),
    description: text("description"),
    departmentHead: uuid("department_head"),
    status: entityStatusEnum("status").notNull().default("active"),
    ...auditFields,
  },
  (table) => [
    uniqueIndex("uq_departments_org_name").on(
      table.organizationId,
      table.departmentName,
    ),
    index("idx_departments_organization").on(table.organizationId),
  ],
);
