/**
 * DemoStore-backed AttendanceRepository (merge doc 15 §0 demo contract).
 * Reads and writes live store collections so demo sessions behave like a
 * database: clock-in appears in the directory, clock-out finalizes minutes,
 * breaks nest under the open day. Never returns hardcoded results
 * (report 09 §C1 rule).
 */
import { getDemoStore, logDemoActivity, nextDemoId } from "@/lib/demo/store";
import type { AttendanceStatus } from "../shared/enums";
import type { ClockContext } from "../shared/types";
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

type DemoDomainEvent = {
  eventId: string;
  organizationId: string;
  eventName: string;
  aggregateId: string;
  actorId: string | null;
  payload: Record<string, unknown>;
  createdAt: Date | string;
};

type DemoAttendance = {
  attendanceId: string;
  organizationId: string;
  userId: string;
  date: string;
  clockInAt: Date | string | null;
  clockOutAt: Date | string | null;
  status: AttendanceStatus;
  isLate: boolean;
  workingMinutes: number;
  breakMinutes: number;
  idleMinutes: number;
  focusMinutes: number;
  effectiveMinutes: number;
  overtimeMinutes: number;
  clockInContext: ClockContext | null;
  clockOutContext: ClockContext | null;
  notes: string | null;
};

type DemoBreak = {
  breakId: string;
  organizationId: string;
  attendanceId: string;
  startAt: Date | string;
  endAt: Date | string | null;
  kind: string;
};

type DemoUser = {
  userId: string;
  organizationId: string;
  firstName: string;
  lastName: string | null;
  employeeCode: string | null;
  departmentId: string | null;
  status: string;
  isArchived?: boolean;
  deletedAt: unknown;
};

type DemoDepartment = { departmentId: string; name: string };

function toIso(value: Date | string | null): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function records(): DemoAttendance[] {
  return getDemoStore().attendanceRecords as DemoAttendance[];
}
function breaks(): DemoBreak[] {
  return getDemoStore().attendanceBreaks as DemoBreak[];
}

function metricsOf(r: DemoAttendance): AttendanceMetrics {
  return {
    workingMinutes: r.workingMinutes,
    breakMinutes: r.breakMinutes,
    idleMinutes: r.idleMinutes,
    focusMinutes: r.focusMinutes,
    effectiveMinutes: r.effectiveMinutes,
    overtimeMinutes: r.overtimeMinutes,
  };
}

function breakView(b: DemoBreak): BreakView {
  return {
    breakId: b.breakId,
    startAt: toIso(b.startAt) as string,
    endAt: toIso(b.endAt),
    kind: b.kind,
  };
}

function openBreakOf(attendanceId: string): DemoBreak | null {
  return (
    breaks().find((b) => b.attendanceId === attendanceId && b.endAt == null) ??
    null
  );
}

function toTodayView(r: DemoAttendance): TodayAttendanceView {
  const isOngoing = r.clockOutAt == null;
  const open = isOngoing ? openBreakOf(r.attendanceId) : null;
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
    clockInAt: toIso(r.clockInAt),
    clockOutAt: toIso(r.clockOutAt),
    openBreak: open ? breakView(open) : null,
    metrics: metricsOf(r),
    isOngoing,
    policy: {
      workStartTime: DEFAULT_WORKFORCE_POLICY.workStartTime,
      workEndTime: DEFAULT_WORKFORCE_POLICY.workEndTime,
    },
  };
}

function requireRecord(
  organizationId: string,
  attendanceId: string,
): DemoAttendance {
  const r = records().find(
    (x) => x.attendanceId === attendanceId && x.organizationId === organizationId,
  );
  if (!r) throw new AttendanceError("attendance/not-found", "Attendance record not found.");
  return r;
}

