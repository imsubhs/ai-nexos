/**
 * Drizzle-backed CorrectionRepository. Compile-safe now against the authored
 * doc 14 §3 `attendance_corrections` table; becomes the live runtime path when
 * Supabase is wired in Phase 7. Org scoping is an explicit predicate on every
 * query, RLS the second boundary.
 *
 * The timeline (doc 14 §11.4) reads the L3 event store by correlation id; the
 * C-9 apply-to-AttendanceDay amendment is deferred (see action-core).
 */
import { db } from "@/db";
import { attendanceCorrections, events, users } from "@/db/schema";
import { and, asc, count, desc, eq, inArray, type SQL } from "drizzle-orm";
import type { CorrectionStatus } from "../shared/enums";
import { CORRECTION_STATUSES } from "../shared/enums";
import {
  CorrectionError,
  type CorrectionListFilters,
  type CorrectionRepository,
  type CreateCorrectionData,
  type ReviewDecisionData,
} from "./repository";
import type {
  CorrectionDetail,
  CorrectionListItem,
  CorrectionListResult,
  CorrectionStatusCounts,
  CorrectionTimelineEntry,
} from "./types";

type CorrectionRow = typeof attendanceCorrections.$inferSelect;

function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

async function nameOf(userId: string | null): Promise<string> {
  if (!userId) return "Unknown";
  const rows = await db
    .select({ firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.userId, userId))
    .limit(1);
  const u = rows[0];
  return u ? [u.firstName, u.lastName].filter(Boolean).join(" ") : "Unknown";
}

async function timelineFor(
  organizationId: string,
  correctionId: string,
): Promise<CorrectionTimelineEntry[]> {
  const rows = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        eq(events.aggregateId, correctionId),
      ),
    )
    .orderBy(asc(events.createdAt));
  return rows.map((e) => {
    const payload = (e.payload ?? {}) as Record<string, unknown>;
    return {
      eventId: e.eventId,
      eventName:
        typeof payload.eventName === "string"
          ? payload.eventName
          : e.aggregateType,
      at: e.createdAt.toISOString(),
      actorId: e.actorId ?? null,
      payload,
    };
  });
}

function toListItem(
  r: CorrectionRow,
  employeeName: string,
): CorrectionListItem {
  return {
    correctionId: r.correctionId,
    correctionCode: r.correctionCode,
    userId: r.userId,
    employeeName,
    date: r.date,
    correctionType: r.correctionType,
    status: r.status,
    reason: r.reason,
    createdAt: r.createdAt.toISOString(),
    reviewedAt: iso(r.reviewedAt),
  };
}

async function toDetail(r: CorrectionRow): Promise<CorrectionDetail> {
  return {
    ...toListItem(r, await nameOf(r.userId)),
    requestedClockInAt: iso(r.requestedClockInAt),
    requestedClockOutAt: iso(r.requestedClockOutAt),
    requestedStatus: r.requestedStatus,
    evidenceUrl: r.evidenceUrl,
    approvalCycleId: r.approvalCycleId,
    reviewedBy: r.reviewedBy,
    reviewerName: r.reviewedBy ? await nameOf(r.reviewedBy) : null,
    reviewNote: r.reviewNote,
    appliedAt: iso(r.appliedAt),
    timeline: await timelineFor(r.organizationId, r.correctionId),
  };
}

function emptyCounts(): CorrectionStatusCounts {
  return CORRECTION_STATUSES.reduce((acc, s) => {
    acc[s] = 0;
    return acc;
  }, {} as CorrectionStatusCounts);
}

async function requireRow(
  organizationId: string,
  correctionId: string,
): Promise<CorrectionRow> {
  const rows = await db
    .select()
    .from(attendanceCorrections)
    .where(
      and(
        eq(attendanceCorrections.organizationId, organizationId),
        eq(attendanceCorrections.correctionId, correctionId),
      ),
    )
    .limit(1);
  if (!rows[0]) {
    throw new CorrectionError("correction/not-found", "Correction not found.");
  }
  return rows[0];
}

