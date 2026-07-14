import React from "react";
import { TimelineData } from "./gantt-chart";

export function RoadmapView({ timeline }: { timeline: TimelineData | null | undefined }) {
  if (!timeline) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Roadmap</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {timeline.phases.map((phase) => (
          <div key={phase.phaseId} className="border border-gray-100 rounded-lg bg-gray-50/50 p-4 min-h-[300px]">
            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">
              {phase.name.replace("_", " ")}
            </h4>
            
            <div className="space-y-3">
              {phase.milestones.map((milestone) => (
                <div key={milestone.milestoneId} className="bg-white p-3 rounded shadow-sm border border-gray-100 text-sm">
                  <div className="font-medium text-gray-900 line-clamp-2">{milestone.name}</div>
                  <div className="mt-2 text-xs text-gray-500">
                    Progress: {milestone.progress}%
                  </div>
                </div>
              ))}
              {phase.milestones.length === 0 && (
                <div className="text-xs text-gray-400 italic">No milestones</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
