import { NextResponse } from 'next/server';
import { PortalServiceLayer } from '@/lib/portal/services/PortalServiceLayer';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // 1. Authenticate Portal Session (Dedicated external store)
    // const session = await getPortalSession(request);
    // if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    // Mock authentication variables for architecture scaffolding
    const organizationId = "mock-org-id";
    const clientId = "mock-client-id";

    // 2. Fetch Dashboard data via Service Layer
    const dashboardData = await PortalServiceLayer.getDashboardView(organizationId, clientId);

    return NextResponse.json({ success: true, data: dashboardData });
  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
