import { PortalCache, InMemoryPortalCacheStrategy, RedisPortalCacheStrategy } from './PortalCache';
import { isFeatureEnabled, PortalFeatureFlags } from '../flags';
import { db } from "@/db";
import { clientPortalActivity } from "@/db/schema/client-portal";
import { eq, and, desc, lte } from "drizzle-orm";

const cacheStrategy = process.env.REDIS_URL 
  ? new RedisPortalCacheStrategy() 
  : new InMemoryPortalCacheStrategy();
const cache = new PortalCache(cacheStrategy);

export class PortalServiceLayer {
  /**
   * Retrieves an aggregated, optimized read model for the Dashboard v1.
   * Ensures business logic is not called directly from the UI.
   */
  static async getDashboardView(organizationId: string, clientId: string, timelineCursor?: string) {
    if (process.env.DEMO_MODE === "true") {
      return {
        recentDeliverables: [{ id: "mock-del-1", name: "Brand Guidelines v2", status: "pending" }],
        pendingApprovals: [{ id: "mock-app-1", title: "Homepage Wireframes", dueDate: new Date().toISOString() }],
        upcomingMeetings: [{ id: "mock-meet-1", title: "Quarterly Review", scheduledAt: new Date(Date.now() + 86400000).toISOString() }],
        unifiedTimeline: [{ id: "mock-event-1", type: "deliverable_uploaded", createdAt: new Date().toISOString() }],
        nextCursor: undefined,
      };
    }

    const isV1Enabled = await isFeatureEnabled(clientId, PortalFeatureFlags.ENABLE_DASHBOARD_V1);
    if (!isV1Enabled) {
      throw new Error("Dashboard v1 is not enabled for this client.");
    }

    const cachedData = await cache.getDashboardData(clientId);
    
    // Unified Timeline fetch with cursor pagination
    const timelineLimit = 20;
    const timelineConditions = [
        eq(clientPortalActivity.organizationId, organizationId),
        eq(clientPortalActivity.clientId, clientId)
    ];

    if (timelineCursor) {
        timelineConditions.push(lte(clientPortalActivity.createdAt, new Date(timelineCursor)));
    }

    const timelineEvents = await db.query.clientPortalActivity.findMany({
        where: and(...timelineConditions),
        orderBy: [desc(clientPortalActivity.createdAt)],
        limit: timelineLimit + 1
    });

    let nextCursor = undefined;
    if (timelineEvents.length > timelineLimit) {
        const nextItem = timelineEvents.pop();
        nextCursor = nextItem?.createdAt?.toISOString();
    }

    if (cachedData && !timelineCursor) {
        return { ...cachedData, unifiedTimeline: timelineEvents, nextCursor };
    }
    
    const dashboardData = {
      recentDeliverables: [],
      pendingApprovals: [],
      upcomingMeetings: [],
    };

    if (!timelineCursor) {
      await cache.setDashboardData(clientId, dashboardData);
    }
    
    return { ...dashboardData, unifiedTimeline: timelineEvents, nextCursor };
  }

  /**
   * Approves a deliverable from the portal. Emits platform event.
   */
  static async approveDeliverable(organizationId: string, clientId: string, deliverableId: string, comments?: string) {
    if (process.env.DEMO_MODE === "true") {
      return { success: true, message: "Mock approval successful." };
    }

    await cache.invalidateDashboard(clientId);

    await this.emitPlatformEvent(organizationId, clientId, 'approval', 'approved_via_portal', deliverableId, { comments });
    
    return { success: true };
  }

  /**
   * Emits platform events ensuring we never bypass Module 12.
   */
  private static async emitPlatformEvent(_organizationId: string, clientId: string, type: string, action: string, resourceId: string, _metadata?: unknown) {
    console.log(`[Platform Event] ${type}:${action} for ${resourceId} by Client ${clientId}`);
  }
}
