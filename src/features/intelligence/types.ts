/**
 * Executive Intelligence Domain Transfer Objects (DTOs) & Types.
 * Phase 4H — Executive Decision-Support Layer.
 *
 * Strict Server-Side Isolation:
 * These DTOs project only sanitized, operational signals needed for executive decisions.
 * Sensitive internals (salaries, storage credentials, share tokens, raw auth records)
 * are NEVER exposed.
 */

export interface ExecutivePulseDto {
  activeProjects: number;
  projectsAtRisk: number;
  projectsOnTrack: number;
  projectsOverdue: number;
  activeDeliverables: number;
  deliverablesAwaitingClientReview: number;
  deliverablesRequiringChanges: number;
  pendingApprovals: number;
  overdueDeliverables: number;
  openTasks: number;
  overdueTasks: number;
  activeClients: number;
}

export type HealthScoreLevel = "EXCELLENT" | "HEALTHY" | "AT_RISK" | "CRITICAL";

export interface HealthDimensionDto {
  score: number; // 0 - 100
  level: HealthScoreLevel;
  statusText: string;
  reasons: string[];
}

export interface ExecutiveHealthDto {
  overallScore: number;
  overallLevel: HealthScoreLevel;
  summary: string;
  projectHealth: HealthDimensionDto;
  deliveryHealth: HealthDimensionDto;
  clientReviewHealth: HealthDimensionDto;
  taskExecutionHealth: HealthDimensionDto;
}

export type RiskSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type RiskEntityType =
  | "PROJECT"
  | "DELIVERABLE"
  | "TASK"
  | "CLIENT"
  | "MILESTONE";

export interface RiskItemDto {
  id: string;
  severity: RiskSeverity;
  entityType: RiskEntityType;
  entityId: string;
  entityTitle: string;
  explanation: string;
  detectedAt: string; // ISO string
  recommendedAction: string;
  navigationTarget: string;
}

export interface DeliveryIntelligenceDto {
  deliverablesCompleted: number;
  deliverablesOverdue: number;
  onTimeDeliveryRate: number | null; // e.g. 87.5% or null
  onTimeDeliveryStatusText: string;
  averageRevisionCycles: number | null; // e.g. 1.4 or null
  averageRevisionStatusText: string;
  approvalTurnaroundHours: number | null; // e.g. 28.4h or null
  approvalTurnaroundStatusText: string;
  revisionFrequencyRate: number | null; // e.g. 33.3% or null
  changeRequestCount: number;
}

export interface ClientIntelligenceItemDto {
  clientId: string;
  clientName: string;
  industry: string | null;
  activeProjectsCount: number;
  pendingApprovalsCount: number;
  revisionRequestsCount: number;
  overdueClientActionsCount: number;
  healthStatus: "good" | "at_risk" | "critical";
  attentionFlags: string[];
  lastActivityAt: string | null;
}

export interface ClientIntelligenceDto {
  clients: ClientIntelligenceItemDto[];
  bottleneckClientsCount: number;
}

export interface ProjectIntelligenceItemDto {
  projectId: string;
  projectName: string;
  projectCode: string;
  clientName: string | null;
  status: string;
  healthStatus: string;
  completionPercentage: number;
  dueDate: string | null;
  isOverdue: boolean;
  openTasksCount: number;
  overdueTasksCount: number;
  openDeliverablesCount: number;
  pendingReviewsCount: number;
  revisionRequestsCount: number;
  latestActivityAt: string | null;
  urgencyScore: number;
  keyIssues: string[];
}

export interface ProjectIntelligenceDto {
  projects: ProjectIntelligenceItemDto[];
  criticalCount: number;
  atRiskCount: number;
  overdueCount: number;
  healthyCount: number;
}

export interface TeamMemberWorkloadDto {
  userId: string;
  name: string;
  email: string;
  designation: string | null;
  avatarUrl: string | null;
  openTasksCount: number;
  overdueTasksCount: number;
  inProgressTasksCount: number;
  taskSharePercentage: number;
}

export interface WorkloadIntelligenceDto {
  totalTeamMembers: number;
  activeAssigneesCount: number;
  unassignedTasksCount: number;
  capacitySignal: string;
  isConcentrated: boolean;
  distribution: TeamMemberWorkloadDto[];
}

export interface ExecutiveActivityItemDto {
  id: string;
  timestamp: string;
  actorName: string;
  entityType: string;
  entityTitle: string;
  action: string;
  description: string;
  navigationTarget: string | null;
}

export interface TrendDataPointDto {
  date: string;
  label: string;
  value: number;
}

export interface TrendSeriesDto {
  metricName: string;
  hasSufficientData: boolean;
  statusText?: string;
  currentValue: number;
  previousValue: number | null;
  changePercentage: number | null;
  points: TrendDataPointDto[];
}

export interface TrendIntelligenceDto {
  timeWindow: "7d" | "30d" | "90d";
  deliveryVolumeTrend: TrendSeriesDto;
  onTimeTrend: TrendSeriesDto;
  revisionTrend: TrendSeriesDto;
  taskCompletionTrend: TrendSeriesDto;
}

export interface ActionQueueItemDto {
  id: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM";
  category: "OVERDUE" | "DEADLINE" | "APPROVAL" | "WORKLOAD" | "CLIENT";
  title: string;
  reason: string;
  context: string;
  recommendedAction: string;
  navigationTarget: string;
}

export interface ExecutiveIntelligenceDto {
  pulse: ExecutivePulseDto;
  health: ExecutiveHealthDto;
  actionQueue: ActionQueueItemDto[];
  risks: RiskItemDto[];
  delivery: DeliveryIntelligenceDto;
  clients: ClientIntelligenceDto;
  projects: ProjectIntelligenceDto;
  workload: WorkloadIntelligenceDto;
  activity: ExecutiveActivityItemDto[];
  trends: TrendIntelligenceDto;
  generatedAt: string;
  organizationId: string;
  organizationName: string;
}
