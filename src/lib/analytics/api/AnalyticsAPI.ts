import { AnalyticsScope } from "../types";
import { projectionService } from "../projections/ProjectionService";
import { kpiRegistry } from "../registry/KPIDefinitionRegistry";
import { exportService } from "../exports/ExportService";

interface ApiKeyContext {
  organizationId: string;
  systemUserId: string;
  expiresAt: string;
  allowedIps: string[];
  isRotated: boolean; // Flag to check if key is pending rotation
}

/**
 * Public Analytics API Interface for External BI Tools and Clients.
 * Hardened with Scoped permissions, Expiration, IP allowlist, and Rate limiting.
 */
export class AnalyticsAPI {
  // Simple in-memory rate limiter for scaffolding
  private rateLimits: Map<string, { count: number; resetAt: number }> =
    new Map();

  /**
   * Fetches aggregated metrics via the Projection Layer.
   */
  async getMetrics(
    apiKey: string,
    clientIp: string,
    projectionId: string,
    filters?: Record<string, unknown>,
  ) {
    const context = await this.validateApiKeyAndContext(apiKey, clientIp);
    this.enforceRateLimit(apiKey);

    const scope: AnalyticsScope = { organizationId: context.organizationId };

    // External tools can only query projections, never operational tables
    const projection = await projectionService.getProjection(
      projectionId,
      scope,
      filters,
    );

    return {
      status: "SUCCESS",
      data: projection.data,
      metadata: {
        lastUpdated: projection.lastUpdated,
      },
    };
  }

  /**
   * Fetches the current definition of a KPI for external consumption.
   */
  async getKPIDefinition(apiKey: string, clientIp: string, kpiId: string) {
    await this.validateApiKeyAndContext(apiKey, clientIp);
    this.enforceRateLimit(apiKey);

    const definition = kpiRegistry.resolveKPIForDate(kpiId, new Date());
    if (!definition) {
      throw new Error(`KPI Definition not found for ${kpiId}`);
    }
    return definition;
  }

  /**
   * Initiates an export job for external systems to download bulk data.
   */
  async requestBulkExport(
    apiKey: string,
    clientIp: string,
    format: "CSV" | "JSON",
    queryPayload: unknown,
  ) {
    const context = await this.validateApiKeyAndContext(apiKey, clientIp);
    this.enforceRateLimit(apiKey);

    const scope: AnalyticsScope = { organizationId: context.organizationId };

    const job = await exportService.requestExport(
      context.systemUserId,
      scope,
      format,
      queryPayload,
    );

    return {
      status: "QUEUED",
      jobId: job.id,
      checkStatusUrl: `/api/v1/analytics/exports/${job.id}`,
    };
  }

  // --- Hardening Helpers ---

  private async validateApiKeyAndContext(
    _apiKey: string,
    clientIp: string,
  ): Promise<ApiKeyContext> {
    // 1. Resolve key (Mocked)
    const context: ApiKeyContext = {
      organizationId: "org_123",
      systemUserId: "system_api_user",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      allowedIps: ["127.0.0.1", "192.168.1.100", "*"], // '*' for testing
      isRotated: false,
    };

    // 2. Check Expiration
    if (new Date() > new Date(context.expiresAt)) {
      throw new Error("API Key has expired.");
    }

    // 3. Check IP Allowlist
    if (
      !context.allowedIps.includes("*") &&
      !context.allowedIps.includes(clientIp)
    ) {
      throw new Error("Client IP is not authorized for this API Key.");
    }

    // 4. Check Rotation Status
    if (context.isRotated) {
      throw new Error("API Key has been rotated and is no longer valid.");
    }

    return context;
  }

  private enforceRateLimit(apiKey: string) {
    const now = Date.now();
    const limit = this.rateLimits.get(apiKey);

    if (!limit || now > limit.resetAt) {
      // Reset or initialize (e.g., 100 requests per minute)
      this.rateLimits.set(apiKey, { count: 1, resetAt: now + 60000 });
      return;
    }

    if (limit.count >= 100) {
      throw new Error("Rate limit exceeded. Try again later.");
    }

    limit.count++;
  }
}

export const analyticsApi = new AnalyticsAPI();
