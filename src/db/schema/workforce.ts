import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { auditFields } from "./_shared";
import {
  attendanceStatusEnum,
  correctionStatusEnum,
  correctionTypeEnum,
} from "./enums";
import { approvalCycles } from "./approvals";
import { organizations } from "./organizations";
import { users } from "./users";

/**
 * Workforce bounded context — Attendance write models (merge doc 14 §3,
 * Sprint 3A / WP-106 subset).
 *
 * Authored only: migration 0008 is generated but NOT applied (Phase 7).
 * Deferred to later sprints per doc 17: `activity_summary` (WP-107/114/115 —
 * work validation) and `export_history` (WP-133). `attendance_corrections`
 * is authored in Sprint 3B (below). RLS org-member policies follow
 * migration-0001 conventions when migrations are applied in Phase 7.
 */

/** Server-captured context at clock commands (doc 14 §5 ClockContext VO). */
export type ClockContextColumn = {
  ipAddress?: string;
  device?: string;
  browser?: string;
  location?: string;
};

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    attendanceId: uuid("attendance_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "restrict" }),
    /** DayDate VO — resolved in policy timezone at write time (policy 10.4). */
    date: date("date").notNull(),
    clockInAt: timestamp("clock_in_at", { withTimezone: true }),
    clockOutAt: timestamp("clock_out_at", { withTimezone: true }),
    status: attendanceStatusEnum("status").notNull().default("WORKING"),
    isLate: boolean("is_late").notNull().default(false),
    // Denormalized at finalization; source of truth for history reads.
    // idle/focus stay 0 until the WP-107 engine lands (Sprint 3B scope).
    workingMinutes: integer("working_minutes").notNull().default(0),
    breakMinutes: integer("break_minutes").notNull().default(0),
    idleMinutes: integer("idle_minutes").notNull().default(0),
    focusMinutes: integer("focus_minutes").notNull().default(0),
    effectiveMinutes: integer("effective_minutes").notNull().default(0),
    overtimeMinutes: integer("overtime_minutes").notNull().default(0),
    clockInContext: jsonb("clock_in_context").$type<ClockContextColumn>(),
    clockOutContext: jsonb("clock_out_context").$type<ClockContextColumn>(),
    notes: text("notes"),
    ...auditFields,
  },
  (table) => [
    uniqueIndex("uq_attendance_org_user_date").on(
      table.organizationId,
      table.userId,
      table.date,
    ),
    index("idx_attendance_org").on(table.organizationId),
    index("idx_attendance_org_date").on(table.organizationId, table.date),
    index("idx_attendance_user_date").on(table.userId, table.date),
  ],
);

export const attendanceBreaks = pgTable(
  "attendance_breaks",
  {
    breakId: uuid("break_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "cascade" }),
    attendanceId: uuid("attendance_id")
      .notNull()
      .references(() => attendanceRecords.attendanceId, {
        onDelete: "cascade",
      }),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    /** Open break = endAt IS NULL; at most one open per attendance day. */
    endAt: timestamp("end_at", { withTimezone: true }),
    kind: text("kind").notNull().default("break"),
    ...auditFields,
  },
  (table) => [
    index("idx_attendance_breaks_attendance").on(table.attendanceId),
    index("idx_attendance_breaks_org").on(table.organizationId),
  ],
);

/**
 * Correction requests (merge doc 14 §3, Sprint 3B / WP-120). Rides M09 via
 * `approvalCycleId` (the cycle is the process record; this row is the
 * workforce-facing domain record — §8.2). Authored only; migration generated
 * unapplied (Phase 7). The M09 engine/tables are not modified — only its
 * subject-type registry is extended (doc 14 §7.2), which is a later WP.
 */
export const attendanceCorrections = pgTable(
  "attendance_corrections",
  {
    correctionId: uuid("correction_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "cascade" }),
    /** Human code COR-#### (per-org sequence). */
    correctionCode: text("correction_code").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "restrict" }),
    date: date("date").notNull(),
    correctionType: correctionTypeEnum("correction_type").notNull(),
    requestedClockInAt: timestamp("requested_clock_in_at", {
      withTimezone: true,
    }),
    requestedClockOutAt: timestamp("requested_clock_out_at", {
      withTimezone: true,
    }),
    requestedStatus: attendanceStatusEnum("requested_status"),
    reason: text("reason").notNull(),
    evidenceUrl: text("evidence_url"),
    status: correctionStatusEnum("status").notNull().default("PENDING"),
    approvalCycleId: uuid("approval_cycle_id").references(
      () => approvalCycles.cycleId,
      { onDelete: "set null" },
    ),
    reviewedBy: uuid("reviewed_by").references(() => users.userId, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNote: text("review_note"),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    ...auditFields,
  },
  (table) => [
    uniqueIndex("uq_correction_org_code").on(
      table.organizationId,
      table.correctionCode,
    ),
    index("idx_correction_org").on(table.organizationId),
    index("idx_correction_user").on(table.userId),
    index("idx_correction_org_status").on(table.organizationId, table.status),
    index("idx_correction_org_user_date").on(
      table.organizationId,
      table.userId,
      table.date,
    ),
  ],
);
