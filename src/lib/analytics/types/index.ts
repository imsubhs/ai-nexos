export type AnalyticsScope = {
  organizationId: string;
  projectId?: string;
  clientId?: string;
  teamId?: string;
  departmentId?: string;
};

export type ReportExecutionState =
  "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED" | "EXPIRED";

export interface KPIDefinition {
  id: string;
  name: string;
  description: string;
  formulaVersion: string;
  effectiveDate: string; // ISO 8601 Date
  isHistoricalCompatible: boolean;
  targetThreshold?: number;
  warningThreshold?: number;
}

export interface AnalyticsSnapshot {
  id: string;
  scope: AnalyticsScope;
  kpiId: string;
  value: number;
  dimensions: Record<string, string | number | boolean>;
  timestamp: string; // ISO 8601 Date
  period: "HOURLY" | "DAILY" | "MONTHLY";
  // Immutable marker - enforced in logic
  _immutable: true;
}

export interface AnalyticsProjection {
  id: string;
  scope: AnalyticsScope;
  modelType: string;
  data: Record<string, unknown>;
  lastUpdated: string;
}

export type ExportFormat = "CSV" | "EXCEL" | "PDF" | "JSON";

export interface ExportPolicy {
  maxRows: number;
  allowedFormats: ExportFormat[];
  requiresWatermark: boolean;
  retentionDays: number;
}

export interface ExportJob {
  id: string;
  requestedBy: string;
  scope: AnalyticsScope;
  format: ExportFormat;
  status: ReportExecutionState;
  policyApplied: ExportPolicy;
  downloadUrl?: string;
  expiresAt: string;
  createdAt: string;
}

export interface ChartAbstraction {
  type: "BAR" | "LINE" | "PIE" | "HEATMAP" | "TIMELINE" | "TABLE" | "CARD";
  data: unknown[];
  xAxisKey?: string;
  seriesKeys: string[];
  options?: Record<string, unknown>;
}

export interface WidgetContext {
  widgetId: string;
  dashboardId: string;
  scope: AnalyticsScope;
  dateRange: {
    start: string;
    end: string;
  };
  filters: Record<string, unknown>;
}

export interface WidgetResult {
  widgetId: string;
  status: "SUCCESS" | "ERROR";
  data?: ChartAbstraction;
  error?: string;
  executedAt: string;
}
