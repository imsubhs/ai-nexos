import { relations } from "drizzle-orm";
import { index, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { auditFields } from "./_shared";
import {
  clientHealthEnum,
  clientStatusEnum,
  communicationPreferenceEnum,
  contactTypeEnum,
  entityStatusEnum,
} from "./enums";
import { organizations } from "./organizations";

export const clients = pgTable(
  "clients",
  {
    clientId: uuid("client_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "cascade" }),
    companyName: text("company_name").notNull(),
    industry: text("industry"),
    website: text("website"),
    address: text("address"),
    country: text("country"),
    notes: text("notes"),
    status: clientStatusEnum("status").notNull().default("active"),
    clientHealth: clientHealthEnum("client_health"),
    logoUrl: text("logo_url"),
    brandColors: jsonb("brand_colors"), // Array of hex strings e.g. ["#000000", "#FFFFFF"]
    typography: jsonb("typography"),
    moodboards: jsonb("moodboards"),
    brandAssetsUrl: text("brand_assets_url"),
    googleDriveFolderUrl: text("google_drive_folder_url"),
    referenceAssets: jsonb("reference_assets"),
    preferredCommunication: communicationPreferenceEnum("preferred_communication"),
    aiSummary: text("ai_summary"),
    aiHealthScore: text("ai_health_score"),
    ...auditFields,
  },
  (table) => [
    index("idx_clients_organization_id").on(table.organizationId),
    index("idx_clients_status").on(table.status),
  ]
);

export const clientContacts = pgTable(
  "client_contacts",
  {
    contactId: uuid("contact_id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.clientId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    contactType: contactTypeEnum("contact_type").notNull().default("primary"),
    designation: text("designation"),
    email: text("email"),
    phone: text("phone"),
    linkedin: text("linkedin"),
    notes: text("notes"),
    status: entityStatusEnum("status").notNull().default("active"),
    ...auditFields,
  },
  (table) => [
    index("idx_client_contacts_client_id").on(table.clientId),
  ]
);

export const clientsRelations = relations(clients, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [clients.organizationId],
    references: [organizations.organizationId],
  }),
  contacts: many(clientContacts),
  // Stubbed future relations
  // projects: many(projects),
  // invoices: many(invoices),
  // contracts: many(contracts),
  // reports: many(reports),
  // shareLinks: many(shareLinks),
}));

export const clientContactsRelations = relations(clientContacts, ({ one }) => ({
  client: one(clients, {
    fields: [clientContacts.clientId],
    references: [clients.clientId],
  }),
}));
