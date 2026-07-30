import {
  index,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uuid,
  integer,
  bigserial,
  unique,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";
import { eventTypeEnum } from "./enums";

// Module 12: Notification & Event Engine - Event Store
// Stored in a dedicated 'events' schema.
export const eventsSchema = pgSchema("events");

/**
 * Immutable Event Store table.
 * Records every domain event that occurs in the system (DBD §12).
 */
export const events = eventsSchema.table(
  "events",
  {
    eventId: uuid("event_id").primaryKey().defaultRandom(),
    globalSequence: bigserial("global_sequence", { mode: "number" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "restrict" }),
    eventType: eventTypeEnum("event_type").notNull(),

    // Core tracing & causality
    eventVersion: integer("event_version").notNull().default(1),
    correlationId: uuid("correlation_id"),
    causationId: uuid("causation_id"),

    aggregateType: text("aggregate_type").notNull(),
    aggregateId: uuid("aggregate_id").notNull(),

    // Strongly typed payload
    payload: jsonb("payload").notNull(),

    // Actor triggering the event
    actorId: uuid("actor_id").references(() => users.userId, {
      onDelete: "set null",
    }),

    // AI / Retention Metadata (Reserved as per architecture)
    aiMetadata: jsonb("ai_metadata"),
    retainedUntil: timestamp("retained_until", { withTimezone: true }),

    // Immutable timestamp
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_events_org_type").on(table.organizationId, table.eventType),
    index("idx_events_aggregate").on(table.aggregateType, table.aggregateId),
    index("idx_events_correlation").on(table.correlationId),
    index("idx_events_created").on(table.createdAt),
    unique("uq_events_aggregate_version").on(
      table.aggregateId,
      table.eventVersion,
    ),
  ],
);
