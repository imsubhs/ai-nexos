"use client";

import React, { useState, useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { getTasks } from "../actions";

interface TaskListProps {
  milestoneId: string;
}

export function TaskList({ milestoneId }: TaskListProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadTasks() {
      setLoading(true);
      try {
        const loadedTasks = await getTasks(milestoneId, 0, 1000); // For demo, load a big chunk
        setTasks(loadedTasks);
      } catch (error) {
        console.error("Failed to load tasks", error);
      } finally {
        setLoading(false);
      }
    }
    loadTasks();
  }, [milestoneId]);

  const rowVirtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64, // Approximate row height
    overscan: 5,
  });

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Loading tasks...</div>;
  }

  if (tasks.length === 0) {
    return <div className="p-4 text-sm text-gray-500">No tasks found.</div>;
  }

  return (
    <div
      ref={parentRef}
      className="h-[500px] overflow-auto border border-white/10 rounded-lg bg-black/40 backdrop-blur-md"
    >
      <div
        className="w-full relative"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const task = tasks[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={rowVirtualizer.measureElement}
              className="absolute top-0 left-0 w-full px-4 py-3 border-b border-white/5 flex items-center justify-between hover:bg-white/5 transition-colors"
              style={{
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                    {task.taskCode}
                  </span>
                  <h4 className="text-sm font-medium text-white">{task.name}</h4>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="capitalize">{task.status.replace("_", " ")}</span>
                  <span>&bull;</span>
                  <span className="capitalize">{task.priority} Priority</span>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {task.progress}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
