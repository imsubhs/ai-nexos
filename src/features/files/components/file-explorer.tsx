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
    <div className="flex h-full w-full bg-slate-50 border rounded-lg overflow-hidden">
      {/* Sidebar: Folder Tree */}
      <div className="w-64 border-r bg-white flex flex-col">
        <div className="p-4 border-b font-semibold text-slate-800">
          Folders
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <FolderTree 
            projectId={projectId} 
            currentFolderId={currentFolderId} 
            onSelectFolder={setCurrentFolderId} 
          />
        </div>
      </div>
      
      {/* Main Content: Files */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {/* Toolbar */}
        <div className="h-14 border-b bg-white flex items-center px-4 justify-between">
          <div className="text-sm font-medium text-slate-600">
            {currentFolderId ? `Folder: ${currentFolderId}` : "Root Directory"}
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-white border shadow-sm rounded text-sm font-medium hover:bg-slate-50">
              New Folder
            </button>
            <button className="px-3 py-1.5 bg-blue-600 text-white shadow-sm rounded text-sm font-medium hover:bg-blue-700">
              Upload Files
            </button>
          </div>
        </div>
        
        {/* File Grid */}
        <div className="flex-1 overflow-hidden relative p-4">
          <FileGridView />
        </div>
      </div>
    </div>
  );
}
