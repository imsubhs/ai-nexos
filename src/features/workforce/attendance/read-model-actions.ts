"use server";

/**
 * Workforce read-model server actions (Sprint 4B) — the dashboard-metric and
 * report projections (doc 14 §12.7, WP-132/134 read layer). Both fetch
 * AttendanceDay rows through the repository (whose per-day minutes are engine
 * output) and run the PURE projections in `read-models.ts`. No counters are
 * stored and no interval math is repeated — the frozen engine remains the one
 * calculation surface.
 *
 * Charts/analytics are out of scope: these return plain data structures.
 * DEMO_MODE selects the demo repositories; the real path uses the Drizzle
 * adapters (compile-safe until Phase 7), mirroring the slice's actions.ts.
 */
import { requireCurrentUser } from "@/features/auth/current-user";
import { hasPermission, requirePermission } from "@/features/permissions";
import { mockAttendanceRepository } from "./mock-repository";
import { realAttendanceRepository } from "./real-repository";
import { mockCorrectionRepository } from "../corrections/mock-repository";
import { realCorrectionRepository } from "../corrections/real-repository";
import type { AttendanceRepository } from "./repository";
import type { CorrectionRepository } from "../corrections/repository";
import {
  projectDashboardMetrics,
  projectMonthlyReport,
  type WorkforceDashboardMetrics,
  type WorkforceReport,
} from "./read-models";
import type { AttendanceDirectoryRow } from "./types";
import { isDemoMode } from "@/lib/env.server";

const ALL_ROWS_PAGE_SIZE = 10_000;

function attendanceRepo(): AttendanceRepository {
  return isDemoMode() ? mockAttendanceRepository : realAttendanceRepository;
}
function correctionRepo(): CorrectionRepository {
  return isDemoMode() ? mockCorrectionRepository : realCorrectionRepository;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Fetch every directory row matching the filters (projections need them all). */
async function fetchRows(
  organizationId: string,
  filters: { date?: string; departmentId?: string },
): Promise<AttendanceDirectoryRow[]> {
  const { rows } = await attendanceRepo().list(organizationId, {
    ...filters,
    page: 1,
    pageSize: ALL_ROWS_PAGE_SIZE,
  });
  return rows;
}

/**
 * R-3 dashboard metrics for one day (default today). Requires
 * `attendance.view_team`; the pending-review count is included only when the
 * caller can also review corrections (permission-composed, doc 16 S-8).
 */
export async function getWorkforceDashboardMetricsAction(input?: {
  date?: string;
  departmentId?: string;
}): Promise<WorkforceDashboardMetrics> {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "attendance", "view_team");
  const date = input?.date ?? todayIso();

  const rows = await fetchRows(user.organizationId, {
    date,
    departmentId: input?.departmentId,
  });

  let pendingReviewCount = 0;
  if (hasPermission(user.permissions, "corrections", "review")) {
    const queue = await correctionRepo().listQueue(user.organizationId, null, {
      page: 1,
      pageSize: 1,
    });
    pendingReviewCount =
      (queue.counts.PENDING ?? 0) + (queue.counts.UNDER_REVIEW ?? 0);
  }

  return projectDashboardMetrics(rows, { date, pendingReviewCount });
}

/**
 * R-1 monthly report over [from, to] (inclusive ISO dates). Requires
 * `attendance.view_team`; department scoping via `departmentId`.
 */
export async function getWorkforceReportAction(input: {
  from: string;
  to: string;
  departmentId?: string;
}): Promise<WorkforceReport> {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "attendance", "view_team");

  // The directory list filters by a single date; for a range we fetch the
  // department slice and filter to [from, to] here (query-time, demo-scale).
  const rows = (
    await fetchRows(user.organizationId, { departmentId: input.departmentId })
  ).filter((r) => r.date >= input.from && r.date <= input.to);

  return projectMonthlyReport(rows, { from: input.from, to: input.to });
}
