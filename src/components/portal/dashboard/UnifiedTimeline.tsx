"use client";

interface UnifiedTimelineProps {
  events: any[];
}

export function UnifiedTimeline({ events }: UnifiedTimelineProps) {
  // Constraint #5: Unified Activity Timeline aggregating events from existing modules
  if (!events || events.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <p className="text-gray-500">No recent activity.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event, i) => (
        <div key={i} className="flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex-none">
             <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                •
             </div>
          </div>
          <div>
            <p className="font-medium">{event.title}</p>
            <p className="text-sm text-gray-500">{event.description}</p>
            <p className="text-xs text-gray-400 mt-1">{new Date(event.timestamp).toLocaleString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
