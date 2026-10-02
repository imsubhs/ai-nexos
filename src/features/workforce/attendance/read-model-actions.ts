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
import {
  requireCurrentUser,
  type CurrentUser,
} from "@/features/auth/current-user";
import { hasPermission, requirePermission } from "@/features/permissions";
import { currentBusinessDay } from "../shared/business-day";
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
import { RATE_LIMITS, consumeRateLimit, rateLimitHeaders } from "@/lib/security/rate-limit";
import { resolveGuardContext, KeyResolvers } from "@/lib/security/action-guard";
import { ApiError } from "@/lib/security/errors";

const MAX_REPORT_ROWS = 1000;

function attendanceRepo(): AttendanceRepository {
  return isDemoMode() ? mockAttendanceRepository : realAttendanceRepository;
}
function correctionRepo(): CorrectionRepository {
  return isDemoMode() ? mockCorrectionRepository : realCorrectionRepository;
}

/**
 * The dashboard's default day is the organization's attendance business day —
 * the same one clock-in files rows under. Taken from server UTC, this asked for
 * a different date than the rows carry for any organization whose own clock has
 * already turned the day over.
 */
function todayIso(user: Pick<CurrentUser, "organizationTimezone">): string {
  return currentBusinessDay(user.organizationTimezone);
}

/** Fetch directory rows matching the filters. Result is hard-capped at 1,000 rows. */
async function fetchRows(
  organizationId: string,
  filters: { date?: string; departmentId?: string; from?: string; to?: string },
): Promise<AttendanceDirectoryRow[]> {
  const { rows } = await attendanceRepo().list(organizationId, {
    ...filters,
    page: 1,
    pageSize: MAX_REPORT_ROWS,
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

  const context = await resolveGuardContext();
  const identifier = KeyResolvers.userAndOrg([], context);
  const decision = await consumeRateLimit(RATE_LIMITS.reportExpensive, identifier);
  if (!decision.allowed) {
    throw new ApiError(
      "rate_limited",
      `Too many metrics requests. Please try again in ${decision.retryAfterSeconds}s.`,
      { headers: rateLimitHeaders(decision) },
    );
  }

  const date = input?.date ?? todayIso(user);

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
 *
 * Security controls:
 * - Date bounds: [from, to] must be valid ISO dates not exceeding 31 calendar days.
 * - SQL Pushdown: Pushes gte(from) and lte(to) to the database query rather than
 *   loading 10k rows into Node memory.
 * - Result ceiling: Capped at 1,000 rows.
 * - Tenant isolation: Enforced on organizationId predicate.
 * - Rate limiting: RATE_LIMITS.reportExpensive (5 / 5m per org+user).
 */
export async function getWorkforceReportAction(input: {
  from: string;
  to: string;
  departmentId?: string;
}): Promise<WorkforceReport> {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "attendance", "view_team");

  // Validate date inputs
  const fromTime = Date.parse(input.from);
  const toTime = Date.parse(input.to);
  if (Number.isNaN(fromTime) || Number.isNaN(toTime) || fromTime > toTime) {
    throw new ApiError("bad_request", "Invalid date range parameters.");
  }

  const diffDays = Math.ceil((toTime - fromTime) / (1000 * 60 * 60 * 24));
  if (diffDays > 31) {
    throw new ApiError(
      "bad_request",
      "Workforce report date range cannot exceed 31 days.",
    );
  }

  // Rate limit expensive report projection
  const context = await resolveGuardContext();
  const identifier = KeyResolvers.userAndOrg([], context);
  const decision = await consumeRateLimit(RATE_LIMITS.reportExpensive, identifier);
  if (!decision.allowed) {
    throw new ApiError(
      "rate_limited",
      `Too many report requests. Please try again in ${decision.retryAfterSeconds}s.`,
      { headers: rateLimitHeaders(decision) },
    );
  }

  // Direct SQL-side filtered fetch bounded to MAX_REPORT_ROWS (1,000)
  const rows = await fetchRows(user.organizationId, {
    from: input.from,
    to: input.to,
    departmentId: input.departmentId,
  });

  return projectMonthlyReport(rows, { from: input.from, to: input.to });
}
