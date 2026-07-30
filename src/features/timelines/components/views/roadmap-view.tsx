import React from "react";
import { TimelineData } from "./gantt-chart";

export function RoadmapView({
  timeline,
}: {
  timeline: TimelineData | null | undefined;
}) {
  if (!timeline) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Roadmap</h3>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        {timeline.phases.map((phase) => (
          <div
            key={phase.phaseId}
            className="min-h-[300px] rounded-lg border border-gray-100 bg-gray-50/50 p-4"
          >
            <h4 className="mb-4 border-b border-gray-200 pb-2 text-sm font-bold tracking-wider text-gray-700 uppercase">
              {phase.name.replace("_", " ")}
            </h4>

            <div className="space-y-3">
              {phase.milestones.map((milestone) => (
                <div
                  key={milestone.milestoneId}
                  className="rounded border border-gray-100 bg-white p-3 text-sm shadow-sm"
                >
                  <div className="line-clamp-2 font-medium text-gray-900">
                    {milestone.name}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Progress: {milestone.progress}%
                  </div>
                </div>
              ))}
              {phase.milestones.length === 0 && (
                <div className="text-xs text-gray-400 italic">
                  No milestones
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
