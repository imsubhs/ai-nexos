import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { auditFields } from "./_shared";
import { organizations } from "./organizations";
import { users } from "./users";
import { roles } from "./roles";
import { departments } from "./departments";

export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "revoked",
  "expired",
]);

export const INVITATION_STATUSES = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REVOKED: "revoked",
  EXPIRED: "expired",
} as const;

export type InvitationStatus =
  (typeof invitationStatusEnum.enumValues)[number];

/**
 * public.organization_invitations
 *
 * Manages team member invitations into sovereign agency workspaces.
 * Uses cryptographically secure single-use token hashes to prevent leak via DB snapshot.
 */
export const organizationInvitations = pgTable(
  "organization_invitations",
  {
    invitationId: uuid("invitation_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, {
        onDelete: "cascade",
      }),
    email: text("email").notNull(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.roleId, { onDelete: "restrict" }),
    departmentId: uuid("department_id").references(
      () => departments.departmentId,
      { onDelete: "set null" },
    ),
    tokenHash: text("token_hash").notNull(),
    status: invitationStatusEnum("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    invitedByUserId: uuid("invited_by_user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedByUserId: uuid("accepted_by_user_id").references(
      () => users.userId,
      { onDelete: "set null" },
    ),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedByUserId: uuid("revoked_by_user_id").references(
      () => users.userId,
      { onDelete: "set null" },
    ),
    ...auditFields,
  },
  (table) => [
    uniqueIndex("uq_invitations_token_hash").on(table.tokenHash),
    index("idx_invitations_org").on(table.organizationId),
    index("idx_invitations_email").on(table.email),
    index("idx_invitations_org_status").on(
      table.organizationId,
      table.status,
    ),
  ],
);

export const organizationInvitationsRelations = relations(
  organizationInvitations,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationInvitations.organizationId],
      references: [organizations.organizationId],
    }),
    role: one(roles, {
      fields: [organizationInvitations.roleId],
      references: [roles.roleId],
    }),
    department: one(departments, {
      fields: [organizationInvitations.departmentId],
      references: [departments.departmentId],
    }),
    invitedByUser: one(users, {
      fields: [organizationInvitations.invitedByUserId],
      references: [users.userId],
    }),
  }),
);

export type OrganizationInvitation =
  typeof organizationInvitations.$inferSelect;
export type InsertOrganizationInvitation =
  typeof organizationInvitations.$inferInsert;
