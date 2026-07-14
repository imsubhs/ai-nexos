"use client";

import React, { useState, useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { getTasks } from "../actions";
import { TaskDetailModal } from "./task-detail-modal";

interface TaskBoardProps {
  milestoneId: string;
}

const COLUMNS = [
  { id: "backlog", label: "Backlog" },
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "review", label: "Review" },
  { id: "completed", label: "Completed" },
];

export function TaskBoard({ milestoneId }: TaskBoardProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  useEffect(() => {
    async function loadTasks() {
      setLoading(true);
      try {
        const loadedTasks = await getTasks(milestoneId, 0, 1000); // Demo load
        setTasks(loadedTasks);
      } catch (error) {
        console.error("Failed to load tasks", error);
      } finally {
        setLoading(false);
      }
    }
    loadTasks();
  }, [milestoneId]);

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Loading board...</div>;
  }

  return (
    <>
      <div className="flex h-[600px] gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <BoardColumn 
            key={col.id} 
            column={col} 
            tasks={tasks.filter(t => t.status === col.id)} 
            onTaskClick={setSelectedTask} 
          />
        ))}
      </div>
      {selectedTask && (
        <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BoardColumn({ column, tasks, onTaskClick }: { column: any, tasks: any[], onTaskClick: (task: any) => void }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Card height approx
    overscan: 5,
  });

  return (
    <div className="flex-shrink-0 w-80 flex flex-col bg-black/40 border border-white/10 rounded-lg backdrop-blur-md">
      <div className="p-3 border-b border-white/10">
        <h3 className="font-semibold text-white">{column.label} <span className="text-gray-500 text-sm font-normal ml-2">{tasks.length}</span></h3>
      </div>
      
      <div ref={parentRef} className="flex-1 overflow-y-auto p-2">
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
                className="absolute top-0 left-0 w-full pb-2"
                style={{
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <div 
                  className="bg-white/5 hover:bg-white/10 transition-colors p-3 rounded-md border border-white/5 cursor-pointer flex flex-col gap-2 shadow-sm"
                  onClick={() => onTaskClick(task)}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                      {task.taskCode}
                    </span>
                    <span className="text-xs text-gray-500">{task.priority}</span>
                  </div>
                  <h4 className="text-sm font-medium text-white">{task.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {task.estimatedDurationMins > 0 && <span>Est: {task.estimatedDurationMins}m</span>}
                    {task.isPrivate && <span>🔒 Private</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
