"use client";

import type { PortalDashboardView } from "@/lib/portal/services/PortalServiceLayer";

export function UnifiedTimeline({
  events,
}: {
  events: PortalDashboardView["unifiedTimeline"];
}) {
  // Constraint #5: Unified Activity Timeline aggregating events from existing modules
  if (!events || events.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <p className="text-gray-500">No recent activity.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event, i) => (
        <div
          key={i}
          className="flex gap-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="flex-none">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              •
            </div>
          </div>
          <div>
            <p className="font-medium">{event.title}</p>
            <p className="text-sm text-gray-500">{event.description}</p>
            <p className="mt-1 text-xs text-gray-400">
              {new Date(event.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
