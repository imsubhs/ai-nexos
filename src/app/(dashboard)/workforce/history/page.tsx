import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { requireCurrentUser } from "@/features/auth/current-user";
import { hasPermission } from "@/features/permissions/engine";
import { isCalendarMonth } from "@/features/calendar/aggregate";
import { getAttendanceHistoryAction } from "@/features/workforce/attendance/actions";
import { buildHistoryMonthGrid } from "@/features/workforce/attendance/read-models";
import { HistoryMonthGrid } from "@/features/workforce/attendance/components/history-month-grid";
import { HistorySummary } from "@/features/workforce/attendance/components/history-summary";
import { HistoryTable } from "@/features/workforce/attendance/components/history-table";
import { MonthNav } from "@/features/workforce/attendance/components/month-nav";
import {
  currentBusinessDay,
  timeZoneLabel,
} from "@/features/workforce/shared/business-day";

export const metadata: Metadata = { title: "Attendance History" };

/**
 * My attendance history (doc 16 S-5, WP-113). Self-scoped: A-6 takes no userId,
 * so this page cannot be pointed at another employee however the URL is edited.
 *
 * `?month=YYYY-MM&view=table|calendar` is the whole view state. An unparsable
 * month degrades to the current month rather than 500-ing on a shared link.
 */
export default async function AttendanceHistoryPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ month?: string; view?: string }>;
}>) {
  const user = await requireCurrentUser();
  if (!hasPermission(user.permissions, "attendance", "read")) {
    redirect("/unauthorized");
  }

  const params = await searchParams;
  const month =
    params.month && isCalendarMonth(params.month) ? params.month : undefined;
  const view = params.view === "calendar" ? "calendar" : "table";

  // pageSize 100 covers every day of any month, so table and calendar render
  // the same complete set of rows (the WP-113 parity criterion).
  const history = await getAttendanceHistoryAction({ month, pageSize: 100 });
  const resolvedMonth = history.from.slice(0, 7);
  // The same attendance business day A-6 derived these rows against; a UTC
  // "today" here would highlight a different cell than the one the rows were
  // filed under.
  const today = currentBusinessDay(user.organizationTimezone);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="text-muted-foreground text-sm">
          Your own attendance record. Absences on working days are derived, not
          stored. Times are shown in {user.organizationTimezone} (
          {timeZoneLabel(user.organizationTimezone)}).
        </p>
      </div>

      <MonthNav
        basePath="/workforce/history"
        month={resolvedMonth}
        view={view}
      />

      <HistorySummary summary={history.summary} />

      {history.total === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No attendance records yet"
          description="Nothing has been recorded for this month. Once you clock in, each day will appear here."
          action={
            <Button render={<Link href="/workforce/attendance" />}>
              Go to My Attendance
            </Button>
          }
        />
      ) : view === "calendar" ? (
        <HistoryMonthGrid
          weeks={buildHistoryMonthGrid(history.rows, {
            month: resolvedMonth,
            today,
          })}
        />
      ) : (
        <HistoryTable
          rows={history.rows}
          timeZone={user.organizationTimezone}
        />
      )}
    </div>
  );
}
