import React, { useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

export type MilestoneData = {
  milestoneId: string;
  name: string;
  startDate: Date | null;
  endDate: Date | null;
  progress: number;
  status: string;
};

export type PhaseData = {
  phaseId: string;
  name: string;
  milestones: MilestoneData[];
};

export type TimelineData = {
  timelineId: string;
  startDate: Date | null;
  endDate: Date | null;
  status: string;
  overallProgress: number;
  phases: PhaseData[];
};

type RowItem =
  | { type: "phase"; phase: PhaseData }
  | { type: "milestone"; milestone: MilestoneData };

export function GanttChart({ timeline }: { timeline: TimelineData }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    const flat: RowItem[] = [];
    for (const phase of timeline.phases) {
      flat.push({ type: "phase", phase });
      for (const milestone of phase.milestones) {
        flat.push({ type: "milestone", milestone });
      }
    }
    return flat;
  }, [timeline.phases]);

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // 48px row height
    overscan: 10,
  });

  if (!timeline.startDate || !timeline.endDate) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface-2/40 p-12 text-center text-foreground-muted">
        Timeline dates are not fully defined for this project. Configure start and target dates to render the Gantt chart.
      </div>
    );
  }

  const differenceInDays = (end: Date, start: Date) =>
    Math.floor((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
  const totalDays = differenceInDays(timeline.endDate, timeline.startDate) || 1;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const calculatePosition = (date: Date | null) => {
    if (!date || !timeline.startDate) return { left: "0%", width: "0%" };
    const daysFromStart = differenceInDays(date, timeline.startDate);
    const left = Math.max(0, (daysFromStart / totalDays) * 100);
    return { left: `${left}%` };
  };

  const calculateWidth = (start: Date | null, end: Date | null) => {
    if (!start || !end) return { width: "0%" };
    const duration = differenceInDays(end, start) || 1;
    const width = Math.min(100, (duration / totalDays) * 100);
    return { width: `${width}%` };
  };

  return (
    <div className="flex h-[600px] w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      {/* Header (Fixed) */}
      <div className="z-10 min-w-[800px] flex-none overflow-hidden border-b border-border bg-surface-2/80 backdrop-blur-xs">
        <div className="grid grid-cols-[280px_1fr]">
          <div className="p-3.5 pl-4 text-xs font-semibold text-foreground tracking-wide uppercase">
            Phases & Milestones
          </div>
          <div className="relative p-3.5 text-xs font-mono font-medium text-foreground-muted">
            <span className="absolute left-2">
              {formatDate(timeline.startDate)}
            </span>
            <span className="absolute right-4">
              {formatDate(timeline.endDate)}
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable Virtualized Area */}
      <div
        ref={parentRef}
        className="relative min-w-[800px] flex-1 overflow-auto bg-surface-0/40"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];

            if (row.type === "phase") {
              return (
                <div
                  key={virtualRow.index}
                  className="absolute top-0 left-0 grid h-12 w-full grid-cols-[280px_1fr] border-b border-border bg-surface-1/70"
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="flex items-center p-3 pl-4 text-xs font-semibold text-foreground-heading capitalize">
                    {row.phase.name.replace("_", " ")}
                  </div>
                  <div className="relative flex items-center p-3">
                    {/* Phase timeline track */}
                    <div className="h-0.5 w-full bg-border-subtle" />
                  </div>
                </div>
              );
            }

            // Milestone row
            const { left } = calculatePosition(row.milestone.startDate);
            const { width } = calculateWidth(
              row.milestone.startDate,
              row.milestone.endDate,
            );

            return (
              <div
                key={virtualRow.index}
                className="absolute top-0 left-0 grid h-12 w-full grid-cols-[280px_1fr] border-b border-border-subtle transition-colors hover:bg-surface-3/30"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="flex items-center truncate p-3 pl-8 text-xs text-foreground-secondary">
                  <span className="truncate">{row.milestone.name}</span>
                </div>
                <div className="relative flex items-center p-3">
                  {row.milestone.startDate && row.milestone.endDate && (
                    <div
                      className="absolute h-6 overflow-hidden rounded border border-brand-primary/50 bg-brand-primary/25 shadow-xs"
                      style={{ left, width }}
                    >
                      <div
                        className="h-full bg-brand-primary transition-all duration-300"
                        style={{ width: `${row.milestone.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
