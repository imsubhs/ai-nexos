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
    type: "image",
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
    <div ref={parentRef} className="h-full w-full overflow-auto">
      <div
        className="relative w-full"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columns;
          const rowFiles = mockFiles.slice(startIndex, startIndex + columns);

          return (
            <div
              key={virtualRow.key}
              className="absolute top-0 left-0 flex w-full gap-4 px-2"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {rowFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex h-[180px] max-w-[calc(25%-0.75rem)] flex-1 cursor-pointer flex-col rounded-lg border bg-white p-3 shadow-sm transition-colors hover:border-blue-400"
                >
                  <div className="mb-3 flex flex-1 items-center justify-center rounded bg-slate-100 text-slate-400">
                    [Preview]
                  </div>
                  <div
                    className="truncate text-sm font-medium text-slate-800"
                    title={file.title}
                  >
                    {file.title}
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-slate-500">
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
