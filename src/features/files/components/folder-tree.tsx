"use client";

import React from "react";

interface FolderTreeProps {
  projectId: string;
  currentFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
}

export function FolderTree({
  projectId,
  currentFolderId,
  onSelectFolder,
}: FolderTreeProps) {
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
        className={`rounded px-2 py-1.5 text-left text-sm ${currentFolderId === null ? "bg-blue-50 font-medium text-blue-700" : "text-slate-700 hover:bg-slate-100"}`}
      >
        🗂️ Project Root
      </button>

      {folders.map((folder) => (
        <button
          key={folder.id}
          onClick={() => onSelectFolder(folder.id)}
          className={`flex items-center rounded px-2 py-1.5 text-left text-sm ${currentFolderId === folder.id ? "bg-blue-50 font-medium text-blue-700" : "text-slate-700 hover:bg-slate-100"}`}
          style={{ paddingLeft: `${(folder.depth + 1) * 12 + 8}px` }}
        >
          📁 {folder.name}
        </button>
      ))}
    </div>
  );
}