export const mockAttendanceRepository: AttendanceRepository = {
  async findDay(organizationId, userId, date) {
    const r = records().find(
      (x) =>
        x.organizationId === organizationId &&
        x.userId === userId &&
        x.date === date,
    );
    return r ? toTodayView(r) : null;
  },

  async findOpenDay(organizationId, userId) {
    const r = records().find(
      (x) =>
        x.organizationId === organizationId &&
        x.userId === userId &&
        x.clockOutAt == null,
    );
    return r ? toTodayView(r) : null;
  },

  async createDay(organizationId, actorUserId, data: CreateDayData) {
    const store = getDemoStore();
    const record: DemoAttendance = {
      attendanceId: nextDemoId(store),
      organizationId,
      userId: data.userId,
      date: data.date,
      clockInAt: data.clockInAt,
      clockOutAt: null,
      status: data.status,
      isLate: data.isLate,
      workingMinutes: 0,
      breakMinutes: 0,
      idleMinutes: 0,
      focusMinutes: 0,
      effectiveMinutes: 0,
      overtimeMinutes: 0,
      clockInContext: data.clockInContext,
      clockOutContext: null,
      notes: data.wfh ? "WFH" : null,
    };
    store.attendanceRecords.push(record);
    logDemoActivity(
      store,
      "attendance",
      "clock",
      "attendance",
      record.attendanceId,
      `Clocked in (${data.status})`,
      { clockInAt: data.clockInAt, context: data.clockInContext },
    );
    return toTodayView(record);
  },

  async finalizeDay(organizationId, actorUserId, attendanceId, data: FinalizeDayData) {
    const record = requireRecord(organizationId, attendanceId);
    const open = openBreakOf(attendanceId);
    if (open) open.endAt = data.clockOutAt;
    record.clockOutAt = data.clockOutAt;
    record.status = data.status;
    record.isLate = data.isLate;
    record.workingMinutes = data.metrics.workingMinutes;
    record.breakMinutes = data.metrics.breakMinutes;
    record.idleMinutes = data.metrics.idleMinutes;
    record.focusMinutes = data.metrics.focusMinutes;
    record.effectiveMinutes = data.metrics.effectiveMinutes;
    record.overtimeMinutes = data.metrics.overtimeMinutes;
    record.clockOutContext = data.clockOutContext;
    if (data.notes !== undefined) record.notes = data.notes;
    logDemoActivity(
      getDemoStore(),
      "attendance",
      "clock",
      "attendance",
      attendanceId,
      `Clocked out (${data.status})`,
      { clockOutAt: data.clockOutAt, minutes: data.metrics },
    );
    return toTodayView(record);
  },

  async amendDay(organizationId, actorUserId, attendanceId, data: AmendDayData) {
    const record = requireRecord(organizationId, attendanceId);
    record.clockInAt = data.clockInAt;
    record.clockOutAt = data.clockOutAt;
    record.status = data.status;
    record.isLate = data.isLate;
    record.workingMinutes = data.metrics.workingMinutes;
    record.breakMinutes = data.metrics.breakMinutes;
    record.idleMinutes = data.metrics.idleMinutes;
    record.focusMinutes = data.metrics.focusMinutes;
    record.effectiveMinutes = data.metrics.effectiveMinutes;
    record.overtimeMinutes = data.metrics.overtimeMinutes;
    logDemoActivity(
      getDemoStore(),
      "attendance",
      "update",
      "attendance",
      attendanceId,
      `Amended via correction ${data.reason} (${data.status})`,
      { reason: data.reason, minutes: data.metrics },
    );
    return toTodayView(record);
  },

  async addBreak(organizationId, actorUserId, attendanceId, startAt, kind) {
    const store = getDemoStore();
    requireRecord(organizationId, attendanceId);
    const row: DemoBreak = {
      breakId: nextDemoId(store),
      organizationId,
      attendanceId,
      startAt,
      endAt: null,
      kind,
    };
    store.attendanceBreaks.push(row);
    logDemoActivity(
      store,
      "attendance",
      "update",
      "attendance",
      attendanceId,
      "Break started",
    );
    return breakView(row);
  },

  async closeBreak(organizationId, actorUserId, attendanceId, endAt) {
    requireRecord(organizationId, attendanceId);
    const open = openBreakOf(attendanceId);
    if (!open) {
      throw new AttendanceError(
        "attendance/not-on-break",
        "There is no open break to end.",
      );
    }
    open.endAt = endAt;
    logDemoActivity(
      getDemoStore(),
      "attendance",
      "update",
      "attendance",
      attendanceId,
      "Break ended",
    );
    return breakView(open);
  },

  async list(organizationId, filters: AttendanceDirectoryFilters) {
    const store = getDemoStore();
    const usersById = new Map(
      (store.users as DemoUser[])
        .filter((u) => u.organizationId === organizationId)
        .map((u) => [u.userId, u]),
    );
    const departmentsById = new Map(
      (store.departments as DemoDepartment[]).map((d) => [d.departmentId, d]),
    );

    let rows = records().filter((r) => r.organizationId === organizationId);
    if (filters.date) rows = rows.filter((r) => r.date === filters.date);
    if (filters.userId) rows = rows.filter((r) => r.userId === filters.userId);
    if (filters.status) rows = rows.filter((r) => r.status === filters.status);
    if (filters.departmentId) {
      rows = rows.filter(
        (r) => usersById.get(r.userId)?.departmentId === filters.departmentId,
      );
    }

    const mapped: AttendanceDirectoryRow[] = rows
      .map((r) => {
        const user = usersById.get(r.userId);
        const department = user?.departmentId
          ? departmentsById.get(user.departmentId)
          : undefined;
        const name = user
          ? [user.firstName, user.lastName].filter(Boolean).join(" ")
          : "Unknown";
        return {
          attendanceId: r.attendanceId,
          userId: r.userId,
          employeeName: name,
          employeeCode: user?.employeeCode ?? null,
          departmentId: user?.departmentId ?? null,
          departmentName: department?.name ?? null,
          date: r.date,
          status: r.status,
          isLate: r.isLate,
          clockInAt: toIso(r.clockInAt),
          clockOutAt: toIso(r.clockOutAt),
          metrics: metricsOf(r),
          isArchived: user?.isArchived === true || user?.status === "archived",
        };
      })
      .sort((a, b) =>
        b.date.localeCompare(a.date) ||
        a.employeeName.localeCompare(b.employeeName),
      );

    const total = mapped.length;
    const start = (filters.page - 1) * filters.pageSize;
    return { rows: mapped.slice(start, start + filters.pageSize), total };
  },

  async findById(organizationId, attendanceId): Promise<AttendanceDetail | null> {
    const r = records().find(
      (x) =>
        x.attendanceId === attendanceId && x.organizationId === organizationId,
    );
    if (!r) return null;
    const store = getDemoStore();
    const user = (store.users as DemoUser[]).find((u) => u.userId === r.userId);
    const department = user?.departmentId
      ? (store.departments as DemoDepartment[]).find(
          (d) => d.departmentId === user.departmentId,
        )
      : undefined;
    const dayBreaks = breaks()
      .filter((b) => b.attendanceId === attendanceId)
      .sort((a, b) => (toIso(a.startAt) ?? "").localeCompare(toIso(b.startAt) ?? ""))
      .map(breakView);
    return {
      attendanceId: r.attendanceId,
      userId: r.userId,
      employeeName: user
        ? [user.firstName, user.lastName].filter(Boolean).join(" ")
        : "Unknown",
      employeeCode: user?.employeeCode ?? null,
      departmentId: user?.departmentId ?? null,
      departmentName: department?.name ?? null,
      date: r.date,
      status: r.status,
      isLate: r.isLate,
      clockInAt: toIso(r.clockInAt),
      clockOutAt: toIso(r.clockOutAt),
      metrics: metricsOf(r),
      isArchived: user?.isArchived === true || user?.status === "archived",
      breaks: dayBreaks,
      clockInContext: r.clockInContext,
      clockOutContext: r.clockOutContext,
      notes: r.notes,
    };
  },

  async listTimeline(
    organizationId,
    attendanceId,
  ): Promise<AttendanceTimelineEntry[]> {
    const events = getDemoStore().domainEvents as DemoDomainEvent[];
    return events
      .filter(
        (e) =>
          e.organizationId === organizationId && e.aggregateId === attendanceId,
      )
      .map((e) => ({
        eventId: e.eventId,
        eventName: e.eventName,
        at: toIso(e.createdAt) as string,
        actorId: e.actorId ?? null,
        payload: e.payload ?? {},
      }))
      .sort((a, b) => a.at.localeCompare(b.at));
  },
};
