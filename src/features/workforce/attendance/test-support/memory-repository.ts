/**
 * An in-memory `AttendanceRepository` for exercising the action pipeline.
 *
 * Test support only — nothing in the application imports it. It exists so the
 * clock lifecycle can be driven end-to-end without a database and without the
 * shared DemoStore singleton, whose state leaks between specs. It stores rows,
 * it does not decide anything: every rule under test (which day a command
 * belongs to, whether a transition is legal, what the metrics are) stays in the
 * pipeline and the engine, where production has it.
 */
import { AttendanceError, type AttendanceRepository } from "../repository";
import type { AttendanceStatus } from "../../shared/enums";
import { DEFAULT_WORKFORCE_POLICY } from "../../shared/types";
import type {
  AttendanceDirectoryRow,
  AttendanceMetrics,
  AttendanceState,
  BreakView,
  TodayAttendanceView,
} from "../types";
import type { ClockContext } from "../../shared/types";

interface Row {
  attendanceId: string;
  organizationId: string;
  userId: string;
  date: string;
  clockInAt: string | null;
  clockOutAt: string | null;
  status: AttendanceStatus;
  isLate: boolean;
  metrics: AttendanceMetrics;
  notes: string | null;
  clockInContext: ClockContext | null;
  clockOutContext: ClockContext | null;
}

interface Break extends BreakView {
  attendanceId: string;
  organizationId: string;
}

function zeroMetrics(): AttendanceMetrics {
  return {
    workingMinutes: 0,
    breakMinutes: 0,
    idleMinutes: 0,
    focusMinutes: 0,
    effectiveMinutes: 0,
    overtimeMinutes: 0,
  };
}

