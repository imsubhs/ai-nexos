import { DashboardGrid } from "@/components/portal/dashboard/DashboardGrid";
import { UnifiedTimeline } from "@/components/portal/dashboard/UnifiedTimeline";
import { PortalServiceLayer } from "@/lib/portal/services/PortalServiceLayer";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Mock auth context
  const organizationId = "mock-org-id";
  const clientId = "mock-client-id";

  const dashboardData = await PortalServiceLayer.getDashboardView(organizationId, clientId);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
      
      <DashboardGrid data={dashboardData} />
      
      <div className="mt-8">
        <h3 className="text-2xl font-semibold mb-4">Activity Timeline</h3>
        <UnifiedTimeline events={dashboardData.unifiedTimeline} />
      </div>
    </div>
  );
}
