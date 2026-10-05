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
    <div className="border-border bg-surface-1 rounded-xl border p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-foreground text-lg font-semibold">
          Schedule Calendar
        </h3>
      </div>

      <div className="border-border/80 bg-surface-2/30 text-muted-foreground flex h-[450px] items-center justify-center rounded-lg border border-dashed">
        <div className="max-w-md text-center">
          <div className="bg-surface-3 text-brand-primary mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl">
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="text-foreground font-medium">Calendar Grid Overview</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {totalMilestones} milestone{totalMilestones === 1 ? "" : "s"}{" "}
            scheduled across {timeline.phases.length} project phases.
          </p>
        </div>
      </div>
    </div>
  );
}
