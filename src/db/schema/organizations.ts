import {
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { auditFields } from "./_shared";
import { entityStatusEnum } from "./enums";

/**
 * Top of the platform hierarchy (PRD Module 01, DBD §8).
 * V1 runs a single organization, but every operational table references
 * organization_id so multi-tenant SaaS expansion requires no restructuring.
 */
export const organizations = pgTable(
  "organizations",
  {
    organizationId: uuid("organization_id").primaryKey().defaultRandom(),
    organizationName: text("organization_name").notNull(),
    legalName: text("legal_name"),
    /** URL-safe unique identifier — future custom domains / tenant routing. */
    slug: text("slug").notNull(),
    logoUrl: text("logo_url"),
    website: text("website"),
    industry: text("industry"),
    timezone: text("timezone").notNull().default("UTC"),
    currency: text("currency").notNull().default("USD"),
    country: text("country"),
    address: text("address"),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    brandPrimaryColor: text("brand_primary_color"),
    brandSecondaryColor: text("brand_secondary_color"),
    status: entityStatusEnum("status").notNull().default("active"),
    ...auditFields,
  },
  (table) => [
    uniqueIndex("uq_organizations_slug").on(table.slug),
    index("idx_organizations_status").on(table.status),
  ],
);

export const organizationSequences = pgTable(
  "organization_sequences",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    nextValue: integer("next_value").notNull().default(1),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.entityType] }),
    uniqueIndex("uq_org_seq_entity").on(table.organizationId, table.entityType),
  ],
);
