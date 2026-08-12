import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { requireCurrentUser } from "@/features/auth/current-user";
import { getCalendarMonthAction } from "@/features/calendar/actions";
import { isCalendarMonth, shiftMonth } from "@/features/calendar/aggregate";
import { CalendarLegend } from "@/features/calendar/components/calendar-legend";
import { CalendarMonthGrid } from "@/features/calendar/components/calendar-month-grid";
import { formatMonth } from "@/features/workforce/shared/format";

export const metadata: Metadata = { title: "Calendar" };

/**
 * The organization calendar — a read-only lens over records other modules own
 * (meetings, milestones, task due dates). It has no table and no writes; see
 * src/features/calendar/types.ts for why that is a rule and not a phase.
 *
 * There is no page-level permission gate because the calendar has no permission
 * of its own (merge doc 13 §2). Instead the action composes the viewer's module
 * read permissions and queries only the sources they may see — so authorization
 * happens before the query, not by filtering results afterwards.
 */
export default async function CalendarPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ month?: string }> }>) {
  await requireCurrentUser();

  const params = await searchParams;
  const requested =
    params.month && isCalendarMonth(params.month) ? params.month : undefined;

  const month = await getCalendarMonthAction({ month: requested });
  const href = (value: string) => `/calendar?month=${value}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground text-sm">
            Everything scheduled across {formatMonth(month.month)}. Each item
            opens the module that owns it.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            render={
              <Link
                href={href(shiftMonth(month.month, -1))}
                aria-label="Previous month"
              />
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-40 text-center text-sm font-medium">
            {formatMonth(month.month)}
          </span>
          <Button
            variant="outline"
            size="sm"
            render={
              <Link
                href={href(shiftMonth(month.month, 1))}
                aria-label="Next month"
              />
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CalendarLegend sources={month.sources} />

      {month.sources.length === 0 ? (
        // Distinct from "nothing is scheduled": this viewer cannot read any of
        // the three source modules, and saying so is the honest answer.
        <EmptyState
          icon={Lock}
          title="Nothing to show you here"
          description="The calendar draws on Meetings, Timelines and Tasks. Your role does not have read access to any of them, so there is nothing it can display."
        />
      ) : month.totalEntries === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={`Nothing scheduled in ${formatMonth(month.month)}`}
          description="Meetings, milestones and task due dates appear here as they are created in their own modules."
        />
      ) : (
        <CalendarMonthGrid month={month} />
      )}
    </div>
  );
}
