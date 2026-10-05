import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { auditFields } from "./_shared";
import { employmentTypeEnum } from "./enums";
import { organizations } from "./organizations";
import { users, type WorkingHours } from "./users";
import { roles } from "./roles";
import { departments } from "./departments";

/**
 * Membership lifecycle status model.
 * Recommended: active | invited | suspended | pending.
 */
export const membershipStatusEnum = pgEnum("membership_status", [
  "active",
  "invited",
  "suspended",
  "pending",
]);

export const MEMBERSHIP_STATUSES = {
  ACTIVE: "active",
  INVITED: "invited",
  SUSPENDED: "suspended",
  PENDING: "pending",
} as const;

export type MembershipStatus = (typeof membershipStatusEnum.enumValues)[number];

/**
 * public.organization_memberships
 *
 * Core relational join table decoupling Global User Identity (`public.users`)
 * from Tenant Workspaces (`public.organizations`).
 *
 * Architectural Invariants:
 * 1. Exactly one active membership per (user_id, organization_id) pair.
 * 2. Role assignment is scoped to the membership (`role_id`).
 * 3. Deleting a membership does NOT cascade-delete users, organizations, or tenant resources.
 */
export const organizationMemberships = pgTable(
  "organization_memberships",
  {
    membershipId: uuid("membership_id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, {
        onDelete: "cascade",
      }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.roleId, { onDelete: "restrict" }),
    departmentId: uuid("department_id").references(
      () => departments.departmentId,
      { onDelete: "set null" },
    ),
    designation: text("designation"),
    employmentType: employmentTypeEnum("employment_type")
      .notNull()
      .default("full_time"),
    workingHours: jsonb("working_hours").$type<WorkingHours>(),
    status: membershipStatusEnum("status").notNull().default("active"),
    isDefault: boolean("is_default").notNull().default(false),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    ...auditFields,
  },
  (table) => [
    uniqueIndex("uq_user_organization").on(table.userId, table.organizationId),
    index("idx_memberships_org").on(table.organizationId),
    index("idx_memberships_user").on(table.userId),
    index("idx_memberships_role").on(table.roleId),
    index("idx_memberships_org_status").on(table.organizationId, table.status),
    index("idx_memberships_user_status").on(table.userId, table.status),
  ],
);

export const organizationMembershipsRelations = relations(
  organizationMemberships,
  ({ one }) => ({
    user: one(users, {
      fields: [organizationMemberships.userId],
      references: [users.userId],
    }),
    organization: one(organizations, {
      fields: [organizationMemberships.organizationId],
      references: [organizations.organizationId],
    }),
    role: one(roles, {
      fields: [organizationMemberships.roleId],
      references: [roles.roleId],
    }),
    department: one(departments, {
      fields: [organizationMemberships.departmentId],
      references: [departments.departmentId],
    }),
  }),
);

export type OrganizationMembership =
  typeof organizationMemberships.$inferSelect;
export type InsertOrganizationMembership =
  typeof organizationMemberships.$inferInsert;
