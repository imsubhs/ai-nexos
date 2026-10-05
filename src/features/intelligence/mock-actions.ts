/**
 * Executive Intelligence Demo / Mock Actions.
 * Backed by demo store for offline development and test walkthroughs.
 */

import { DEMO_ORG_ID } from "@/lib/demo/store";
import type {
  ActionQueueItemDto,
  ExecutiveIntelligenceDto,
  ExecutivePulseDto,
  RiskItemDto,
} from "./types";

export async function getExecutiveIntelligence(
  timeWindow: "7d" | "30d" | "90d" = "30d",
): Promise<ExecutiveIntelligenceDto> {
  const now = new Date();

  return {
    pulse: {
      activeProjects: 6,
      projectsAtRisk: 2,
      projectsOnTrack: 4,
      projectsOverdue: 1,
      activeDeliverables: 14,
      deliverablesAwaitingClientReview: 3,
      deliverablesRequiringChanges: 2,
      pendingApprovals: 3,
      overdueDeliverables: 1,
      openTasks: 38,
      overdueTasks: 4,
      activeClients: 5,
    },
    health: {
      overallScore: 78,
      overallLevel: "HEALTHY",
      summary:
        "Operations are stable with minor items requiring managerial review.",
      projectHealth: {
        score: 67,
        level: "AT_RISK",
        statusText: "AT RISK",
        reasons: [
          "1 active project is past estimated completion date.",
          "1 additional project marked delayed.",
          "4 of 6 active projects (67%) are proceeding on track.",
        ],
      },
      deliveryHealth: {
        score: 75,
        level: "HEALTHY",
        statusText: "HEALTHY",
        reasons: [
          "1 deliverable has passed review SLA target date.",
          "2 deliverables currently require revision updates following client feedback.",
        ],
      },
      clientReviewHealth: {
        score: 85,
        level: "HEALTHY",
        statusText: "HEALTHY",
        reasons: [
          "3 items currently in client review awaiting sign-off.",
          "All pending reviews are within standard response windows.",
        ],
      },
      taskExecutionHealth: {
        score: 89,
        level: "HEALTHY",
        statusText: "HEALTHY",
        reasons: [
          "4 of 38 open tasks (11%) are past due date.",
          "34 open tasks are on schedule.",
        ],
      },
    },
    actionQueue: [
      {
        id: "mock-action-1",
        priority: "CRITICAL",
        category: "OVERDUE",
        title: "Overdue Project: Nexus Brand Revamp",
        reason:
          "Estimated completion date lapsed 3 days ago with 2 deliverables pending.",
        context: "NEX-2026-004 · PM: Sarah Chen",
        recommendedAction: "Review Project Timeline",
        navigationTarget: "/projects",
      },
      {
        id: "mock-action-2",
        priority: "HIGH",
        category: "APPROVAL",
        title: "Client Review Pending: Keynote 3D Hero Animation",
        reason: "Deliverable has been awaiting Acme Corp review for 4 days.",
        context: "Deliverable · Updated 4 days ago",
        recommendedAction: "Send Approver Reminder",
        navigationTarget: "/deliverables",
      },
      {
        id: "mock-action-3",
        priority: "HIGH",
        category: "DEADLINE",
        title: "Revision Requested: Cybernetic Soundscape Pack",
        reason:
          "Client feedback received; creative director requested vocal stem tweak.",
        context: "Deliverable Revisions",
        recommendedAction: "Review Client Changes",
        navigationTarget: "/deliverables",
      },
      {
        id: "mock-action-4",
        priority: "MEDIUM",
        category: "WORKLOAD",
        title: "Unassigned Critical Task: Final Color Grade Export",
        reason: "Critical priority task has no assigned team member.",
        context: "AIC-T-2026-008 · Due in 24 hours",
        recommendedAction: "Assign Team Member",
        navigationTarget: "/tasks",
      },
    ],
    risks: [
      {
        id: "mock-risk-1",
        severity: "CRITICAL",
        entityType: "PROJECT",
        entityId: "mock-p1",
        entityTitle: "NEX-2026-004 · Nexus Brand Revamp",
        explanation:
          "Project is overdue by 3 days with 5 tasks remaining incomplete.",
        detectedAt: now.toISOString(),
        recommendedAction:
          "Review task allocation and realign delivery milestone dates.",
        navigationTarget: "/projects",
      },
      {
        id: "mock-risk-2",
        severity: "HIGH",
        entityType: "DELIVERABLE",
        entityId: "mock-d1",
        entityTitle: "Keynote 3D Hero Animation",
        explanation:
          "Review session deadline passed 28 hours ago without client sign-off.",
        detectedAt: now.toISOString(),
        recommendedAction:
          "Follow up with client approver or re-issue review reminder.",
        navigationTarget: "/deliverables",
      },
      {
        id: "mock-risk-3",
        severity: "HIGH",
        entityType: "DELIVERABLE",
        entityId: "mock-d2",
        entityTitle: "Product Launch Pitch Deck v3",
        explanation:
          "Deliverable has undergone 3 revision cycles with further changes requested.",
        detectedAt: now.toISOString(),
        recommendedAction:
          "Convene creative alignment sync with client stakeholder.",
        navigationTarget: "/deliverables",
      },
    ],
    delivery: {
      deliverablesCompleted: 18,
      deliverablesOverdue: 1,
      onTimeDeliveryRate: 89,
      onTimeDeliveryStatusText: "16 of 18 on schedule",
      averageRevisionCycles: 1.3,
      averageRevisionStatusText: "1.3 cycles per deliverable",
      approvalTurnaroundHours: 32,
      approvalTurnaroundStatusText: "32h avg client review",
      revisionFrequencyRate: 28,
      changeRequestCount: 2,
    },
    clients: {
      clients: [
        {
          clientId: "mock-c1",
          clientName: "Acme Corporation",
          industry: "Technology",
          activeProjectsCount: 2,
          pendingApprovalsCount: 2,
          revisionRequestsCount: 1,
          overdueClientActionsCount: 1,
          healthStatus: "at_risk",
          attentionFlags: ["1 overdue review", "Approval bottleneck"],
          lastActivityAt: now.toISOString(),
        },
        {
          clientId: "mock-c2",
          clientName: "Starlight Media",
          industry: "Entertainment",
          activeProjectsCount: 2,
          pendingApprovalsCount: 1,
          revisionRequestsCount: 1,
          overdueClientActionsCount: 0,
          healthStatus: "good",
          attentionFlags: [],
          lastActivityAt: now.toISOString(),
        },
        {
          clientId: "mock-c3",
          clientName: "Apex Retailers",
          industry: "E-Commerce",
          activeProjectsCount: 1,
          pendingApprovalsCount: 0,
          revisionRequestsCount: 0,
          overdueClientActionsCount: 0,
          healthStatus: "good",
          attentionFlags: [],
          lastActivityAt: now.toISOString(),
        },
      ],
      bottleneckClientsCount: 1,
    },
    projects: {
      projects: [
        {
          projectId: "mock-p1",
          projectName: "Nexus Brand Revamp",
          projectCode: "NEX-2026-004",
          clientName: "Acme Corporation",
          status: "in_progress",
          healthStatus: "delayed",
          completionPercentage: 65,
          dueDate: new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString(),
          isOverdue: true,
          openTasksCount: 5,
          overdueTasksCount: 2,
          openDeliverablesCount: 2,
          pendingReviewsCount: 1,
          revisionRequestsCount: 1,
          latestActivityAt: now.toISOString(),
          urgencyScore: 85,
          keyIssues: ["Project deadline has lapsed", "2 tasks overdue"],
        },
        {
          projectId: "mock-p2",
          projectName: "Global Launch Commercial",
          projectCode: "NEX-2026-001",
          clientName: "Starlight Media",
          status: "in_progress",
          healthStatus: "on_track",
          completionPercentage: 80,
          dueDate: new Date(
            now.getTime() + 12 * 24 * 3600 * 1000,
          ).toISOString(),
          isOverdue: false,
          openTasksCount: 8,
          overdueTasksCount: 0,
          openDeliverablesCount: 3,
          pendingReviewsCount: 1,
          revisionRequestsCount: 0,
          latestActivityAt: now.toISOString(),
          urgencyScore: 25,
          keyIssues: [],
        },
      ],
      criticalCount: 1,
      atRiskCount: 1,
      overdueCount: 1,
      healthyCount: 4,
    },
    workload: {
      totalTeamMembers: 8,
      activeAssigneesCount: 6,
      unassignedTasksCount: 3,
      capacitySignal: "Workload is evenly distributed across team members.",
      isConcentrated: false,
      distribution: [
        {
          userId: "mock-u1",
          name: "Alex Rivera",
          email: "alex@nexos.ai",
          designation: "Senior 3D Artist",
          avatarUrl: null,
          openTasksCount: 9,
          overdueTasksCount: 1,
          inProgressTasksCount: 3,
          taskSharePercentage: 24,
        },
        {
          userId: "mock-u2",
          name: "Maya Patel",
          email: "maya@nexos.ai",
          designation: "Lead Motion Designer",
          avatarUrl: null,
          openTasksCount: 8,
          overdueTasksCount: 1,
          inProgressTasksCount: 2,
          taskSharePercentage: 21,
        },
      ],
    },
    activity: [
      {
        id: "act-1",
        timestamp: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
        actorName: "Sarah Chen",
        entityType: "DELIVERABLE",
        entityTitle: "Keynote 3D Hero Animation",
        action: "revision_requested",
        description: "Client requested revision with 2 annotations",
        navigationTarget: "/deliverables",
      },
      {
        id: "act-2",
        timestamp: new Date(now.getTime() - 1000 * 60 * 120).toISOString(),
        actorName: "Alex Rivera",
        entityType: "TASK",
        entityTitle: "Rough Cut Sequence Edit",
        action: "status_changed",
        description: "Task marked as ready for QA",
        navigationTarget: "/tasks",
      },
    ],
    trends: {
      timeWindow,
      deliveryVolumeTrend: {
        metricName: "New Deliverables",
        hasSufficientData: true,
        statusText: "14 total in window",
        currentValue: 14,
        previousValue: null,
        changePercentage: 12,
        points: [
          { date: "2026-09-28", label: "9/28", value: 2 },
          { date: "2026-10-01", label: "10/1", value: 4 },
          { date: "2026-10-04", label: "10/4", value: 3 },
        ],
      },
      onTimeTrend: {
        metricName: "On-Time Compliance",
        hasSufficientData: true,
        statusText: "Tracking delivery compliance",
        currentValue: 89,
        previousValue: 85,
        changePercentage: 4,
        points: [],
      },
      revisionTrend: {
        metricName: "Revisions Created",
        hasSufficientData: true,
        statusText: "5 revision requests",
        currentValue: 5,
        previousValue: null,
        changePercentage: null,
        points: [
          { date: "2026-09-28", label: "9/28", value: 1 },
          { date: "2026-10-01", label: "10/1", value: 2 },
          { date: "2026-10-04", label: "10/4", value: 2 },
        ],
      },
      taskCompletionTrend: {
        metricName: "Tasks Completed",
        hasSufficientData: true,
        statusText: "24 tasks finished",
        currentValue: 24,
        previousValue: null,
        changePercentage: 15,
        points: [
          { date: "2026-09-28", label: "9/28", value: 6 },
          { date: "2026-10-01", label: "10/1", value: 8 },
          { date: "2026-10-04", label: "10/4", value: 10 },
        ],
      },
    },
    generatedAt: now.toISOString(),
    organizationId: DEMO_ORG_ID,
    organizationName: "AI NEX OS Studio",
  };
}

export async function getExecutiveRisks(): Promise<RiskItemDto[]> {
  const full = await getExecutiveIntelligence();
  return full.risks;
}

export async function getExecutiveAttentionQueue(): Promise<
  ActionQueueItemDto[]
> {
  const full = await getExecutiveIntelligence();
  return full.actionQueue;
}

export async function getExecutivePulse(): Promise<ExecutivePulseDto> {
  const full = await getExecutiveIntelligence();
  return full.pulse;
}
