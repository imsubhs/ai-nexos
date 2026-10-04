import React from "react";
import { TimelineData } from "./gantt-chart";

export function CalendarView({
  timeline,
}: {
  timeline: TimelineData | null | undefined;
}) {
  if (!timeline) return null;

  const totalMilestones = timeline.phases.flatMap((p) => p.milestones).length;

  return (
    <div className="rounded-xl border border-border bg-surface-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Schedule Calendar</h3>
      </div>

      <div className="flex h-[450px] items-center justify-center rounded-lg border border-dashed border-border/80 bg-surface-2/30 text-muted-foreground">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-3 text-brand-primary">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="font-medium text-foreground">Calendar Grid Overview</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalMilestones} milestone{totalMilestones === 1 ? "" : "s"} scheduled across {timeline.phases.length} project phases.
          </p>
        </div>
      </div>
    </div>
  );
}