export function createMemoryAttendanceRepository(): AttendanceRepository & {
  rows: Row[];
  breaks: Break[];
} {
  const rows: Row[] = [];
  const breaks: Break[] = [];
  let nextId = 1;

  const openBreakOf = (attendanceId: string): Break | null =>
    breaks.find((b) => b.attendanceId === attendanceId && b.endAt === null) ??
    null;

  const toView = (row: Row): TodayAttendanceView => {
    const isOngoing = row.clockOutAt === null;
    const open = isOngoing ? openBreakOf(row.attendanceId) : null;
    const state: AttendanceState = !isOngoing
      ? "COMPLETED"
      : open
        ? "ON_BREAK"
        : "WORKING";
    return {
      state,
      attendanceId: row.attendanceId,
      date: row.date,
      status: row.status,
      isLate: row.isLate,
      clockInAt: row.clockInAt,
      clockOutAt: row.clockOutAt,
      openBreak: open,
      metrics: row.metrics,
      isOngoing,
      policy: {
        workStartTime: DEFAULT_WORKFORCE_POLICY.workStartTime,
        workEndTime: DEFAULT_WORKFORCE_POLICY.workEndTime,
      },
    };
  };

  const toDirectoryRow = (row: Row): AttendanceDirectoryRow => ({
    attendanceId: row.attendanceId,
    userId: row.userId,
    employeeName: "Test Employee",
    employeeCode: null,
    departmentId: null,
    departmentName: null,
    date: row.date,
    status: row.status,
    isLate: row.isLate,
    clockInAt: row.clockInAt,
    clockOutAt: row.clockOutAt,
    metrics: row.metrics,
    isArchived: false,
    isOnBreak: openBreakOf(row.attendanceId) !== null,
  });

  const require = (organizationId: string, attendanceId: string): Row => {
    const row = rows.find(
      (r) =>
        r.attendanceId === attendanceId && r.organizationId === organizationId,
    );
    if (!row) {
      throw new AttendanceError(
        "attendance/not-found",
        "Attendance record not found.",
      );
    }
    return row;
  };

  return {
    rows,
    breaks,

    async findDay(organizationId, userId, date) {
      const row = rows.find(
        (r) =>
          r.organizationId === organizationId &&
          r.userId === userId &&
          r.date === date,
      );
      return row ? toView(row) : null;
    },

    async findOpenDay(organizationId, userId) {
      const row = rows.find(
        (r) =>
          r.organizationId === organizationId &&
          r.userId === userId &&
          r.clockOutAt === null,
      );
      return row ? toView(row) : null;
    },

    async createDay(organizationId, _actorUserId, data) {
      const row: Row = {
        attendanceId: `att-${nextId++}`,
        organizationId,
        userId: data.userId,
        date: data.date,
        clockInAt: data.clockInAt,
        clockOutAt: null,
        status: data.status,
        isLate: data.isLate,
        metrics: zeroMetrics(),
        notes: data.wfh ? "WFH" : null,
        clockInContext: data.clockInContext,
        clockOutContext: null,
      };
      rows.push(row);
      return toView(row);
    },

    async finalizeDay(organizationId, _actorUserId, attendanceId, data) {
      const row = require(organizationId, attendanceId);
      const open = openBreakOf(attendanceId);
      if (open) open.endAt = data.clockOutAt;
      row.clockOutAt = data.clockOutAt;
      row.status = data.status;
      row.isLate = data.isLate;
      row.metrics = data.metrics;
      row.clockOutContext = data.clockOutContext;
      row.notes = data.notes ?? row.notes;
      return toView(row);
    },

    async amendDay(organizationId, _actorUserId, attendanceId, data) {
      const row = require(organizationId, attendanceId);
      row.clockInAt = data.clockInAt;
      row.clockOutAt = data.clockOutAt;
      row.status = data.status;
      row.isLate = data.isLate;
      row.metrics = data.metrics;
      return toView(row);
    },

    async addBreak(organizationId, _actorUserId, attendanceId, startAt, kind) {
      const entry: Break = {
        breakId: `brk-${nextId++}`,
        attendanceId,
        organizationId,
        startAt,
        endAt: null,
        kind,
      };
      breaks.push(entry);
      return entry;
    },

    async closeBreak(_organizationId, _actorUserId, attendanceId, endAt) {
      const open = openBreakOf(attendanceId);
      if (!open) {
        throw new AttendanceError(
          "attendance/not-on-break",
          "There is no open break to end.",
        );
      }
      open.endAt = endAt;
      return open;
    },

    async list(organizationId, filters) {
      const matched = rows.filter(
        (r) =>
          r.organizationId === organizationId &&
          (!filters.date || r.date === filters.date) &&
          (!filters.userId || r.userId === filters.userId) &&
          (!filters.status || r.status === filters.status),
      );
      const start = (filters.page - 1) * filters.pageSize;
      return {
        rows: matched
          .slice(start, start + filters.pageSize)
          .map(toDirectoryRow),
        total: matched.length,
      };
    },

    async listRange(organizationId, userId, range) {
      return rows
        .filter(
          (r) =>
            r.organizationId === organizationId &&
            r.userId === userId &&
            r.date >= range.from &&
            r.date <= range.to,
        )
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((r) => ({
          attendanceId: r.attendanceId,
          date: r.date,
          status: r.status,
          isLate: r.isLate,
          clockInAt: r.clockInAt,
          clockOutAt: r.clockOutAt,
          metrics: r.metrics,
          wasCorrected: false,
          isDerived: false,
        }));
    },

    async findById(organizationId, attendanceId) {
      const row = rows.find(
        (r) =>
          r.attendanceId === attendanceId &&
          r.organizationId === organizationId,
      );
      if (!row) return null;
      return {
        ...toDirectoryRow(row),
        breaks: breaks
          .filter((b) => b.attendanceId === attendanceId)
          .map(({ breakId, startAt, endAt, kind }) => ({
            breakId,
            startAt,
            endAt,
            kind,
          })),
        clockInContext: row.clockInContext,
        clockOutContext: row.clockOutContext,
        notes: row.notes,
      };
    },

    async listTimeline() {
      return [];
    },
  };
}
