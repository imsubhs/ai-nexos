import { DashboardGrid } from "@/components/portal/dashboard/DashboardGrid";
import { UnifiedTimeline } from "@/components/portal/dashboard/UnifiedTimeline";
import { PortalServiceLayer } from "@/lib/portal/services/PortalServiceLayer";
import { isDemoMode } from "@/lib/env.server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Mock auth context for Demo
  const organizationId = isDemoMode()
    ? "00000000-0000-4000-8000-00000000f001"
    : "mock-org-id";
  const clientId = isDemoMode()
    ? "00000000-0000-4000-8000-000000000101"
    : "mock-client-id";

  const dashboardData = await PortalServiceLayer.getDashboardView(
    organizationId,
    clientId,
  );

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Overview</h2>

      <DashboardGrid data={dashboardData} />

      <div className="mt-8">
        <h3 className="mb-4 text-2xl font-semibold">Activity Timeline</h3>
        <UnifiedTimeline events={dashboardData.unifiedTimeline} />
      </div>
    </div>
  );
}
