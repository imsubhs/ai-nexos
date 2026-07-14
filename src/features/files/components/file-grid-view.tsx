"use client";

import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface FileGridViewProps {
  folderId: string | null;
}

export function FileGridView() {
  const parentRef = useRef<HTMLDivElement>(null);

  // Mocking 10,000 files to demonstrate virtualization
  const mockFiles = Array.from({ length: 10000 }).map((_, i) => ({
    id: `file-${i}`,
    title: `Asset_File_${i}.png`,
    size: "2.4 MB",
    type: "image"
  }));

  // Setup grid virtualization (e.g., 4 columns)
  const columns = 4;
  const rowCount = Math.ceil(mockFiles.length / columns);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // height of a grid row
    overscan: 2,
  });

  return (
    <div 
      ref={parentRef}
      className="h-full w-full overflow-auto"
    >
      <div
        className="w-full relative"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columns;
          const rowFiles = mockFiles.slice(startIndex, startIndex + columns);
          
          return (
            <div
              key={virtualRow.key}
              className="absolute top-0 left-0 w-full flex gap-4 px-2"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {rowFiles.map(file => (
                <div key={file.id} className="flex-1 bg-white border shadow-sm rounded-lg p-3 flex flex-col hover:border-blue-400 cursor-pointer transition-colors max-w-[calc(25%-0.75rem)] h-[180px]">
                  <div className="flex-1 bg-slate-100 rounded mb-3 flex items-center justify-center text-slate-400">
                    [Preview]
                  </div>
                  <div className="text-sm font-medium text-slate-800 truncate" title={file.title}>
                    {file.title}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex justify-between">
                    <span>{file.type}</span>
                    <span>{file.size}</span>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
