/**
 * Drizzle-backed AttendanceRepository. Compile-safe now against the authored
 * doc 14 §3 tables; becomes the live runtime path when Supabase is wired in
 * Phase 7. Org scoping is an explicit predicate on every query, with RLS as
 * the second boundary (doc 15 §0).
 */
import { db } from "@/db";
import {
  attendanceBreaks,
  attendanceRecords,
  departments,
  events,
  users,
} from "@/db/schema";
import { and, asc, count, desc, eq, isNull } from "drizzle-orm";
import { DEFAULT_WORKFORCE_POLICY } from "../shared/types";
import {
  AttendanceError,
  type AmendDayData,
  type AttendanceDirectoryFilters,
  type AttendanceRepository,
  type CreateDayData,
  type FinalizeDayData,
} from "./repository";
import type {
  AttendanceDetail,
  AttendanceDirectoryRow,
  AttendanceMetrics,
  AttendanceState,
  AttendanceTimelineEntry,
  BreakView,
  TodayAttendanceView,
} from "./types";

type RecordRow = typeof attendanceRecords.$inferSelect;
type BreakRow = typeof attendanceBreaks.$inferSelect;

function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function metricsOf(r: RecordRow): AttendanceMetrics {
  return {
    workingMinutes: r.workingMinutes,
    breakMinutes: r.breakMinutes,
    idleMinutes: r.idleMinutes,
    focusMinutes: r.focusMinutes,
    effectiveMinutes: r.effectiveMinutes,
    overtimeMinutes: r.overtimeMinutes,
  };
}

function breakView(b: BreakRow): BreakView {
  return {
    breakId: b.breakId,
    startAt: b.startAt.toISOString(),
    endAt: iso(b.endAt),
    kind: b.kind,
  };
}

