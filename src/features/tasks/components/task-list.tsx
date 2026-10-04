"use client";

/**
 * Virtualised task list. Sprint 12A: rows are now buttons that open the detail
 * dialog — previously the list rendered read-only and only the board could
 * open a task. Tasks are supplied by TaskDashboard so a mutation in any view
 * refreshes every view.
 */
import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Badge } from "@/components/ui/badge";

type TaskRow = Record<string, any>;

export function TaskList({
  tasks,
  loading,
  onTaskClick,
}: Readonly<{
  tasks: TaskRow[];
  loading: boolean;
  onTaskClick: (taskId: string) => void;
}>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64, // Approximate row height
    overscan: 5,
  });

  if (loading) {
    return (
      <div className="text-muted-foreground p-4 text-sm">Loading tasks...</div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-muted-foreground p-4 text-sm">
        No tasks found. Use &ldquo;New Task&rdquo; to add the first one.
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="bg-surface-1 border border-border h-[500px] overflow-auto rounded-xl shadow-xs"
    >
      <div
        className="relative w-full"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const task = tasks[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={rowVirtualizer.measureElement}
              className="absolute top-0 left-0 w-full"
              style={{
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <button
                type="button"
                onClick={() => onTaskClick(task.taskId)}
                className="hover:bg-surface-2/50 focus-visible:ring-ring flex w-full items-center justify-between gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs text-brand-primary border-brand-primary/30 bg-brand-primary/5">
                      {task.taskCode}
                    </Badge>
                    <span className="text-foreground truncate text-sm font-medium">
                      {task.name}
                    </span>
                  </div>

                  <div className="text-muted-foreground flex items-center gap-3 text-xs">
                    <span className="capitalize">
                      {String(task.status).replaceAll("_", " ")}
                    </span>
                    <span>&bull;</span>
                    <span className="capitalize">{task.priority} Priority</span>
                  </div>
                </div>
                {/* Rendered only when the row actually carries a progress
                    value — a bare "%" reads as a bug. */}
                {typeof task.progress === "number" ? (
                  <div className="text-muted-foreground shrink-0 text-xs">
                    {task.progress}%
                  </div>
                ) : null}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
