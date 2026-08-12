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
import type { WorkforcePolicy } from "../shared/types";
import type {
  AttendanceDirectoryRow,
  AttendanceHistoryRow,
  AttendanceMetrics,
  AttendanceSummary,
  TeamAttendanceKpis,
} from "./types";

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

function addMetrics(
  a: AttendanceMetrics,
  b: AttendanceMetrics,
): AttendanceMetrics {
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

/**
 * Statuses that count as attendance. WORKING is excluded here and added
 * explicitly by the callers that want in-progress days counted, because the
 * dashboard's `present` deliberately means "finished or finishing a real day"
 * while history's `presentDays` includes today's open session.
 */
const PRESENT_STATUSES: ReadonlySet<AttendanceStatus> =
  new Set<AttendanceStatus>(["PRESENT", "LATE", "WFH", "HALF_DAY"]);

// ── History projections (A-6, doc 14 §12.3 / §12.4) ─────────────────────────

/** ISO date arithmetic that never touches the local timezone. */
function addDays(isoDate: string, days: number): string {
  const ms = Date.parse(`${isoDate}T00:00:00.000Z`) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** ISO weekday, 1 (Mon) – 7 (Sun), matching `WorkforcePolicy.workingDays`. */
function isoWeekday(isoDate: string): number {
  const day = new Date(`${isoDate}T00:00:00.000Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

/**
 * Fills the gaps in a stored history range with read-time ABSENT days
 * (doc 14 §8.1 / policy 10.7).
 *
 * Three rules decide whether a gap becomes an ABSENT row, and each exists to
 * avoid inventing an absence that never happened:
 *
 *  · Only policy working days. A Sunday with no record is not an absence.
 *  · Only days strictly before `today`. Today has not finished — a colleague
 *    who has not clocked in yet at 09:05 is not absent — and tomorrow has not
 *    happened at all.
 *  · Never where a record exists, whatever its status. A stored row always wins.
 *
 * Derived rows carry a null attendanceId and `isDerived: true` so no caller can
 * mistake them for something it can open, amend, or build a timeline from.
 * Returned newest-first, the order both the table and the month grid read in.
 */
export function deriveHistoryRows(
  stored: AttendanceHistoryRow[],
  opts: {
    from: string;
    to: string;
    /** ISO date of "now" — injected, never read from the clock (test parity). */
    today: string;
    policy: Pick<WorkforcePolicy, "workingDays">;
  },
): AttendanceHistoryRow[] {
  const byDate = new Map(stored.map((r) => [r.date, r]));
  const workingDays = new Set(opts.policy.workingDays);
  const rows: AttendanceHistoryRow[] = [];

  for (let date = opts.from; date <= opts.to; date = addDays(date, 1)) {
    const existing = byDate.get(date);
    if (existing) {
      rows.push(existing);
      continue;
    }
    if (date >= opts.today) continue;
    if (!workingDays.has(isoWeekday(date))) continue;
    rows.push({
      attendanceId: null,
      date,
      status: "ABSENT",
      isLate: false,
      clockInAt: null,
      clockOutAt: null,
      metrics: emptyMetrics(),
      wasCorrected: false,
      isDerived: true,
    });
  }

  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Projects history rows into the doc 14 §12.4 summary.
 *
 * `avgWorkingHours` divides by present days rather than by total days: dividing
 * session time by a denominator that includes absences reports a shorter
 * average working day than anyone actually worked.
 */
export function projectAttendanceSummary(
  rows: AttendanceHistoryRow[],
): AttendanceSummary {
  let presentDays = 0;
  let absentDays = 0;
  let lateDays = 0;
  let wfhDays = 0;
  let halfDays = 0;
  let leaveDays = 0;
  let holidayDays = 0;
  let totalWorkingMinutes = 0;
  let totalOvertimeMinutes = 0;

  for (const r of rows) {
    if (PRESENT_STATUSES.has(r.status) || r.status === "WORKING")
      presentDays += 1;
    if (r.status === "ABSENT") absentDays += 1;
    if (r.status === "WFH") wfhDays += 1;
    if (r.status === "HALF_DAY") halfDays += 1;
    if (r.status === "LEAVE") leaveDays += 1;
    if (r.status === "HOLIDAY") holidayDays += 1;
    if (r.isLate) lateDays += 1;
    totalWorkingMinutes += r.metrics.workingMinutes;
    totalOvertimeMinutes += r.metrics.overtimeMinutes;
  }

  const totalDays = rows.length;
  return {
    totalDays,
    presentDays,
    absentDays,
    lateDays,
    wfhDays,
    halfDays,
    leaveDays,
    holidayDays,
    totalWorkingMinutes,
    totalOvertimeMinutes,
    attendancePercentage:
      totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
    avgWorkingHours:
      presentDays > 0
        ? Math.round((totalWorkingMinutes / 60 / presentDays) * 10) / 10
        : 0,
  };
}

/** One cell of the history month grid. */
export interface HistoryGridDay {
  date: string;
  /** False for the padding days that complete the first and last weeks. */
  inMonth: boolean;
  isToday: boolean;
  /** Null on a padding day, or on an in-month day with nothing to show. */
  row: AttendanceHistoryRow | null;
}

/**
 * Lays history rows out as Monday-first weeks for the calendar view.
 *
 * Table and grid are two renderings of ONE dataset — the same `rows` the table
 * receives — so the two views can never disagree about a day. Nothing is
 * recomputed here; days are only placed.
 */
export function buildHistoryMonthGrid(
  rows: AttendanceHistoryRow[],
  opts: { month: string; today: string },
): HistoryGridDay[][] {
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const [year, mon] = opts.month.split("-").map(Number);
  const first = `${opts.month}-01`;
  const lastDay = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const last = `${opts.month}-${String(lastDay).padStart(2, "0")}`;

  const gridFrom = addDays(first, -(isoWeekday(first) - 1));
  const gridTo = addDays(last, 7 - isoWeekday(last));

  const weeks: HistoryGridDay[][] = [];
  let week: HistoryGridDay[] = [];
  for (let date = gridFrom; date <= gridTo; date = addDays(date, 1)) {
    const inMonth = date >= first && date <= last;
    week.push({
      date,
      inMonth,
      isToday: date === opts.today,
      row: inMonth ? (byDate.get(date) ?? null) : null,
    });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) weeks.push(week);
  return weeks;
}

// ── Team KPI projection (T-1) ───────────────────────────────────────────────

/**
 * Projects a day's directory rows into the T-1 KPIs.
 *
 * `absent` cannot be counted from the rows — an absence is the *absence* of a
 * row — so the active headcount is passed in and the arithmetic is clamped at
 * zero: a member who clocked in and was archived the same day would otherwise
 * drive the count negative.
 */
export function projectTeamKpis(
  rows: AttendanceDirectoryRow[],
  opts: { activeMemberCount: number },
): TeamAttendanceKpis {
  let present = 0;
  let late = 0;
  let onBreak = 0;
  let completed = 0;
  let totalEffective = 0;

  for (const r of rows) {
    if (PRESENT_STATUSES.has(r.status) || r.status === "WORKING") present += 1;
    if (r.isLate) late += 1;
    if (r.isOnBreak) onBreak += 1;
    if (r.clockOutAt) {
      completed += 1;
      totalEffective += r.metrics.effectiveMinutes;
    }
  }

  return {
    present,
    absent: Math.max(0, opts.activeMemberCount - rows.length),
    late,
    onBreak,
    avgEffectiveMinutes: roundAvg(totalEffective, completed),
  };
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

  const daily = [...byDate.values()].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

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
