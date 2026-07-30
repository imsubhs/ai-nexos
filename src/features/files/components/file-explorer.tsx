"use client";

import React, { useState } from "react";
import { FolderTree } from "./folder-tree";
import { FileGridView } from "./file-grid-view";

interface FileExplorerProps {
  projectId: string;
  organizationId: string;
}

export function FileExplorer({ projectId }: FileExplorerProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  return (
    <div className="flex h-full w-full overflow-hidden rounded-lg border bg-slate-50">
      {/* Sidebar: Folder Tree */}
      <div className="flex w-64 flex-col border-r bg-white">
        <div className="border-b p-4 font-semibold text-slate-800">Folders</div>
        <div className="flex-1 overflow-y-auto p-2">
          <FolderTree
            projectId={projectId}
            currentFolderId={currentFolderId}
            onSelectFolder={setCurrentFolderId}
          />
        </div>
      </div>

      {/* Main Content: Files */}
      <div className="flex flex-1 flex-col bg-slate-50">
        {/* Toolbar */}
        <div className="flex h-14 items-center justify-between border-b bg-white px-4">
          <div className="text-sm font-medium text-slate-600">
            {currentFolderId ? `Folder: ${currentFolderId}` : "Root Directory"}
          </div>
          <div className="flex gap-2">
            <button className="rounded border bg-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-slate-50">
              New Folder
            </button>
            <button className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
              Upload Files
            </button>
          </div>
        </div>

        {/* File Grid */}
        <div className="relative flex-1 overflow-hidden p-4">
          <FileGridView />
        </div>
      </div>
    </div>
  );
}
