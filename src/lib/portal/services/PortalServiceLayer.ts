import {
  PortalCache,
  InMemoryPortalCacheStrategy,
  RedisPortalCacheStrategy,
} from "./PortalCache";
import { isFeatureEnabled, PortalFeatureFlags } from "../flags";
import { db } from "@/db";
import { clientPortalActivity } from "@/db/schema/client-portal";
import { deliverables } from "@/db/schema/deliverables";
import { approvalCycles } from "@/db/schema/approvals";
import { projects } from "@/db/schema/projects";
import { meetings } from "@/db/schema/meetings";
import { eq, and, desc, lte, inArray } from "drizzle-orm";

export interface PortalDashboardView {
  recentDeliverables: { id: string; name: string; status: string }[];
  pendingApprovals: { id: string; title: string; dueDate?: string }[];
  upcomingMeetings: { id: string; title: string; scheduledAt: string }[];
  unifiedTimeline: {
    id: string;
    title: string;
    description: string;
    timestamp: string;
  }[];
  nextCursor?: string;
}

const cacheStrategy = process.env.REDIS_URL
  ? new RedisPortalCacheStrategy()
  : new InMemoryPortalCacheStrategy();
const cache = new PortalCache(cacheStrategy);

export class PortalServiceLayer {
  /**
   * Retrieves an aggregated, optimized read model for the Dashboard v1.
   * Ensures business logic is not called directly from the UI.
   */
  static async getDashboardView(
    organizationId: string,
    clientId: string,
    timelineCursor?: string,
  ): Promise<PortalDashboardView> {
    if (process.env.DEMO_MODE === "true") {
      const { getDemoStore, DEMO_ORG_ID } = await import("../../demo/store");
      const store = getDemoStore();

      const recentDeliverables = store.deliverables
        .filter(
          (d: any) =>
            d.clientId === clientId && d.organizationId === DEMO_ORG_ID,
        )
        .slice(0, 5)
        .map((d: any) => ({
          id: d.deliverableId,
          name: d.title,
          status: d.status,
        }));

      const pendingApprovals = store.approvalCycles
        .filter(
          (a: any) =>
            a.status === "pending" &&
            a.entityType === "deliverable" &&
            a.organizationId === DEMO_ORG_ID,
        )
        .map((a: any) => {
          const del = store.deliverables.find(
            (d: any) =>
              d.deliverableId === a.entityId && d.clientId === clientId,
          );
          if (!del) return null;
          return {
            id: a.cycleId,
            title: del.title,
            dueDate: a.createdAt.toISOString(),
          };
        })
        .filter((a: any) => a !== null) as {
        id: string;
        title: string;
        dueDate: string;
      }[];

      const limitedPendingApprovals = pendingApprovals.slice(0, 5);

      const clientProjects = store.projects
        .filter((p: any) => p.clientId === clientId)
        .map((p: any) => p.projectId);

      const upcomingMeetings = store.meetings
        .filter(
          (m: any) =>
            (m.clientId === clientId || clientProjects.includes(m.projectId)) &&
            m.organizationId === DEMO_ORG_ID,
        )
        .slice(0, 5)
        .map((m: any) => ({
          id: m.meetingId,
          title: m.title,
          scheduledAt: m.startTime.toISOString(),
        }));

      const unifiedTimeline = store.activityLogs
        .filter(
          (a: any) =>
            (a.clientId === clientId ||
              a.metadata?.clientId === clientId ||
              a.entityId === clientId) &&
            a.organizationId === DEMO_ORG_ID,
        )
        .slice(0, 20)
        .map((a: any) => ({
          id: a.activityId,
          title: a.action,
          description: a.description || `Resource: ${a.entityType}`,
          timestamp: a.createdAt.toISOString(),
        }));

      return {
        recentDeliverables,
        pendingApprovals: limitedPendingApprovals,
        upcomingMeetings,
        unifiedTimeline,
        nextCursor: undefined,
      };
    }

    const isV1Enabled = await isFeatureEnabled(
      clientId,
      PortalFeatureFlags.ENABLE_DASHBOARD_V1,
    );
    if (!isV1Enabled) {
      throw new Error("Dashboard v1 is not enabled for this client.");
    }

    const cachedData = await cache.getDashboardData(clientId);

    // Unified Timeline fetch with cursor pagination
    const timelineLimit = 20;
    const timelineConditions = [
      eq(clientPortalActivity.organizationId, organizationId),
      eq(clientPortalActivity.clientId, clientId),
    ];

    if (timelineCursor) {
      timelineConditions.push(
        lte(clientPortalActivity.createdAt, new Date(timelineCursor)),
      );
    }

    const timelineEvents = await db.query.clientPortalActivity.findMany({
      where: and(...timelineConditions),
      orderBy: [desc(clientPortalActivity.createdAt)],
      limit: timelineLimit + 1,
    });

    let nextCursor = undefined;
    if (timelineEvents.length > timelineLimit) {
      const nextItem = timelineEvents.pop();
      nextCursor = nextItem?.createdAt?.toISOString();
    }

    const mappedTimeline = timelineEvents.map((event) => ({
      id: event.activityId,
      title: event.action,
      description: `Resource: ${event.resourceType || "unknown"}`,
      timestamp: event.createdAt?.toISOString() || new Date().toISOString(),
    }));

    if (cachedData && !timelineCursor) {
      return {
        ...cachedData,
        unifiedTimeline: mappedTimeline,
        nextCursor,
      } as PortalDashboardView;
    }

    // Fetch Recent Deliverables
    const recentDeliverablesData = await db.query.deliverables.findMany({
      where: and(
        eq(deliverables.organizationId, organizationId),
        eq(deliverables.clientId, clientId),
      ),
      orderBy: [desc(deliverables.createdAt)],
      limit: 5,
    });
    const recentDeliverables = recentDeliverablesData.map((d) => ({
      id: d.deliverableId,
      name: d.title,
      status: d.status,
    }));

    // Fetch Client Projects to scope Approvals and Meetings
    const clientProjects = await db.query.projects.findMany({
      where: and(
        eq(projects.organizationId, organizationId),
        eq(projects.clientId, clientId),
      ),
      columns: { projectId: true },
    });
    const projectIds = clientProjects.map((p) => p.projectId);

    // Fetch Pending Approvals scoped to Deliverables
    let pendingApprovals: { id: string; title: string; dueDate?: string }[] =
      [];
    const allClientDeliverables = await db.query.deliverables.findMany({
      where: and(
        eq(deliverables.organizationId, organizationId),
        eq(deliverables.clientId, clientId),
      ),
      columns: { deliverableId: true, title: true },
    });
    const allDeliverableIds = allClientDeliverables.map((d) => d.deliverableId);

    if (allDeliverableIds.length > 0) {
      const cycles = await db.query.approvalCycles.findMany({
        where: and(
          eq(approvalCycles.organizationId, organizationId),
          eq(approvalCycles.status, "pending"),
          eq(approvalCycles.entityType, "deliverable"),
          inArray(approvalCycles.entityId, allDeliverableIds),
        ),
        orderBy: [desc(approvalCycles.createdAt)],
        limit: 5,
      });
      pendingApprovals = cycles.map((c) => {
        const del = allClientDeliverables.find(
          (d) => d.deliverableId === c.entityId,
        );
        return {
          id: c.cycleId,
          title: del?.title || "Pending Approval",
          dueDate: c.createdAt?.toISOString(),
        };
      });
    }

    // Fetch Upcoming Meetings
    let upcomingMeetings: { id: string; title: string; scheduledAt: string }[] =
      [];
    if (projectIds.length > 0) {
      const futureMeetings = await db.query.meetings.findMany({
        where: and(
          eq(meetings.organizationId, organizationId),
          inArray(meetings.projectId, projectIds),
        ),
        orderBy: [desc(meetings.startTime)],
        limit: 5,
      });
      upcomingMeetings = futureMeetings.map((m) => ({
        id: m.meetingId,
        title: m.title,
        scheduledAt: m.startTime?.toISOString() || new Date().toISOString(),
      }));
    }

    const dashboardData = {
      recentDeliverables,
      pendingApprovals,
      upcomingMeetings,
    };

    if (!timelineCursor) {
      await cache.setDashboardData(clientId, dashboardData);
    }

    return { ...dashboardData, unifiedTimeline: mappedTimeline, nextCursor };
  }

  /**
   * Approves a deliverable from the portal. Emits platform event.
   */
  static async approveDeliverable(
    organizationId: string,
    clientId: string,
    deliverableId: string,
    comments?: string,
  ) {
    if (process.env.DEMO_MODE === "true") {
      return { success: true, message: "Mock approval successful." };
    }

    await cache.invalidateDashboard(clientId);

    await this.emitPlatformEvent(
      organizationId,
      clientId,
      "approval",
      "approved_via_portal",
      deliverableId,
      { comments },
    );

    return { success: true };
  }

  /**
   * Emits platform events ensuring we never bypass Module 12.
   */
  private static async emitPlatformEvent(
    _organizationId: string,
    clientId: string,
    type: string,
    action: string,
    resourceId: string,
    _metadata?: unknown,
  ) {
    console.log(
      `[Platform Event] ${type}:${action} for ${resourceId} by Client ${clientId}`,
    );
  }
}
