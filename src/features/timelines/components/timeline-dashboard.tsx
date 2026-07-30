"use client";

import React, { useState, useEffect } from "react";
import {
  GanttChart,
  TimelineData,
  PhaseData,
  MilestoneData,
} from "./views/gantt-chart";
import { RoadmapView } from "./views/roadmap-view";
import { CalendarView } from "./views/calendar-view";
import { getTimelineMilestones } from "../actions";

type TimelineDashboardProps = {
  timeline: TimelineData | null | undefined;
};

export function TimelineDashboard({
  timeline: initialTimeline,
}: TimelineDashboardProps) {
  const [view, setView] = useState<"gantt" | "list" | "roadmap" | "calendar">(
    "gantt",
  );
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

    return () => {
      isMounted = false;
    };
  }, [initialTimeline?.timelineId]);

  if (!initialTimeline) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-12">
        <h3 className="mb-2 text-lg font-semibold text-gray-900">
          No Timeline Created
        </h3>
        <p className="max-w-sm text-center text-gray-500">
          This project does not have a timeline yet. Get started by initializing
          the schedule.
        </p>
        <button className="mt-6 rounded-md bg-black px-4 py-2 font-medium text-white transition-colors hover:bg-gray-800">
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
      milestones: milestones.filter(
        (m) => (m as unknown as { phaseId: string }).phaseId === p.phaseId,
      ),
    })),
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Project Timeline</h2>
          <p className="text-sm text-gray-500">
            Overall Progress: {timeline.overallProgress}% | Status:{" "}
            <span className="capitalize">
              {timeline.status.replace("_", " ")}
            </span>
          </p>
        </div>

        <div className="flex items-center rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setView("gantt")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${view === "gantt" ? "bg-white text-black shadow-sm" : "text-gray-600 hover:text-black"}`}
          >
            Gantt
          </button>
          <button
            onClick={() => setView("list")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${view === "list" ? "bg-white text-black shadow-sm" : "text-gray-600 hover:text-black"}`}
          >
            List
          </button>
          <button
            onClick={() => setView("roadmap")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${view === "roadmap" ? "bg-white text-black shadow-sm" : "text-gray-600 hover:text-black"}`}
          >
            Roadmap
          </button>
          <button
            onClick={() => setView("calendar")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${view === "calendar" ? "bg-white text-black shadow-sm" : "text-gray-600 hover:text-black"}`}
          >
            Calendar
          </button>
        </div>
      </div>

      {isLoading && milestones.length === 0 ? (
        <div className="p-12 text-center text-gray-400">
          Loading milestones...
        </div>
      ) : view === "gantt" ? (
        <GanttChart timeline={timeline} />
      ) : view === "roadmap" ? (
        <RoadmapView timeline={timeline} />
      ) : view === "calendar" ? (
        <CalendarView timeline={timeline} />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-medium text-gray-900">
            Milestone List
          </h3>
          <div className="space-y-8">
            {timeline.phases.map((phase: PhaseData) => (
              <div key={phase.phaseId}>
                <h4 className="mb-3 text-sm font-bold tracking-wider text-gray-500 uppercase">
                  {phase.name.replace("_", " ")}
                </h4>
                <div className="grid gap-3">
                  {phase.milestones.length === 0 ? (
                    <div className="py-2 text-sm text-gray-400 italic">
                      No milestones in this phase.
                    </div>
                  ) : (
                    phase.milestones.map((milestone: MilestoneData) => (
                      <div
                        key={milestone.milestoneId}
                        className="flex items-center justify-between rounded-lg border border-gray-100 p-4 transition-colors hover:border-gray-200"
                      >
                        <div>
                          <div className="font-medium text-gray-900">
                            {milestone.name}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            Status: {milestone.status.replace("_", " ")}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm font-medium">
                            {milestone.progress}%
                          </div>
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full bg-blue-500"
                              style={{ width: `${milestone.progress}%` }}
                            />
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
