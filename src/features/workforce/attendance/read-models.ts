/**
 * Attendance read-model projections (Sprint 4B, doc 14 §12.7).
 *
 * PURE, query-time aggregations over AttendanceDay rows whose per-day minutes
 * were produced by the FROZEN Work Validation engine (doc 14 §6). These
 * projections NEVER store counters and NEVER recompute interval math — they
 * only sum/average the engine's already-validated `AttendanceMetrics`, so the
 * Work Validation vocabulary (Session/Effective/Break/Idle/Focus) is the single
 * source of truth on every downstream surface (dashboard, reports).
 *
 * Charts/analytics are explicitly OUT of scope — these return plain data
 * structures for a caller to render; they do not import the analytics engines.
 */
import type { AttendanceStatus } from "../shared/enums";
import type { AttendanceDirectoryRow, AttendanceMetrics } from "./types";

/** Zeroed metric accumulator. */
function emptyMetrics(): AttendanceMetrics {
  return {
    workingMinutes: 0,
    breakMinutes: 0,
    idleMinutes: 0,
    focusMinutes: 0,
    effectiveMinutes: 0,
    overtimeMinutes: 0,
  };
}

function addMetrics(a: AttendanceMetrics, b: AttendanceMetrics): AttendanceMetrics {
  return {
    workingMinutes: a.workingMinutes + b.workingMinutes,
    breakMinutes: a.breakMinutes + b.breakMinutes,
    idleMinutes: a.idleMinutes + b.idleMinutes,
    focusMinutes: a.focusMinutes + b.focusMinutes,
    effectiveMinutes: a.effectiveMinutes + b.effectiveMinutes,
    overtimeMinutes: a.overtimeMinutes + b.overtimeMinutes,
  };
}

function roundAvg(total: number, count: number): number {
  return count > 0 ? Math.round(total / count) : 0;
}

// ── Dashboard metric projection (R-3) ───────────────────────────────────────

/** Workforce dashboard KPIs for a single day (doc 16 S-8/S-9). */
export interface WorkforceDashboardMetrics {
  date: string;
  /** Rows present in the directory for the day (clocked in at some point). */
  headcount: number;
  present: number;
  late: number;
  completed: number;
  stillWorking: number;
  /** Sum/avg of the engine's Effective Work Time across the day's rows. */
  totalEffectiveMinutes: number;
  avgEffectiveMinutes: number;
  totalIdleMinutes: number;
  avgFocusMinutes: number;
  /** Open corrections awaiting review (passed in — corrections slice owns it). */
  pendingReviewCount: number;
}

const PRESENT_STATUSES: ReadonlySet<AttendanceStatus> = new Set<AttendanceStatus>([
  "PRESENT",
  "LATE",
  "WFH",
  "HALF_DAY",
]);

/**
 * Project a day's directory rows into dashboard KPIs. `avgEffective` is taken
 * over COMPLETED rows only (an open day's effective time is still ticking), so
 * the average is not diluted by in-progress sessions (policy 10.9 — no
 * fabricated ratios).
 */
export function projectDashboardMetrics(
  rows: AttendanceDirectoryRow[],
  opts: { date: string; pendingReviewCount?: number },
): WorkforceDashboardMetrics {
  let present = 0;
  let late = 0;
  let completed = 0;
  let stillWorking = 0;
  let totalEffective = 0;
  let totalIdle = 0;
  let totalFocus = 0;

  for (const r of rows) {
    if (PRESENT_STATUSES.has(r.status)) present += 1;
    if (r.isLate) late += 1;
    if (r.clockOutAt) {
      completed += 1;
      totalEffective += r.metrics.effectiveMinutes;
    } else if (r.clockInAt) {
      stillWorking += 1;
    }
    totalIdle += r.metrics.idleMinutes;
    totalFocus += r.metrics.focusMinutes;
  }

  return {
    date: opts.date,
    headcount: rows.length,
    present,
    late,
    completed,
    stillWorking,
    totalEffectiveMinutes: totalEffective,
    avgEffectiveMinutes: roundAvg(totalEffective, completed),
    totalIdleMinutes: totalIdle,
    avgFocusMinutes: roundAvg(totalFocus, rows.length),
    pendingReviewCount: opts.pendingReviewCount ?? 0,
  };
}

// ── Report projection (R-1) ─────────────────────────────────────────────────

export interface ReportDailyRow {
  date: string;
  recordCount: number;
  presentCount: number;
  lateCount: number;
  metrics: AttendanceMetrics;
}

export interface ReportDepartmentRow {
  departmentId: string | null;
  departmentName: string | null;
  recordCount: number;
  lateCount: number;
  metrics: AttendanceMetrics;
  avgEffectiveMinutes: number;
}

export interface WorkforceReport {
  from: string;
  to: string;
  totals: {
    recordCount: number;
    presentCount: number;
    lateCount: number;
    metrics: AttendanceMetrics;
    avgEffectiveMinutes: number;
  };
  daily: ReportDailyRow[];
  departments: ReportDepartmentRow[];
}

/**
 * Project directory rows into a monthly report: per-day rows, per-department
 * aggregates, and grand totals — all query-time from the engine's metrics
 * (doc 14 §12.7; counters never stored). Sorted by date asc / department name.
 */
export function projectMonthlyReport(
  rows: AttendanceDirectoryRow[],
  range: { from: string; to: string },
): WorkforceReport {
  const byDate = new Map<string, ReportDailyRow>();
  const byDept = new Map<string, ReportDepartmentRow>();
  let totalMetrics = emptyMetrics();
  let presentCount = 0;
  let lateCount = 0;

  for (const r of rows) {
    const isPresent = PRESENT_STATUSES.has(r.status);
    if (isPresent) presentCount += 1;
    if (r.isLate) lateCount += 1;
    totalMetrics = addMetrics(totalMetrics, r.metrics);

    const day = byDate.get(r.date) ?? {
      date: r.date,
      recordCount: 0,
      presentCount: 0,
      lateCount: 0,
      metrics: emptyMetrics(),
    };
    day.recordCount += 1;
    if (isPresent) day.presentCount += 1;
    if (r.isLate) day.lateCount += 1;
    day.metrics = addMetrics(day.metrics, r.metrics);
    byDate.set(r.date, day);

    const key = r.departmentId ?? "__none__";
    const dept = byDept.get(key) ?? {
      departmentId: r.departmentId,
      departmentName: r.departmentName,
      recordCount: 0,
      lateCount: 0,
      metrics: emptyMetrics(),
      avgEffectiveMinutes: 0,
    };
    dept.recordCount += 1;
    if (r.isLate) dept.lateCount += 1;
    dept.metrics = addMetrics(dept.metrics, r.metrics);
    byDept.set(key, dept);
  }

  const departments = [...byDept.values()]
    .map((d) => ({
      ...d,
      avgEffectiveMinutes: roundAvg(d.metrics.effectiveMinutes, d.recordCount),
    }))
    .sort((a, b) =>
      (a.departmentName ?? "~").localeCompare(b.departmentName ?? "~"),
    );

  const daily = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));

  return {
    from: range.from,
    to: range.to,
    totals: {
      recordCount: rows.length,
      presentCount,
      lateCount,
      metrics: totalMetrics,
      avgEffectiveMinutes: roundAvg(totalMetrics.effectiveMinutes, rows.length),
    },
    daily,
    departments,
  };
}
