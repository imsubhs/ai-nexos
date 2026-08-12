/**
 * A-6 / T-1 projections. Both are pure, so the interesting cases are the ones
 * that decide whether the product *lies*: an absence invented on a day nobody
 * was expected to work, an average diluted by days with no session, a KPI that
 * changes when the user turns the page.
 */
import { describe, expect, it } from "vitest";
import type { AttendanceStatus } from "../shared/enums";
import { DEFAULT_WORKFORCE_POLICY } from "../shared/types";
import {
  deriveHistoryRows,
  projectAttendanceSummary,
  projectTeamKpis,
} from "./read-models";
import type {
  AttendanceDirectoryRow,
  AttendanceHistoryRow,
  AttendanceMetrics,
} from "./types";

function metrics(p: Partial<AttendanceMetrics> = {}): AttendanceMetrics {
  return {
    workingMinutes: 0,
    breakMinutes: 0,
    idleMinutes: 0,
    focusMinutes: 0,
    effectiveMinutes: 0,
    overtimeMinutes: 0,
    ...p,
  };
}

function stored(
  date: string,
  p: Partial<AttendanceHistoryRow> = {},
): AttendanceHistoryRow {
  return {
    attendanceId: `att-${date}`,
    date,
    status: "PRESENT",
    isLate: false,
    clockInAt: `${date}T09:00:00.000Z`,
    clockOutAt: `${date}T17:00:00.000Z`,
    metrics: metrics({ workingMinutes: 480, effectiveMinutes: 480 }),
    wasCorrected: false,
    isDerived: false,
    ...p,
  };
}

function teamRow(
  p: Partial<AttendanceDirectoryRow> = {},
): AttendanceDirectoryRow {
  return {
    attendanceId: "a1",
    userId: "u1",
    employeeName: "Emp",
    employeeCode: null,
    departmentId: null,
    departmentName: null,
    date: "2026-08-12",
    status: "PRESENT",
    isLate: false,
    clockInAt: "2026-08-12T09:00:00.000Z",
    clockOutAt: "2026-08-12T17:00:00.000Z",
    metrics: metrics({ effectiveMinutes: 400 }),
    isArchived: false,
    isOnBreak: false,
    ...p,
  };
}

// 2026-08-10 Mon … 2026-08-16 Sun. Mon–Fri are the default working days.
const MONDAY = "2026-08-10";
const FRIDAY = "2026-08-14";
const SATURDAY = "2026-08-15";
const SUNDAY = "2026-08-16";

