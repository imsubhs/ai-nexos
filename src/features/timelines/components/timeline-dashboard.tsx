"use client";

import React, { useState, useEffect } from "react";
import { GanttChart, TimelineData, PhaseData, MilestoneData } from "./views/gantt-chart";
import { RoadmapView } from "./views/roadmap-view";
import { CalendarView } from "./views/calendar-view";
import { getTimelineMilestones } from "../actions";

type TimelineDashboardProps = {
  timeline: TimelineData | null | undefined;
};

export function TimelineDashboard({ timeline: initialTimeline }: TimelineDashboardProps) {
  const [view, setView] = useState<"gantt" | "list" | "roadmap" | "calendar">("gantt");
  const [milestones, setMilestones] = useState<MilestoneData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!initialTimeline?.timelineId) return;
    
    let isMounted = true;
    
    getTimelineMilestones(initialTimeline.timelineId, 2000, 0)
      .then((data) => {
        if (!isMounted) return;
        setMilestones(data as unknown as MilestoneData[]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
      
    return () => { isMounted = false; };
  }, [initialTimeline?.timelineId]);

  if (!initialTimeline) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed border-gray-300">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Timeline Created</h3>
        <p className="text-gray-500 text-center max-w-sm">This project does not have a timeline yet. Get started by initializing the schedule.</p>
        <button className="mt-6 px-4 py-2 bg-black text-white rounded-md font-medium hover:bg-gray-800 transition-colors">
          Initialize Timeline
        </button>
      </div>
    );
  }

  // Merge fetched milestones into phases for the views
  const timeline = {
    ...initialTimeline,
    phases: initialTimeline.phases.map((p) => ({
      ...p,
      milestones: milestones.filter((m) => (m as unknown as { phaseId: string }).phaseId === p.phaseId),
    }))
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Project Timeline</h2>
          <p className="text-sm text-gray-500">
            Overall Progress: {timeline.overallProgress}% | Status: <span className="capitalize">{timeline.status.replace("_", " ")}</span>
          </p>
        </div>

        <div className="flex items-center bg-gray-100 p-1 rounded-lg">
          <button 
            onClick={() => setView("gantt")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${view === "gantt" ? "bg-white text-black shadow-sm" : "text-gray-600 hover:text-black"}`}
          >
            Gantt
          </button>
          <button 
            onClick={() => setView("list")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${view === "list" ? "bg-white text-black shadow-sm" : "text-gray-600 hover:text-black"}`}
          >
            List
          </button>
          <button 
            onClick={() => setView("roadmap")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${view === "roadmap" ? "bg-white text-black shadow-sm" : "text-gray-600 hover:text-black"}`}
          >
            Roadmap
          </button>
          <button 
            onClick={() => setView("calendar")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${view === "calendar" ? "bg-white text-black shadow-sm" : "text-gray-600 hover:text-black"}`}
          >
            Calendar
          </button>
        </div>
      </div>

      {isLoading && milestones.length === 0 ? (
        <div className="p-12 text-center text-gray-400">Loading milestones...</div>
      ) : view === "gantt" ? (
        <GanttChart timeline={timeline} />
      ) : view === "roadmap" ? (
        <RoadmapView timeline={timeline} />
      ) : view === "calendar" ? (
        <CalendarView timeline={timeline} />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Milestone List</h3>
          <div className="space-y-8">
            {timeline.phases.map((phase: PhaseData) => (
              <div key={phase.phaseId}>
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                  {phase.name.replace("_", " ")}
                </h4>
                <div className="grid gap-3">
                  {phase.milestones.length === 0 ? (
                    <div className="text-sm text-gray-400 italic py-2">No milestones in this phase.</div>
                  ) : (
                    phase.milestones.map((milestone: MilestoneData) => (
                      <div key={milestone.milestoneId} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
                        <div>
                          <div className="font-medium text-gray-900">{milestone.name}</div>
                          <div className="text-xs text-gray-500 mt-1">Status: {milestone.status.replace("_", " ")}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm font-medium">{milestone.progress}%</div>
                          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${milestone.progress}%` }} />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
