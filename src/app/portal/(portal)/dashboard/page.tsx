import { ShieldCheck } from "lucide-react";
import { DashboardGrid } from "@/components/portal/dashboard/DashboardGrid";
import { UnifiedTimeline } from "@/components/portal/dashboard/UnifiedTimeline";
import { PortalServiceLayer } from "@/lib/portal/services/PortalServiceLayer";
import { getPortalContext } from "@/lib/portal/context";

export const dynamic = "force-dynamic";

/**
 * The client portal's dashboard.
 *
 * Outside demo mode this page previously read with the literals
 * `"mock-org-id"` and `"mock-client-id"` and checked no session at all, on a
 * route the proxy deliberately serves without authentication. The tenant now
 * comes from `getPortalContext()`, which derives it from the server-side
 * session row and accepts nothing from the request.
 *
 * No session means no read: the guard returns before `PortalServiceLayer` is
 * called, rather than calling it with a placeholder tenant.
 */
export default async function DashboardPage() {
  const context = await getPortalContext();

  if (!context) {
    return <NoActiveSession />;
  }

  const dashboardData = await PortalServiceLayer.getDashboardView(
    context.organizationId,
    context.clientId,
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

/**
 * One state for every rejection — no session, expired, revoked, unknown token.
 *
 * Naming which applied would let an external visitor probe for the difference,
 * and the person holding a working link never sees this at all.
 */
function NoActiveSession() {
  return (
    <div className="flex min-h-[50svh] flex-col items-center justify-center gap-4 text-center">
      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
        <ShieldCheck className="text-muted-foreground size-6" />
      </div>
      <h2 className="text-lg font-semibold tracking-tight">
        This portal session is not active
      </h2>
      <p className="text-muted-foreground max-w-sm text-sm text-balance">
        Open the secure link you were sent to start a session. If it has
        expired, ask your project contact for a new one.
      </p>
    </div>
  );
}
