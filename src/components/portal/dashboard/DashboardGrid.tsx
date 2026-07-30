"use client";

import type { PortalDashboardView } from "@/lib/portal/services/PortalServiceLayer";

export function DashboardGrid({ data }: { data: PortalDashboardView }) {
  // V1 Constraints: Fixed Grid, supports visibility & ordering, NO drag and drop.

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-2 text-lg font-medium">Pending Approvals</h3>
        <p className="text-3xl font-bold text-blue-600">
          {data.pendingApprovals?.length || 0}
        </p>
        <p className="mt-1 text-sm text-gray-500">Requires your attention</p>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-2 text-lg font-medium">Recent Deliverables</h3>
        <p className="text-3xl font-bold text-green-600">
          {data.recentDeliverables?.length || 0}
        </p>
        <p className="mt-1 text-sm text-gray-500">Available for review</p>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-2 text-lg font-medium">Upcoming Meetings</h3>
        <p className="text-3xl font-bold text-purple-600">
          {data.upcomingMeetings?.length || 0}
        </p>
        <p className="mt-1 text-sm text-gray-500">Scheduled for this week</p>
      </div>
    </div>
  );
}
