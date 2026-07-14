"use client";

import React, { useState } from "react";
import { TaskList } from "./task-list";
import { TaskBoard } from "./task-board";

interface TaskDashboardProps {
  projectId: string;
  milestoneId: string; // Focusing on a specific milestone's tasks
}

export function TaskDashboard({ milestoneId }: TaskDashboardProps) {
  const [view, setView] = useState<"list" | "board">("list");

  return (
    <div className="flex flex-col gap-6 w-full h-full p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Tasks</h2>
          <p className="text-sm text-gray-400">Manage tasks for this milestone.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md p-1 rounded-lg border border-white/10">
          <button
            onClick={() => setView("list")}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${view === "list" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}
          >
            List View
          </button>
          <button
            onClick={() => setView("board")}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${view === "board" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}
          >
            Board View
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {view === "list" ? (
          <TaskList milestoneId={milestoneId} />
        ) : (
          <TaskBoard milestoneId={milestoneId} />
        )}
      </div>
    </div>
  );
}
