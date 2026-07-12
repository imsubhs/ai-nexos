import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { jobStatusEnum, jobTypeEnum } from "./enums";
import { organizations } from "./organizations";

/**
 * Durable queue backing all asynchronous work (TRD §57).
 * This is the foundation of the File Processing Pipeline
 * (Upload → Validation → Virus Scan → Metadata → Thumbnail → Compression
 *  → Storage → Activity Log → Notification); workers are Supabase Edge
 * Functions polling via FOR UPDATE SKIP LOCKED. Full pipeline ships in M3
 * with the Files module — the queue contract is fixed now so every module
 * enqueues jobs the same way.
 */
export const backgroundJobs = pgTable(
  "background_jobs",
  {
    jobId: uuid("job_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "restrict" }),
    jobType: jobTypeEnum("job_type").notNull(),
    /** Chain jobs into pipelines: the next job runs when this one completes. */
    parentJobId: uuid("parent_job_id"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: jobStatusEnum("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    lastError: text("last_error"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid("created_by"),
  },
  (table) => [
    index("idx_jobs_status_scheduled").on(table.status, table.scheduledAt),
    index("idx_jobs_organization").on(table.organizationId),
    index("idx_jobs_parent").on(table.parentJobId),
  ],
);
