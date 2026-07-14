"use client";

import React from "react";

interface FolderTreeProps {
  projectId: string;
  currentFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
}

export function FolderTree({ projectId, currentFolderId, onSelectFolder }: FolderTreeProps) {
  // Mock data for UI scaffold
  const folders = [
    { id: "f1", name: "Assets", depth: 0 },
    { id: "f2", name: "Logos", depth: 1 },
    { id: "f3", name: "Videos", depth: 1 },
    { id: "f4", name: "Raw Footage", depth: 2 },
    { id: "f5", name: "Documents", depth: 0 },
  ];

  return (
    <div className="flex flex-col gap-1">
      <button 
        onClick={() => onSelectFolder(null)}
        className={`text-left px-2 py-1.5 text-sm rounded ${currentFolderId === null ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-100"}`}
      >
        🗂️ Project Root
      </button>
      
      {folders.map(folder => (
        <button
          key={folder.id}
          onClick={() => onSelectFolder(folder.id)}
          className={`text-left px-2 py-1.5 text-sm rounded flex items-center ${currentFolderId === folder.id ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-100"}`}
          style={{ paddingLeft: `${(folder.depth + 1) * 12 + 8}px` }}
        >
          📁 {folder.name}
        </button>
      ))}
    </div>
  );
}