describe("deriveHistoryRows", () => {
  it("derives ABSENT only on working days that are past and have no record", () => {
    const rows = deriveHistoryRows([stored(MONDAY)], {
      from: MONDAY,
      to: SUNDAY,
      today: "2026-08-17",
      policy: DEFAULT_WORKFORCE_POLICY,
    });

    const byDate = new Map(rows.map((r) => [r.date, r]));
    expect(byDate.get(MONDAY)?.status).toBe("PRESENT");
    expect(byDate.get(MONDAY)?.isDerived).toBe(false);
    // Tue–Fri are working days with no record.
    for (const d of ["2026-08-11", "2026-08-12", "2026-08-13", FRIDAY]) {
      expect(byDate.get(d)?.status).toBe("ABSENT");
      expect(byDate.get(d)?.isDerived).toBe(true);
    }
    // The weekend is not an absence, so it produces no row at all.
    expect(byDate.has(SATURDAY)).toBe(false);
    expect(byDate.has(SUNDAY)).toBe(false);
  });

  it("never derives an absence for today or the future", () => {
    const rows = deriveHistoryRows([], {
      from: MONDAY,
      to: FRIDAY,
      today: "2026-08-12", // Wednesday
      policy: DEFAULT_WORKFORCE_POLICY,
    });
    // Mon + Tue only; Wed is today and Thu/Fri have not happened.
    expect(rows.map((r) => r.date)).toEqual(["2026-08-11", MONDAY]);
  });

  it("lets a stored row win even on a non-working day", () => {
    const rows = deriveHistoryRows([stored(SATURDAY)], {
      from: SATURDAY,
      to: SATURDAY,
      today: "2026-08-17",
      policy: DEFAULT_WORKFORCE_POLICY,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].isDerived).toBe(false);
  });

  it("never fabricates minutes on a derived row", () => {
    const [derived] = deriveHistoryRows([], {
      from: MONDAY,
      to: MONDAY,
      today: "2026-08-17",
      policy: DEFAULT_WORKFORCE_POLICY,
    });
    expect(derived.attendanceId).toBeNull();
    expect(derived.clockInAt).toBeNull();
    expect(derived.metrics).toEqual(metrics());
  });

  it("returns newest first", () => {
    const rows = deriveHistoryRows([stored(MONDAY), stored(FRIDAY)], {
      from: MONDAY,
      to: FRIDAY,
      today: "2026-08-17",
      policy: DEFAULT_WORKFORCE_POLICY,
    });
    const dates = rows.map((r) => r.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("honours a policy with a different working week", () => {
    const rows = deriveHistoryRows([], {
      from: SATURDAY,
      to: SUNDAY,
      today: "2026-08-17",
      // Sun–Thu week: Saturday is off, Sunday is a working day.
      policy: { workingDays: [7, 1, 2, 3, 4] },
    });
    expect(rows.map((r) => r.date)).toEqual([SUNDAY]);
  });
});

describe("projectAttendanceSummary", () => {
  it("counts each status bucket and reconciles totalDays", () => {
    const rows: AttendanceHistoryRow[] = [
      stored(MONDAY, { status: "PRESENT" }),
      stored("2026-08-11", { status: "LATE", isLate: true }),
      stored("2026-08-12", { status: "WFH" }),
      stored("2026-08-13", {
        status: "HALF_DAY",
        metrics: metrics({ workingMinutes: 240 }),
      }),
      {
        ...stored(FRIDAY),
        status: "ABSENT",
        isDerived: true,
        attendanceId: null,
        clockInAt: null,
        clockOutAt: null,
        metrics: metrics(),
      },
    ];
    const s = projectAttendanceSummary(rows);

    expect(s.totalDays).toBe(5);
    expect(s.presentDays).toBe(4);
    expect(s.absentDays).toBe(1);
    expect(s.lateDays).toBe(1);
    expect(s.wfhDays).toBe(1);
    expect(s.halfDays).toBe(1);
    expect(s.attendancePercentage).toBe(80);
    // Reserved until a leave module exists — present in the shape, never guessed.
    expect(s.leaveDays).toBe(0);
    expect(s.holidayDays).toBe(0);
  });

  it("averages session hours over present days, not over absences", () => {
    const rows = [
      stored(MONDAY, {
        metrics: metrics({ workingMinutes: 480 }),
      }),
      {
        ...stored("2026-08-11"),
        status: "ABSENT" as AttendanceStatus,
        metrics: metrics(),
      },
    ];
    const s = projectAttendanceSummary(rows);
    expect(s.totalWorkingMinutes).toBe(480);
    // 8h over the one present day — not 4h over both days.
    expect(s.avgWorkingHours).toBe(8);
  });

  it("counts an open WORKING day as present", () => {
    const s = projectAttendanceSummary([
      stored(MONDAY, { status: "WORKING", clockOutAt: null }),
    ]);
    expect(s.presentDays).toBe(1);
    expect(s.attendancePercentage).toBe(100);
  });

  it("returns zeros rather than NaN for an empty range", () => {
    const s = projectAttendanceSummary([]);
    expect(s.totalDays).toBe(0);
    expect(s.attendancePercentage).toBe(0);
    expect(s.avgWorkingHours).toBe(0);
  });
});

describe("projectTeamKpis", () => {
  it("derives absent from the active headcount, not from the rows", () => {
    const kpis = projectTeamKpis(
      [
        teamRow({ userId: "u1" }),
        teamRow({ userId: "u2", attendanceId: "a2" }),
      ],
      { activeMemberCount: 5 },
    );
    expect(kpis.present).toBe(2);
    expect(kpis.absent).toBe(3);
  });

  it("counts on-break from the derived break state", () => {
    const kpis = projectTeamKpis(
      [
        teamRow({ status: "WORKING", clockOutAt: null, isOnBreak: true }),
        teamRow({ status: "WORKING", clockOutAt: null, isOnBreak: false }),
      ],
      { activeMemberCount: 2 },
    );
    expect(kpis.onBreak).toBe(1);
  });

  it("averages effective minutes over completed rows only", () => {
    const kpis = projectTeamKpis(
      [
        teamRow({ metrics: metrics({ effectiveMinutes: 400 }) }),
        teamRow({ metrics: metrics({ effectiveMinutes: 500 }) }),
        // Open session — its effective time is still ticking.
        teamRow({
          clockOutAt: null,
          status: "WORKING",
          metrics: metrics({ effectiveMinutes: 30 }),
        }),
      ],
      { activeMemberCount: 3 },
    );
    expect(kpis.avgEffectiveMinutes).toBe(450);
  });

  it("clamps absent at zero when more rows exist than active members", () => {
    // An employee archived mid-day still has a row; the count must not go negative.
    const kpis = projectTeamKpis([teamRow(), teamRow({ attendanceId: "a2" })], {
      activeMemberCount: 1,
    });
    expect(kpis.absent).toBe(0);
  });

  it("reports an empty day without dividing by zero", () => {
    const kpis = projectTeamKpis([], { activeMemberCount: 4 });
    expect(kpis).toEqual({
      present: 0,
      absent: 4,
      late: 0,
      onBreak: 0,
      avgEffectiveMinutes: 0,
    });
  });
});
