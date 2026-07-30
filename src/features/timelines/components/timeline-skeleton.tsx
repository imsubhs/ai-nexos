import React from "react";

export function TimelineSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 h-6 w-48 rounded bg-gray-200"></div>
          <div className="h-4 w-32 rounded bg-gray-100"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-20 rounded-md bg-gray-100"></div>
          <div className="h-8 w-20 rounded-md bg-gray-100"></div>
        </div>
      </div>

      {/* Main View Area (Gantt Skeleton) */}
      <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="grid h-12 grid-cols-[250px_1fr] border-b border-gray-200 bg-gray-50"></div>

        {/* Rows */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i}>
            <div className="grid h-10 grid-cols-[250px_1fr] border-b border-gray-100 bg-gray-50">
              <div className="p-3 pl-4">
                <div className="h-4 w-24 rounded bg-gray-200"></div>
              </div>
            </div>
            {[1, 2].map((j) => (
              <div
                key={j}
                className="grid h-12 grid-cols-[250px_1fr] items-center border-b border-gray-50"
              >
                <div className="p-3 pl-8">
                  <div className="h-4 w-32 rounded bg-gray-100"></div>
                </div>
                <div className="p-3">
                  <div
                    className="h-6 rounded-md bg-blue-100 shadow-sm"
                    style={{
                      width: `${Math.random() * 40 + 10}%`,
                      marginLeft: `${Math.random() * 20}%`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
