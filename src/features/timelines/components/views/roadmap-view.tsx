import React from "react";
import { TimelineData } from "./gantt-chart";

export function RoadmapView({
  timeline,
}: {
  timeline: TimelineData | null | undefined;
}) {
  if (!timeline) return null;

  return (
    <div className="rounded-xl border border-border bg-surface-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Roadmap Overview</h3>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        {timeline.phases.map((phase) => (
          <div
            key={phase.phaseId}
            className="min-h-[300px] rounded-lg border border-border/70 bg-surface-2/40 p-4"
          >
            <h4 className="mb-4 border-b border-border/60 pb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {phase.name.replace("_", " ")}
            </h4>

            <div className="space-y-3">
              {phase.milestones.map((milestone) => (
                <div
                  key={milestone.milestoneId}
                  className="rounded-lg border border-border/80 bg-surface-0 p-3 text-sm shadow-sm transition hover:border-brand-primary/40"
                >
                  <div className="line-clamp-2 font-medium text-foreground">
                    {milestone.name}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span className="font-mono text-brand-primary">{milestone.progress}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full bg-brand-primary transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, milestone.progress))}%` }}
                    />
                  </div>
                </div>
              ))}
              {phase.milestones.length === 0 && (
                <div className="text-xs text-muted-foreground/60 italic">
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

