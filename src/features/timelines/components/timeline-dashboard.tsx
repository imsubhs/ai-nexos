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

/**
 * What the server actually hands this component: a timeline with its ordered
 * phases and nothing below them. `getProjectTimeline` embeds `phases` only —
 * milestones are fetched here, client-side, and merged in below to build the
 * `TimelineData` the views consume. Typing the prop as `TimelineData` claimed
 * the phases already carried their milestones, which was never true; it went
 * unnoticed only because the timeline tables had no relational declarations,
 * so the action's return type carried no `phases` for TypeScript to check.
 */
type TimelineInput = Omit<TimelineData, "phases"> & {
  phases: Omit<PhaseData, "milestones">[];
};

type TimelineDashboardProps = {
  timeline: TimelineInput | null | undefined;
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
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-2/40 p-12 text-center">
        <h3 className="mb-2 text-base font-semibold text-foreground-heading">
          No Timeline Created
        </h3>
        <p className="max-w-sm text-center text-xs text-foreground-muted">
          This project does not have a timeline yet. Work with milestones and phases to track delivery schedules.
        </p>
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
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground-heading">Project Timeline</h2>
          <p className="text-xs text-foreground-muted">
            Overall Progress: <span className="font-mono font-medium text-foreground">{timeline.overallProgress}%</span> · Status:{" "}
            <span className="capitalize text-foreground-secondary">
              {timeline.status.replace("_", " ")}
            </span>
          </p>
        </div>

        <div className="flex items-center rounded-lg bg-surface-1 border border-border-subtle p-1 gap-1">
          {(
            [
              ["gantt", "Gantt"],
              ["list", "List"],
              ["roadmap", "Roadmap"],
              ["calendar", "Calendar"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                view === key
                  ? "bg-surface-3 text-foreground font-semibold shadow-xs"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && milestones.length === 0 ? (
        <div className="p-12 text-center text-xs text-foreground-muted animate-pulse">
          Loading milestones…
        </div>
      ) : view === "gantt" ? (
        <GanttChart timeline={timeline} />
      ) : view === "roadmap" ? (
        <RoadmapView timeline={timeline} />
      ) : view === "calendar" ? (
        <CalendarView timeline={timeline} />
      ) : (
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <h3 className="mb-4 text-sm font-semibold text-foreground-heading uppercase tracking-wide">
            Milestone List
          </h3>
          <div className="space-y-6">
            {timeline.phases.map((phase: PhaseData) => (
              <div key={phase.phaseId} className="space-y-2">
                <h4 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                  {phase.name.replace("_", " ")}
                </h4>
                <div className="grid gap-2">
                  {phase.milestones.length === 0 ? (
                    <div className="py-2 text-xs text-foreground-subtle italic">
                      No milestones in this phase.
                    </div>
                  ) : (
                    phase.milestones.map((milestone: MilestoneData) => (
                      <div
                        key={milestone.milestoneId}
                        className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-1/40 p-3 transition-colors hover:border-border"
                      >
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {milestone.name}
                          </div>
                          <div className="mt-0.5 text-xs text-foreground-muted capitalize">
                            Status: {milestone.status.replace("_", " ")}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-xs font-mono text-foreground-secondary">
                            {milestone.progress}%
                          </div>
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-3">
                            <div
                              className="h-full bg-brand-primary transition-all duration-300"
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