async function openBreakOf(attendanceId: string): Promise<BreakRow | null> {
  const rows = await db
    .select()
    .from(attendanceBreaks)
    .where(
      and(
        eq(attendanceBreaks.attendanceId, attendanceId),
        isNull(attendanceBreaks.endAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function toTodayView(r: RecordRow): Promise<TodayAttendanceView> {
  const isOngoing = r.clockOutAt == null;
  const open = isOngoing ? await openBreakOf(r.attendanceId) : null;
  const state: AttendanceState = !isOngoing
    ? "COMPLETED"
    : open
      ? "ON_BREAK"
      : "WORKING";
  return {
    state,
    attendanceId: r.attendanceId,
    date: r.date,
    status: r.status,
    isLate: r.isLate,
    clockInAt: iso(r.clockInAt),
    clockOutAt: iso(r.clockOutAt),
    openBreak: open ? breakView(open) : null,
    metrics: metricsOf(r),
    isOngoing,
    policy: {
      workStartTime: DEFAULT_WORKFORCE_POLICY.workStartTime,
      workEndTime: DEFAULT_WORKFORCE_POLICY.workEndTime,
    },
  };
}

export const realAttendanceRepository: AttendanceRepository = {
  async findDay(organizationId, userId, date) {
    const rows = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.organizationId, organizationId),
          eq(attendanceRecords.userId, userId),
          eq(attendanceRecords.date, date),
          isNull(attendanceRecords.deletedAt),
        ),
      )
      .limit(1);
    return rows[0] ? toTodayView(rows[0]) : null;
  },

  async findOpenDay(organizationId, userId) {
    const rows = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.organizationId, organizationId),
          eq(attendanceRecords.userId, userId),
          isNull(attendanceRecords.clockOutAt),
          isNull(attendanceRecords.deletedAt),
        ),
      )
      .limit(1);
    return rows[0] ? toTodayView(rows[0]) : null;
  },

  async createDay(organizationId, actorUserId, data: CreateDayData) {
    const inserted = await db
      .insert(attendanceRecords)
      .values({
        organizationId,
        userId: data.userId,
        date: data.date,
        clockInAt: new Date(data.clockInAt),
        status: data.status,
        isLate: data.isLate,
        clockInContext: data.clockInContext,
        notes: data.wfh ? "WFH" : null,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      })
      .returning();
    return toTodayView(inserted[0]);
  },

  async finalizeDay(organizationId, actorUserId, attendanceId, data: FinalizeDayData) {
    const open = await openBreakOf(attendanceId);
    if (open) {
      await db
        .update(attendanceBreaks)
        .set({ endAt: new Date(data.clockOutAt), updatedBy: actorUserId })
        .where(eq(attendanceBreaks.breakId, open.breakId));
    }
    const updated = await db
      .update(attendanceRecords)
      .set({
        clockOutAt: new Date(data.clockOutAt),
        status: data.status,
        isLate: data.isLate,
        workingMinutes: data.metrics.workingMinutes,
        breakMinutes: data.metrics.breakMinutes,
        idleMinutes: data.metrics.idleMinutes,
        focusMinutes: data.metrics.focusMinutes,
        effectiveMinutes: data.metrics.effectiveMinutes,
        overtimeMinutes: data.metrics.overtimeMinutes,
        clockOutContext: data.clockOutContext,
        notes: data.notes,
        updatedBy: actorUserId,
      })
      .where(
        and(
          eq(attendanceRecords.organizationId, organizationId),
          eq(attendanceRecords.attendanceId, attendanceId),
        ),
      )
      .returning();
    if (!updated[0]) {
      throw new AttendanceError(
        "attendance/not-found",
        "Attendance record not found.",
      );
    }
    return toTodayView(updated[0]);
  },

  async amendDay(organizationId, actorUserId, attendanceId, data: AmendDayData) {
    const updated = await db
      .update(attendanceRecords)
      .set({
        clockInAt: new Date(data.clockInAt),
        clockOutAt: data.clockOutAt ? new Date(data.clockOutAt) : null,
        status: data.status,
        isLate: data.isLate,
        workingMinutes: data.metrics.workingMinutes,
        breakMinutes: data.metrics.breakMinutes,
        idleMinutes: data.metrics.idleMinutes,
        focusMinutes: data.metrics.focusMinutes,
        effectiveMinutes: data.metrics.effectiveMinutes,
        overtimeMinutes: data.metrics.overtimeMinutes,
        updatedBy: actorUserId,
      })
      .where(
        and(
          eq(attendanceRecords.organizationId, organizationId),
          eq(attendanceRecords.attendanceId, attendanceId),
        ),
      )
      .returning();
    if (!updated[0]) {
      throw new AttendanceError(
        "attendance/not-found",
        "Attendance record not found.",
      );
    }
    return toTodayView(updated[0]);
  },

  async addBreak(organizationId, actorUserId, attendanceId, startAt, kind) {
    const inserted = await db
      .insert(attendanceBreaks)
      .values({
        organizationId,
        attendanceId,
        startAt: new Date(startAt),
        kind,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      })
      .returning();
    return breakView(inserted[0]);
  },

  async closeBreak(organizationId, actorUserId, attendanceId, endAt) {
    const open = await openBreakOf(attendanceId);
    if (!open) {
      throw new AttendanceError(
        "attendance/not-on-break",
        "There is no open break to end.",
      );
    }
    const updated = await db
      .update(attendanceBreaks)
      .set({ endAt: new Date(endAt), updatedBy: actorUserId })
      .where(eq(attendanceBreaks.breakId, open.breakId))
      .returning();
    return breakView(updated[0]);
  },

  async list(organizationId, filters: AttendanceDirectoryFilters) {
    const conditions = [
      eq(attendanceRecords.organizationId, organizationId),
      isNull(attendanceRecords.deletedAt),
    ];
    if (filters.date) conditions.push(eq(attendanceRecords.date, filters.date));
    if (filters.userId) {
      conditions.push(eq(attendanceRecords.userId, filters.userId));
    }
    if (filters.status) {
      conditions.push(eq(attendanceRecords.status, filters.status));
    }
    if (filters.departmentId) {
      conditions.push(eq(users.departmentId, filters.departmentId));
    }
    const where = and(...conditions);

    const [rows, totals] = await Promise.all([
      db
        .select({
          record: attendanceRecords,
          firstName: users.firstName,
          lastName: users.lastName,
          departmentId: users.departmentId,
          departmentName: departments.departmentName,
          userStatus: users.status,
        })
        .from(attendanceRecords)
        .innerJoin(users, eq(attendanceRecords.userId, users.userId))
        .leftJoin(departments, eq(users.departmentId, departments.departmentId))
        .where(where)
        .orderBy(desc(attendanceRecords.date), asc(users.firstName))
        .limit(filters.pageSize)
        .offset((filters.page - 1) * filters.pageSize),
      db
        .select({ value: count() })
        .from(attendanceRecords)
        .innerJoin(users, eq(attendanceRecords.userId, users.userId))
        .where(where),
    ]);

    const mapped: AttendanceDirectoryRow[] = rows.map((row) => ({
      attendanceId: row.record.attendanceId,
      userId: row.record.userId,
      employeeName: [row.firstName, row.lastName].filter(Boolean).join(" "),
      employeeCode: null, // Phase 2 §2.1 users.employee_code column
      departmentId: row.departmentId,
      departmentName: row.departmentName,
      date: row.record.date,
      status: row.record.status,
      isLate: row.record.isLate,
      clockInAt: iso(row.record.clockInAt),
      clockOutAt: iso(row.record.clockOutAt),
      metrics: metricsOf(row.record),
      isArchived: row.userStatus === "archived",
    }));

    return { rows: mapped, total: totals[0]?.value ?? 0 };
  },

  async findById(organizationId, attendanceId): Promise<AttendanceDetail | null> {
    const rows = await db
      .select({
        record: attendanceRecords,
        firstName: users.firstName,
        lastName: users.lastName,
        departmentId: users.departmentId,
        departmentName: departments.departmentName,
        userStatus: users.status,
      })
      .from(attendanceRecords)
      .innerJoin(users, eq(attendanceRecords.userId, users.userId))
      .leftJoin(departments, eq(users.departmentId, departments.departmentId))
      .where(
        and(
          eq(attendanceRecords.organizationId, organizationId),
          eq(attendanceRecords.attendanceId, attendanceId),
          isNull(attendanceRecords.deletedAt),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) return null;

    const dayBreaks = await db
      .select()
      .from(attendanceBreaks)
      .where(eq(attendanceBreaks.attendanceId, attendanceId))
      .orderBy(asc(attendanceBreaks.startAt));

    return {
      attendanceId: row.record.attendanceId,
      userId: row.record.userId,
      employeeName: [row.firstName, row.lastName].filter(Boolean).join(" "),
      employeeCode: null,
      departmentId: row.departmentId,
      departmentName: row.departmentName,
      date: row.record.date,
      status: row.record.status,
      isLate: row.record.isLate,
      clockInAt: iso(row.record.clockInAt),
      clockOutAt: iso(row.record.clockOutAt),
      metrics: metricsOf(row.record),
      isArchived: row.userStatus === "archived",
      breaks: dayBreaks.map(breakView),
      clockInContext: row.record.clockInContext ?? null,
      clockOutContext: row.record.clockOutContext ?? null,
      notes: row.record.notes,
    };
  },

  async listTimeline(
    organizationId,
    attendanceId,
  ): Promise<AttendanceTimelineEntry[]> {
    const rows = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.organizationId, organizationId),
          eq(events.aggregateId, attendanceId),
        ),
      )
      .orderBy(asc(events.createdAt));
    return rows.map((e) => {
      const payload = (e.payload ?? {}) as Record<string, unknown>;
      const eventName =
        typeof payload.eventName === "string" ? payload.eventName : e.aggregateType;
      return {
        eventId: e.eventId,
        eventName,
        at: e.createdAt.toISOString(),
        actorId: e.actorId ?? null,
        payload,
      };
    });
  },
};
