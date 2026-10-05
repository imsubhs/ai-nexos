import React from "react";
import { TimelineData } from "./gantt-chart";

export function RoadmapView({
  timeline,
}: {
  timeline: TimelineData | null | undefined;
}) {
  if (!timeline) return null;

  return (
    <div className="border-border bg-surface-1 rounded-xl border p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-foreground text-lg font-semibold">
          Roadmap Overview
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        {timeline.phases.map((phase) => (
          <div
            key={phase.phaseId}
            className="border-border/70 bg-surface-2/40 min-h-[300px] rounded-lg border p-4"
          >
            <h4 className="border-border/60 text-muted-foreground mb-4 border-b pb-2 text-xs font-semibold tracking-wider uppercase">
              {phase.name.replace("_", " ")}
            </h4>

            <div className="space-y-3">
              {phase.milestones.map((milestone) => (
                <div
                  key={milestone.milestoneId}
                  className="border-border/80 bg-surface-0 hover:border-brand-primary/40 rounded-lg border p-3 text-sm shadow-sm transition"
                >
                  <div className="text-foreground line-clamp-2 font-medium">
                    {milestone.name}
                  </div>
                  <div className="text-muted-foreground mt-2 flex items-center justify-between text-xs">
                    <span>Progress</span>
                    <span className="text-brand-primary font-mono">
                      {milestone.progress}%
                    </span>
                  </div>
                  <div className="bg-surface-3 mt-1.5 h-1.5 w-full overflow-hidden rounded-full">
                    <div
                      className="bg-brand-primary h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(0, milestone.progress))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
              {phase.milestones.length === 0 && (
                <div className="text-muted-foreground/60 text-xs italic">
                  No milestones in this phase
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
