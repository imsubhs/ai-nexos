"use client";

import React from "react";

interface TaskDetailModalProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  task: any;
  onClose: () => void;
}

export function TaskDetailModal({ task, onClose }: TaskDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium px-2 py-1 rounded-md bg-blue-500/20 text-blue-400">
              {task.taskCode}
            </span>
            <h2 className="text-lg font-semibold text-white">{task.name}</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Status</p>
              <p className="text-white capitalize">{task.status.replace("_", " ")}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Priority</p>
              <p className="text-white capitalize">{task.priority}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Type</p>
              <p className="text-white capitalize">{task.taskType.replace("_", " ")}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Progress</p>
              <p className="text-white">{task.progress}%</p>
            </div>
          </div>

          <div>
            <h3 className="text-gray-400 text-sm font-medium mb-2">Description</h3>
            <div className="text-white text-sm bg-white/5 p-4 rounded-lg">
              {task.description ? JSON.stringify(task.description) : <span className="italic text-gray-500">No description provided.</span>}
            </div>
          </div>

          <div className="flex justify-between items-center bg-white/5 p-4 rounded-lg border border-white/5">
            <div>
              <h3 className="text-white font-medium text-sm">Time Tracking</h3>
              <p className="text-xs text-gray-400 mt-1">
                Logged: {task.actualDurationMins}m / Est: {task.estimatedDurationMins}m
              </p>
            </div>
            <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-md transition-colors">
              Start Timer
            </button>
          </div>
          
          <div>
            <h3 className="text-gray-400 text-sm font-medium mb-2">Checklist</h3>
            <p className="text-xs text-gray-500">Checklist implementation pending...</p>
          </div>

          <div>
            <h3 className="text-gray-400 text-sm font-medium mb-2">Comments</h3>
            <p className="text-xs text-gray-500">Comments implementation pending...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
