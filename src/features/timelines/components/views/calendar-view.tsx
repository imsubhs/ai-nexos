import React from "react";
import { TimelineData } from "./gantt-chart";

export function CalendarView({ timeline }: { timeline: TimelineData | null | undefined }) {
  if (!timeline) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Calendar</h3>
      </div>
      
      <div className="border border-gray-200 rounded-lg bg-gray-50 h-[600px] flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p>Calendar Grid Foundation</p>
          <p className="text-sm mt-2">Will map {timeline.phases.flatMap(p => p.milestones).length} milestones.</p>
        </div>
      </div>
    </div>
  );
}