export const realCorrectionRepository: CorrectionRepository = {
  async create(organizationId, actorUserId, data: CreateCorrectionData) {
    // COR-#### comes from organization_sequences in Phase 7; placeholder now.
    const inserted = await db
      .insert(attendanceCorrections)
      .values({
        organizationId,
        correctionCode: "COR-PENDING",
        userId: data.userId,
        date: data.date,
        correctionType: data.correctionType,
        requestedClockInAt: data.requestedClockInAt
          ? new Date(data.requestedClockInAt)
          : null,
        requestedClockOutAt: data.requestedClockOutAt
          ? new Date(data.requestedClockOutAt)
          : null,
        requestedStatus: data.requestedStatus ?? null,
        reason: data.reason,
        evidenceUrl: data.evidenceUrl ?? null,
        status: "PENDING",
        approvalCycleId: data.approvalCycleId ?? null,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      })
      .returning();
    return toDetail(inserted[0]);
  },

  async findById(organizationId, correctionId) {
    const rows = await db
      .select()
      .from(attendanceCorrections)
      .where(
        and(
          eq(attendanceCorrections.organizationId, organizationId),
          eq(attendanceCorrections.correctionId, correctionId),
        ),
      )
      .limit(1);
    return rows[0] ? toDetail(rows[0]) : null;
  },

  async hasOpenForDate(organizationId, userId, date) {
    const open: CorrectionStatus[] = ["PENDING", "UNDER_REVIEW"];
    const rows = await db
      .select({ id: attendanceCorrections.correctionId })
      .from(attendanceCorrections)
      .where(
        and(
          eq(attendanceCorrections.organizationId, organizationId),
          eq(attendanceCorrections.userId, userId),
          eq(attendanceCorrections.date, date),
          inArray(attendanceCorrections.status, open),
        ),
      )
      .limit(1);
    return rows.length > 0;
  },

  async listForUser(organizationId, userId, filters: CorrectionListFilters) {
    const base = [
      eq(attendanceCorrections.organizationId, organizationId),
      eq(attendanceCorrections.userId, userId),
    ];
    return runList(base, filters);
  },

  async listQueue(
    organizationId,
    scopeUserIds,
    filters: CorrectionListFilters,
  ) {
    const base = [eq(attendanceCorrections.organizationId, organizationId)];
    if (scopeUserIds) {
      base.push(inArray(attendanceCorrections.userId, scopeUserIds));
    }
    if (filters.departmentId) {
      const deptUsers = await db
        .select({ userId: users.userId })
        .from(users)
        .where(eq(users.departmentId, filters.departmentId));
      base.push(
        inArray(
          attendanceCorrections.userId,
          deptUsers.map((u) => u.userId),
        ),
      );
    }
    return runList(base, filters);
  },

  async markUnderReview(organizationId, actorUserId, correctionId) {
    const row = await requireRow(organizationId, correctionId);
    if (row.status === "PENDING") {
      await db
        .update(attendanceCorrections)
        .set({ status: "UNDER_REVIEW", updatedBy: actorUserId })
        .where(eq(attendanceCorrections.correctionId, correctionId));
    }
    return toDetail(await requireRow(organizationId, correctionId));
  },

  async cancel(organizationId, actorUserId, correctionId) {
    await requireRow(organizationId, correctionId);
    await db
      .update(attendanceCorrections)
      .set({ status: "CANCELLED", updatedBy: actorUserId })
      .where(
        and(
          eq(attendanceCorrections.organizationId, organizationId),
          eq(attendanceCorrections.correctionId, correctionId),
        ),
      );
    return toDetail(await requireRow(organizationId, correctionId));
  },

  async applyDecision(organizationId, correctionId, data: ReviewDecisionData) {
    await requireRow(organizationId, correctionId);
    await db
      .update(attendanceCorrections)
      .set({
        status: data.decision,
        reviewedBy: data.reviewedBy,
        reviewedAt: new Date(data.reviewedAt),
        reviewNote: data.reviewNote ?? null,
        updatedBy: data.reviewedBy,
      })
      .where(
        and(
          eq(attendanceCorrections.organizationId, organizationId),
          eq(attendanceCorrections.correctionId, correctionId),
        ),
      );
    return toDetail(await requireRow(organizationId, correctionId));
  },

  async markApplied(organizationId, correctionId, appliedAt) {
    await requireRow(organizationId, correctionId);
    await db
      .update(attendanceCorrections)
      .set({ appliedAt: new Date(appliedAt) })
      .where(
        and(
          eq(attendanceCorrections.organizationId, organizationId),
          eq(attendanceCorrections.correctionId, correctionId),
        ),
      );
    return toDetail(await requireRow(organizationId, correctionId));
  },
};

async function runList(
  baseConditions: SQL[],
  filters: CorrectionListFilters,
): Promise<CorrectionListResult> {
  const countRows = await db
    .select({ status: attendanceCorrections.status, value: count() })
    .from(attendanceCorrections)
    .where(and(...baseConditions))
    .groupBy(attendanceCorrections.status);
  const counts = emptyCounts();
  for (const c of countRows) counts[c.status] = c.value;

  const conditions = [...baseConditions];
  if (filters.status) {
    conditions.push(eq(attendanceCorrections.status, filters.status));
  }
  const where = and(...conditions);
  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(attendanceCorrections)
      .where(where)
      .orderBy(desc(attendanceCorrections.createdAt))
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize),
    db.select({ value: count() }).from(attendanceCorrections).where(where),
  ]);

  const items = await Promise.all(
    rows.map(async (r) => toListItem(r, await nameOf(r.userId))),
  );
  return { rows: items, total: totals[0]?.value ?? 0, counts };
}
