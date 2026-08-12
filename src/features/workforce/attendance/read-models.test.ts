/**
 * Sprint 4B — read-model projections (dashboard + report). Pure aggregations
 * over engine-produced AttendanceMetrics; asserts they only sum/average and
 * never fabricate ratios (policy 10.9).
 */
import { describe, expect, it } from "vitest";
import type { AttendanceDirectoryRow, AttendanceMetrics } from "./types";
import { projectDashboardMetrics, projectMonthlyReport } from "./read-models";

function metrics(
  effective: number,
  extra: Partial<AttendanceMetrics> = {},
): AttendanceMetrics {
  return {
    workingMinutes: effective,
    breakMinutes: 0,
    idleMinutes: 0,
    focusMinutes: 0,
    effectiveMinutes: effective,
    overtimeMinutes: 0,
    ...extra,
  };
}

function row(p: Partial<AttendanceDirectoryRow>): AttendanceDirectoryRow {
  return {
    attendanceId: "a1",
    userId: "u1",
    employeeName: "Emp",
    employeeCode: null,
    departmentId: "d1",
    departmentName: "Eng",
    date: "2026-07-10",
    status: "PRESENT",
    isLate: false,
    clockInAt: "2026-07-10T09:00:00.000Z",
    clockOutAt: "2026-07-10T17:00:00.000Z",
    metrics: metrics(420),
    isArchived: false,
    isOnBreak: false,
    ...p,
  };
}

describe("projectDashboardMetrics", () => {
  it("counts present/late/completed and averages effective over completed rows", () => {
    const rows = [
      row({ attendanceId: "a1", status: "PRESENT", metrics: metrics(400) }),
      row({
        attendanceId: "a2",
        status: "LATE",
        isLate: true,
        metrics: metrics(500),
      }),
      row({ attendanceId: "a3", status: "WORKING", clockOutAt: null }), // still working
    ];
    const dash = projectDashboardMetrics(rows, {
      date: "2026-07-10",
      pendingReviewCount: 2,
    });
    expect(dash.headcount).toBe(3);
    expect(dash.present).toBe(2); // PRESENT + LATE
    expect(dash.late).toBe(1);
    expect(dash.completed).toBe(2);
    expect(dash.stillWorking).toBe(1);
    expect(dash.totalEffectiveMinutes).toBe(900);
    expect(dash.avgEffectiveMinutes).toBe(450); // over completed only
    expect(dash.pendingReviewCount).toBe(2);
  });

  it("avoids divide-by-zero when nothing is completed", () => {
    const dash = projectDashboardMetrics(
      [row({ status: "WORKING", clockOutAt: null })],
      { date: "2026-07-10" },
    );
    expect(dash.avgEffectiveMinutes).toBe(0);
    expect(dash.pendingReviewCount).toBe(0);
  });
});

describe("projectMonthlyReport", () => {
  it("aggregates by day and department with reconciling totals", () => {
    const rows = [
      row({
        date: "2026-07-10",
        departmentId: "d1",
        departmentName: "Eng",
        metrics: metrics(420),
      }),
      row({
        date: "2026-07-10",
        departmentId: "d2",
        departmentName: "Sales",
        isLate: true,
        metrics: metrics(300),
      }),
      row({
        date: "2026-07-11",
        departmentId: "d1",
        departmentName: "Eng",
        metrics: metrics(480),
      }),
    ];
    const report = projectMonthlyReport(rows, {
      from: "2026-07-01",
      to: "2026-07-31",
    });

    expect(report.totals.recordCount).toBe(3);
    expect(report.totals.lateCount).toBe(1);
    expect(report.totals.metrics.effectiveMinutes).toBe(1200);

    // Daily rows sum back to the totals.
    const dailyEffective = report.daily.reduce(
      (s, d) => s + d.metrics.effectiveMinutes,
      0,
    );
    expect(dailyEffective).toBe(report.totals.metrics.effectiveMinutes);
    expect(report.daily.map((d) => d.date)).toEqual([
      "2026-07-10",
      "2026-07-11",
    ]);

    // Department rows sum back too.
    const deptEffective = report.departments.reduce(
      (s, d) => s + d.metrics.effectiveMinutes,
      0,
    );
    expect(deptEffective).toBe(report.totals.metrics.effectiveMinutes);
    const eng = report.departments.find((d) => d.departmentId === "d1")!;
    expect(eng.recordCount).toBe(2);
    expect(eng.avgEffectiveMinutes).toBe(450); // (420+480)/2
  });
});
