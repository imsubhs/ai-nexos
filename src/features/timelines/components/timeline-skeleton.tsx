import React from "react";

export function TimelineSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="h-6 w-48 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 w-32 bg-gray-100 rounded"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-20 bg-gray-100 rounded-md"></div>
          <div className="h-8 w-20 bg-gray-100 rounded-md"></div>
        </div>
      </div>

      {/* Main View Area (Gantt Skeleton) */}
      <div className="w-full border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-[250px_1fr] border-b border-gray-200 bg-gray-50 h-12"></div>
        
        {/* Rows */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i}>
            <div className="grid grid-cols-[250px_1fr] border-b border-gray-100 bg-gray-50 h-10">
              <div className="p-3 pl-4">
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
              </div>
            </div>
            {[1, 2].map((j) => (
              <div key={j} className="grid grid-cols-[250px_1fr] border-b border-gray-50 h-12 items-center">
                <div className="p-3 pl-8">
                  <div className="h-4 w-32 bg-gray-100 rounded"></div>
                </div>
                <div className="p-3">
                  <div className="h-6 bg-blue-100 rounded-md shadow-sm" style={{ width: `${Math.random() * 40 + 10}%`, marginLeft: `${Math.random() * 20}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
