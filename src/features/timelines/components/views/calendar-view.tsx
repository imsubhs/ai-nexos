import React from "react";
import { TimelineData } from "./gantt-chart";

export function CalendarView({
  timeline,
}: {
  timeline: TimelineData | null | undefined;
}) {
  if (!timeline) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Calendar</h3>
      </div>

      <div className="flex h-[600px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-400">
        <div className="text-center">
          <p>Calendar Grid Foundation</p>
          <p className="mt-2 text-sm">
            Will map {timeline.phases.flatMap((p) => p.milestones).length}{" "}
            milestones.
          </p>
        </div>
      </div>
    </div>
  );
}
