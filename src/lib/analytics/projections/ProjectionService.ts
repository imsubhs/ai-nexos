import { AnalyticsScope, AnalyticsProjection } from "../types";

export class ProjectionService {
  /**
   * Fetches a projection by ID. Dashboards use this instead of querying read models directly.
   */
  async getProjection(
    projectionId: string,
    scope: AnalyticsScope,
    _filters?: Record<string, unknown>,
  ): Promise<AnalyticsProjection> {
    // 1. Validate Scope
    if (!scope.organizationId) {
      throw new Error("Organization ID is required to fetch projections.");
    }

    // 2. Fetch Projection Data (mocked for now)
    // This layer abstracts the actual query against the Read Models or Materialized Views.
    const projection: AnalyticsProjection = {
      id: projectionId,
      scope,
      modelType: "AGGREGATED_METRICS",
      data: {
        // Mock data
        value: 0,
        trends: [],
      },
      lastUpdated: new Date().toISOString(),
    };

    // 3. Apply Filters
    // In reality, filters are pushed down to the database query.

    return projection;
  }

  /**
   * Fetches multiple projections for a dashboard layout.
   */
  async getProjectionsBatch(
    projectionIds: string[],
    scope: AnalyticsScope,
    filters?: Record<string, unknown>,
  ): Promise<Record<string, AnalyticsProjection>> {
    const results: Record<string, AnalyticsProjection> = {};

    // Simulate parallel independent execution
    await Promise.allSettled(
      projectionIds.map(async (id) => {
        try {
          results[id] = await this.getProjection(id, scope, filters);
        } catch (error) {
          // If one fails, it doesn't fail the batch. Handled independently by widgets.
          console.error(`Failed to fetch projection ${id}:`, error);
        }
      }),
    );

    return results;
  }
}

export const projectionService = new ProjectionService();
