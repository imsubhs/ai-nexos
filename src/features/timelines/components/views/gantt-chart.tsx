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
    return <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg">Timeline dates not fully defined. Cannot render Gantt Chart.</div>;
  }

  const differenceInDays = (end: Date, start: Date) => Math.floor((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
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
    <div className="w-full border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden flex flex-col h-[600px]">
      {/* Header (Fixed) */}
      <div className="min-w-[800px] overflow-hidden bg-gray-50/50 flex-none z-10 border-b border-gray-200">
        <div className="grid grid-cols-[250px_1fr]">
          <div className="p-4 font-semibold text-sm text-gray-700">Phases & Milestones</div>
          <div className="p-4 font-semibold text-sm text-gray-700 relative">
            <span className="absolute left-0">{formatDate(timeline.startDate)}</span>
            <span className="absolute right-4">{formatDate(timeline.endDate)}</span>
          </div>
        </div>
      </div>

      {/* Scrollable Virtualized Area */}
      <div ref={parentRef} className="flex-1 overflow-auto min-w-[800px] relative">
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
                  className="absolute top-0 left-0 w-full grid grid-cols-[250px_1fr] border-b border-gray-100 bg-gray-50 h-12"
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="p-3 pl-4 text-sm font-medium text-gray-900 capitalize flex items-center">
                    {row.phase.name.replace("_", " ")}
                  </div>
                  <div className="relative p-3 flex items-center">
                    {/* Phase Summary Bar (Placeholder) */}
                  </div>
                </div>
              );
            }

            // Milestone row
            const { left } = calculatePosition(row.milestone.startDate);
            const { width } = calculateWidth(row.milestone.startDate, row.milestone.endDate);

            return (
              <div
                key={virtualRow.index}
                className="absolute top-0 left-0 w-full grid grid-cols-[250px_1fr] border-b border-gray-50 hover:bg-gray-50/50 transition-colors h-12"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="p-3 pl-8 text-sm text-gray-600 truncate flex items-center">
                  {row.milestone.name}
                </div>
                <div className="relative p-3 flex items-center">
                  {row.milestone.startDate && row.milestone.endDate && (
                    <div 
                      className="absolute h-6 bg-blue-500 rounded-md shadow-sm overflow-hidden"
                      style={{ left, width }}
                    >
                      <div 
                        className="h-full bg-blue-600" 
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
