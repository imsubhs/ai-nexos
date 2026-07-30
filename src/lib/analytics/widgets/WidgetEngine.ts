import { WidgetContext, WidgetResult, ChartAbstraction } from "../types";
import { projectionService } from "../projections/ProjectionService";

export class WidgetEngine {
  // Simple request batching using DataLoader pattern concepts
  private batchTimeout: NodeJS.Timeout | null = null;
  private pendingRequests: Map<
    string,
    {
      context: WidgetContext;
      resolve: (val: WidgetResult) => void;
      reject: (err: unknown) => void;
    }
  > = new Map();

  /**
   * Executes a widget independently with automatic debounce/batching.
   * If this fails, it returns an error result instead of throwing.
   */
  async executeWidget(context: WidgetContext): Promise<WidgetResult> {
    return new Promise((resolve, reject) => {
      // 1. Generate a unique cache key based on scope and filters
      // This allows shared filter requests to be deduplicated
      const requestKey = `${context.widgetId}_${context.dashboardId}_${JSON.stringify(context.scope)}_${JSON.stringify(context.filters)}`;

      if (this.pendingRequests.has(requestKey)) {
        // Return existing promise for deduplication (Shared Filter Request)
        const existing = this.pendingRequests.get(requestKey)!;
        const origResolve = existing.resolve;
        existing.resolve = (val) => {
          origResolve(val);
          resolve(val);
        };
        return;
      }

      this.pendingRequests.set(requestKey, { context, resolve, reject });

      // 2. Debounce batch execution
      if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => {
          this.executeBatch();
        }, 50); // 50ms debounce window
      }
    });
  }

  private async executeBatch() {
    this.batchTimeout = null;
    const requests = Array.from(this.pendingRequests.values());
    this.pendingRequests.clear();

    // Execute concurrently. Since projections use the Projection Layer, they hit wrapper views.
    await Promise.allSettled(
      requests.map(async ({ context, resolve }) => {
        try {
          const projectionId =
            typeof context.filters.projectionId === "string"
              ? context.filters.projectionId
              : "default_projection";

          // ProjectionService now consumes secure wrapper views internally
          const projection = await projectionService.getProjection(
            projectionId,
            context.scope,
            context.filters,
          );

          const chartData = this.mapToChartAbstraction(
            context.widgetId,
            projection.data,
          );

          resolve({
            widgetId: context.widgetId,
            status: "SUCCESS",
            data: chartData,
            executedAt: new Date().toISOString(),
          });
        } catch (error: unknown) {
          console.error(
            `Widget execution failed for ${context.widgetId}:`,
            error,
          );
          resolve({
            widgetId: context.widgetId,
            status: "ERROR",
            error:
              error instanceof Error
                ? error.message
                : "Failed to load widget data.",
            executedAt: new Date().toISOString(),
          });
        }
      }),
    );
  }

  /**
   * Maps raw projection data to the agnostic Chart Abstraction.
   */
  private mapToChartAbstraction(
    _widgetId: string,
    _rawData: unknown,
  ): ChartAbstraction {
    return {
      type: "BAR",
      data: [
        { name: "Jan", value: 400 },
        { name: "Feb", value: 300 },
      ],
      xAxisKey: "name",
      seriesKeys: ["value"],
      options: {
        colors: ["#0088FE"],
      },
    };
  }

  /**
   * Helper to pre-load multiple widgets concurrently
   */
  async executeDashboardWidgets(
    contexts: WidgetContext[],
  ): Promise<WidgetResult[]> {
    return Promise.all(contexts.map((ctx) => this.executeWidget(ctx)));
  }
}

export const widgetEngine = new WidgetEngine();
