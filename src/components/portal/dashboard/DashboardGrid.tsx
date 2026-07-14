"use client";

interface DashboardGridProps {
  data: any; 
}

export function DashboardGrid({ data }: DashboardGridProps) {
  // V1 Constraints: Fixed Grid, supports visibility & ordering, NO drag and drop.
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-medium mb-2">Pending Approvals</h3>
        <p className="text-3xl font-bold text-blue-600">{data.pendingApprovals?.length || 0}</p>
        <p className="text-sm text-gray-500 mt-1">Requires your attention</p>
      </div>

      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-medium mb-2">Recent Deliverables</h3>
        <p className="text-3xl font-bold text-green-600">{data.recentDeliverables?.length || 0}</p>
        <p className="text-sm text-gray-500 mt-1">Available for review</p>
      </div>

      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-medium mb-2">Upcoming Meetings</h3>
        <p className="text-3xl font-bold text-purple-600">{data.upcomingMeetings?.length || 0}</p>
        <p className="text-sm text-gray-500 mt-1">Scheduled for this week</p>
      </div>
    </div>
  );
}
