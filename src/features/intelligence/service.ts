/**
 * Executive Intelligence Service Layer.
 * Phase 4H — Executive Decision-Support Layer.
 *
 * Principles:
 * 1. ZERO duplicated state — aggregates directly from operational tables.
 * 2. Strict Tenant Isolation — every query binds organizationId from caller's session.
 * 3. Explainability over opaque AI scoring — deterministic rules with human-readable rationale.
 * 4. Safe mathematical metrics — explicit edge case handling (empty sets, null dates).
 * 5. Production Performance — batch-loaded relational aggregates, avoiding N+1 loops.
 */

import { db } from "@/db";
import {
  projects,
  clients,
  deliverables,
  deliverableRevisions,
  deliverableReviewSessions,
  deliverableApprovals,
  deliverableActivity,
  tasks,
  taskAssignees,
  users,
  activityLogs,
  milestones,
} from "@/db/schema";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type {
  ActionQueueItemDto,
  ClientIntelligenceDto,
  ClientIntelligenceItemDto,
  DeliveryIntelligenceDto,
  ExecutiveActivityItemDto,
  ExecutiveHealthDto,
  ExecutiveIntelligenceDto,
  ExecutivePulseDto,
  HealthDimensionDto,
  HealthScoreLevel,
  ProjectIntelligenceDto,
  ProjectIntelligenceItemDto,
  RiskItemDto,
  RiskSeverity,
  TeamMemberWorkloadDto,
  TrendDataPointDto,
  TrendIntelligenceDto,
  TrendSeriesDto,
  WorkloadIntelligenceDto,
} from "./types";

export interface ComputeContext {
  organizationId: string;
  organizationName: string;
  now?: Date;
  timeWindow?: "7d" | "30d" | "90d";
}

/**
 * Fetch and compute full executive intelligence for an organization.
 */
export async function computeExecutiveIntelligence(
  ctx: ComputeContext,
): Promise<ExecutiveIntelligenceDto> {
  const orgId = ctx.organizationId;
  const now = ctx.now ?? new Date();
  const timeWindow = ctx.timeWindow ?? "30d";

  // 1. Concurrently fetch all core operational datasets scoped strictly by organizationId
  const [
    orgProjects,
    orgClients,
    orgDeliverables,
    orgRevisions,
    orgReviewSessions,
    orgApprovals,
    orgTasks,
    orgAssignees,
    orgUsers,
    orgActivityLogs,
    orgDeliverableActivity,
    orgMilestones,
  ] = await Promise.all([
    // Active & recent projects
    db.query.projects.findMany({
      where: and(
        eq(projects.organizationId, orgId),
        isNull(projects.deletedAt),
      ),
      with: {
        client: true,
        manager: true,
      },
      orderBy: [desc(projects.createdAt)],
    }),
    // Active clients
    db.query.clients.findMany({
      where: and(eq(clients.organizationId, orgId), isNull(clients.deletedAt)),
      orderBy: [desc(clients.createdAt)],
    }),
    // Deliverables
    db.query.deliverables.findMany({
      where: and(
        eq(deliverables.organizationId, orgId),
        isNull(deliverables.deletedAt),
      ),
      orderBy: [desc(deliverables.createdAt)],
    }),
    // Deliverable Revisions
    db.query.deliverableRevisions.findMany({
      where: and(
        eq(deliverableRevisions.organizationId, orgId),
        isNull(deliverableRevisions.deletedAt),
      ),
      orderBy: [desc(deliverableRevisions.createdAt)],
    }),
    // Review Sessions
    db.query.deliverableReviewSessions.findMany({
      where: and(
        eq(deliverableReviewSessions.organizationId, orgId),
        isNull(deliverableReviewSessions.deletedAt),
      ),
      orderBy: [desc(deliverableReviewSessions.createdAt)],
    }),
    // Approvals
    db.query.deliverableApprovals.findMany({
      where: and(
        eq(deliverableApprovals.organizationId, orgId),
        isNull(deliverableApprovals.deletedAt),
      ),
      orderBy: [desc(deliverableApprovals.createdAt)],
    }),
    // Open & active tasks
    db.query.tasks.findMany({
      where: and(eq(tasks.organizationId, orgId), isNull(tasks.deletedAt)),
      orderBy: [desc(tasks.createdAt)],
    }),
    // Task assignees
    db.query.taskAssignees.findMany({
      where: and(
        eq(taskAssignees.organizationId, orgId),
        isNull(taskAssignees.deletedAt),
      ),
    }),
    // Users in organization
    db.query.users.findMany({
      where: and(
        eq(users.organizationId, orgId),
        eq(users.status, "active"),
        isNull(users.deletedAt),
      ),
    }),
    // Recent activity logs
    db.query.activityLogs.findMany({
      where: eq(activityLogs.organizationId, orgId),
      orderBy: [desc(activityLogs.createdAt)],
      limit: 100,
    }),
    // Deliverable activity
    db.query.deliverableActivity.findMany({
      where: and(
        eq(deliverableActivity.organizationId, orgId),
        isNull(deliverableActivity.deletedAt),
      ),
      orderBy: [desc(deliverableActivity.createdAt)],
      limit: 100,
    }),
    // Milestones
    db.query.milestones.findMany({
      where: and(
        eq(milestones.organizationId, orgId),
        isNull(milestones.deletedAt),
      ),
    }),
  ]);

  // Indexing maps for O(1) correlation
  const clientMap = new Map(orgClients.map((c) => [c.clientId, c]));
  const userMap = new Map(orgUsers.map((u) => [u.userId, u]));
  const projectMap = new Map(orgProjects.map((p) => [p.projectId, p]));
  const deliverableMap = new Map(
    orgDeliverables.map((d) => [d.deliverableId, d]),
  );

  // Tasks by project
  const tasksByProject = new Map<string, typeof orgTasks>();
  for (const t of orgTasks) {
    const list = tasksByProject.get(t.projectId) ?? [];
    list.push(t);
    tasksByProject.set(t.projectId, list);
  }

  // Deliverables by project
  const deliverablesByProject = new Map<string, typeof orgDeliverables>();
  for (const d of orgDeliverables) {
    const list = deliverablesByProject.get(d.projectId) ?? [];
    list.push(d);
    deliverablesByProject.set(d.projectId, list);
  }

  // Revisions by deliverable
  const revisionsByDeliverable = new Map<string, typeof orgRevisions>();
  for (const r of orgRevisions) {
    const list = revisionsByDeliverable.get(r.deliverableId) ?? [];
    list.push(r);
    revisionsByDeliverable.set(r.deliverableId, list);
  }

  // Review sessions by deliverable
  const sessionsByDeliverable = new Map<string, typeof orgReviewSessions>();
  for (const s of orgReviewSessions) {
    const list = sessionsByDeliverable.get(s.deliverableId) ?? [];
    list.push(s);
    sessionsByDeliverable.set(s.deliverableId, list);
  }

  // Assignees by task
  const assigneesByTask = new Map<string, string[]>();
  for (const a of orgAssignees) {
    const list = assigneesByTask.get(a.taskId) ?? [];
    list.push(a.userId);
    assigneesByTask.set(a.taskId, list);
  }

  // Tasks by user
  const tasksByUser = new Map<string, typeof orgTasks>();
  for (const a of orgAssignees) {
    const task = orgTasks.find((t) => t.taskId === a.taskId);
    if (task && task.status !== "completed" && task.status !== "cancelled") {
      const list = tasksByUser.get(a.userId) ?? [];
      list.push(task);
      tasksByUser.set(a.userId, list);
    }
  }

  // -------------------------------------------------------------
  // LAYER 1: EXECUTIVE PULSE
  // -------------------------------------------------------------
  const activeProjectStatuses = [
    "planning",
    "research",
    "brief_received",
    "in_progress",
    "internal_review",
    "client_review",
    "revision",
  ];

  const activeProjects = orgProjects.filter((p) =>
    activeProjectStatuses.includes(p.status),
  );

  const projectsOverdue = activeProjects.filter(
    (p) =>
      p.estimatedEndDate &&
      new Date(p.estimatedEndDate).getTime() < now.getTime(),
  ).length;

  const projectsAtRisk = activeProjects.filter((p) => {
    const isExplicitlyAtRisk =
      p.healthStatus === "at_risk" ||
      p.healthStatus === "delayed" ||
      p.healthStatus === "blocked";
    const isOverdue =
      p.estimatedEndDate &&
      new Date(p.estimatedEndDate).getTime() < now.getTime();
    return isExplicitlyAtRisk || isOverdue;
  }).length;

  const projectsOnTrack = Math.max(0, activeProjects.length - projectsAtRisk);

  const activeDeliverableStatuses = [
    "draft",
    "preparing",
    "internal_review",
    "creative_review",
    "qa",
    "ready_for_client",
    "client_review",
    "revision_requested",
  ];

  const activeDeliverablesList = orgDeliverables.filter((d) =>
    activeDeliverableStatuses.includes(d.status),
  );

  const deliverablesAwaitingClientReview = orgDeliverables.filter((d) =>
    ["ready_for_client", "client_review"].includes(d.status),
  ).length;

  const deliverablesRequiringChanges = orgDeliverables.filter(
    (d) => d.status === "revision_requested",
  ).length;

  // Pending approvals: sessions in review or deliverables awaiting sign-off
  const pendingApprovals = orgReviewSessions.filter(
    (s) => s.status === "client_review" || s.status === "preparing",
  ).length;

  // Overdue deliverables: active deliverables where review deadline < now or parent project is overdue
  const overdueDeliverables = activeDeliverablesList.filter((d) => {
    const sessions = sessionsByDeliverable.get(d.deliverableId) ?? [];
    const activeSession = sessions.find(
      (s) => s.status === "client_review" || s.status === "preparing",
    );
    if (
      activeSession?.deadlineAt &&
      new Date(activeSession.deadlineAt).getTime() < now.getTime()
    ) {
      return true;
    }
    const parentProject = projectMap.get(d.projectId);
    if (
      parentProject?.estimatedEndDate &&
      new Date(parentProject.estimatedEndDate).getTime() < now.getTime()
    ) {
      return true;
    }
    return false;
  }).length;

  const openTasksList = orgTasks.filter(
    (t) =>
      t.status !== "completed" &&
      t.status !== "cancelled" &&
      t.status !== "archived",
  );

  const overdueTasks = openTasksList.filter(
    (t) => t.dueDate && new Date(t.dueDate).getTime() < now.getTime(),
  ).length;

  const activeClients = orgClients.filter((c) => c.status === "active").length;

  const pulse: ExecutivePulseDto = {
    activeProjects: activeProjects.length,
    projectsAtRisk,
    projectsOnTrack,
    projectsOverdue,
    activeDeliverables: activeDeliverablesList.length,
    deliverablesAwaitingClientReview,
    deliverablesRequiringChanges,
    pendingApprovals,
    overdueDeliverables,
    openTasks: openTasksList.length,
    overdueTasks,
    activeClients,
  };

  // -------------------------------------------------------------
  // LAYER 2: EXECUTIVE HEALTH (Deterministic & Explainable)
  // -------------------------------------------------------------
  // 1. Project Health
  const projectReasons: string[] = [];
  let projectScore = 100;
  if (activeProjects.length === 0) {
    projectScore = 100;
    projectReasons.push("No active projects currently in execution.");
  } else {
    const atRiskRatio = projectsAtRisk / activeProjects.length;
    projectScore = Math.max(0, Math.round((1 - atRiskRatio) * 100));
    if (projectsOverdue > 0) {
      projectReasons.push(
        `${projectsOverdue} active ${projectsOverdue === 1 ? "project is" : "projects are"} past estimated completion date.`,
      );
    }
    if (projectsAtRisk > 0 && projectsAtRisk > projectsOverdue) {
      projectReasons.push(
        `${projectsAtRisk - projectsOverdue} additional project(s) marked at-risk or delayed.`,
      );
    }
    if (projectScore >= 85) {
      projectReasons.push(
        `${projectsOnTrack} of ${activeProjects.length} active projects (${Math.round((projectsOnTrack / activeProjects.length) * 100)}%) are proceeding on track.`,
      );
    }
  }

  // 2. Delivery Health
  const deliveryReasons: string[] = [];
  let deliveryScore = 100;
  if (activeDeliverablesList.length === 0) {
    deliveryScore = 100;
    deliveryReasons.push("No active deliverables in progress.");
  } else {
    let penalty = 0;
    if (overdueDeliverables > 0) {
      const overduePenalty = Math.min(
        40,
        Math.round((overdueDeliverables / activeDeliverablesList.length) * 50),
      );
      penalty += overduePenalty;
      deliveryReasons.push(
        `${overdueDeliverables} deliverable(s) have passed review SLA or project target dates.`,
      );
    }
    if (deliverablesRequiringChanges > 0) {
      const revisionPenalty = Math.min(
        30,
        Math.round(
          (deliverablesRequiringChanges / activeDeliverablesList.length) * 35,
        ),
      );
      penalty += revisionPenalty;
      deliveryReasons.push(
        `${deliverablesRequiringChanges} deliverable(s) currently require revision updates following client feedback.`,
      );
    }
    deliveryScore = Math.max(0, 100 - penalty);
    if (deliveryScore >= 80) {
      deliveryReasons.push(
        "Delivery pipeline is moving with healthy client turnaround.",
      );
    }
  }

  // 3. Client Review Health
  const clientReviewReasons: string[] = [];
  let clientReviewScore = 100;
  if (deliverablesAwaitingClientReview === 0) {
    clientReviewScore = 100;
    clientReviewReasons.push(
      "Zero pending client reviews currently blocking the pipeline.",
    );
  } else {
    // Check if any review has been pending for > 72 hours
    const longPending = activeDeliverablesList.filter((d) => {
      if (!["ready_for_client", "client_review"].includes(d.status))
        return false;
      const ageHours =
        (now.getTime() - new Date(d.updatedAt).getTime()) / (1000 * 3600);
      return ageHours > 72;
    }).length;

    let reviewPenalty = 0;
    if (longPending > 0) {
      reviewPenalty += Math.min(45, longPending * 15);
      clientReviewReasons.push(
        `${longPending} deliverable review(s) pending client action for over 72 hours.`,
      );
    }
    if (deliverablesAwaitingClientReview > 5) {
      reviewPenalty += 15;
      clientReviewReasons.push(
        `High review backlog: ${deliverablesAwaitingClientReview} items currently awaiting sign-off.`,
      );
    }
    clientReviewScore = Math.max(0, 100 - reviewPenalty);
    if (longPending === 0) {
      clientReviewReasons.push(
        `All ${deliverablesAwaitingClientReview} pending client reviews are within standard response windows.`,
      );
    }
  }

  // 4. Task Execution Health
  const taskReasons: string[] = [];
  let taskScore = 100;
  if (openTasksList.length === 0) {
    taskScore = 100;
    taskReasons.push("No open tasks currently in queue.");
  } else {
    const overdueRatio = overdueTasks / openTasksList.length;
    taskScore = Math.max(0, Math.round((1 - overdueRatio) * 100));
    if (overdueTasks > 0) {
      taskReasons.push(
        `${overdueTasks} of ${openTasksList.length} open tasks (${Math.round(overdueRatio * 100)}%) are past due date.`,
      );
    } else {
      taskReasons.push(
        `All ${openTasksList.length} open tasks are scheduled on or ahead of time.`,
      );
    }
  }

  // Helper to map score to level
  const scoreToLevel = (score: number): HealthScoreLevel => {
    if (score >= 90) return "EXCELLENT";
    if (score >= 75) return "HEALTHY";
    if (score >= 50) return "AT_RISK";
    return "CRITICAL";
  };

  const projectHealth: HealthDimensionDto = {
    score: projectScore,
    level: scoreToLevel(projectScore),
    statusText: scoreToLevel(projectScore).replace("_", " "),
    reasons: projectReasons,
  };

  const deliveryHealth: HealthDimensionDto = {
    score: deliveryScore,
    level: scoreToLevel(deliveryScore),
    statusText: scoreToLevel(deliveryScore).replace("_", " "),
    reasons: deliveryReasons,
  };

  const clientReviewHealth: HealthDimensionDto = {
    score: clientReviewScore,
    level: scoreToLevel(clientReviewScore),
    statusText: scoreToLevel(clientReviewScore).replace("_", " "),
    reasons: clientReviewReasons,
  };

  const taskExecutionHealth: HealthDimensionDto = {
    score: taskScore,
    level: scoreToLevel(taskScore),
    statusText: scoreToLevel(taskScore).replace("_", " "),
    reasons: taskReasons,
  };

  // Weighted overall: 30% Project, 30% Delivery, 20% Review, 20% Task
  const overallScore = Math.round(
    projectScore * 0.3 +
      deliveryScore * 0.3 +
      clientReviewScore * 0.2 +
      taskScore * 0.2,
  );
  const overallLevel = scoreToLevel(overallScore);

  let summary = "Operational velocity is optimal across all departments.";
  if (overallLevel === "CRITICAL") {
    summary =
      "Critical operational delays detected requiring immediate executive intervention.";
  } else if (overallLevel === "AT_RISK") {
    summary =
      "Execution friction identified in project timelines and delivery SLAs.";
  } else if (overallLevel === "HEALTHY") {
    summary =
      "Operations are stable with minor items requiring managerial review.";
  }

  const health: ExecutiveHealthDto = {
    overallScore,
    overallLevel,
    summary,
    projectHealth,
    deliveryHealth,
    clientReviewHealth,
    taskExecutionHealth,
  };

  // -------------------------------------------------------------
  // LAYER 3: RISK RADAR (Prioritized Items Requiring Intervention)
  // -------------------------------------------------------------
  const risks: RiskItemDto[] = [];

  // R1: Overdue Projects (CRITICAL)
  for (const p of activeProjects) {
    if (
      p.estimatedEndDate &&
      new Date(p.estimatedEndDate).getTime() < now.getTime()
    ) {
      const daysOverdue = Math.ceil(
        (now.getTime() - new Date(p.estimatedEndDate).getTime()) /
          (1000 * 3600 * 24),
      );
      const projTasks = tasksByProject.get(p.projectId) ?? [];
      const openProjTasks = projTasks.filter(
        (t) => t.status !== "completed" && t.status !== "cancelled",
      );

      risks.push({
        id: `risk-proj-overdue-${p.projectId}`,
        severity: "CRITICAL",
        entityType: "PROJECT",
        entityId: p.projectId,
        entityTitle: `${p.projectCode} · ${p.projectName}`,
        explanation: `Project is overdue by ${daysOverdue} day(s) with ${openProjTasks.length} task(s) remaining incomplete.`,
        detectedAt: now.toISOString(),
        recommendedAction:
          "Review task allocation and realign delivery milestone dates.",
        navigationTarget: `/projects/${p.projectId}`,
      });
    }
  }

  // R2: Imminent Project Deadline with Low Progress (HIGH)
  for (const p of activeProjects) {
    if (
      p.estimatedEndDate &&
      new Date(p.estimatedEndDate).getTime() >= now.getTime() &&
      new Date(p.estimatedEndDate).getTime() <=
        now.getTime() + 3 * 24 * 3600 * 1000
    ) {
      const completion = p.completionPercentage ?? 0;
      if (completion < 75) {
        risks.push({
          id: `risk-proj-imminent-${p.projectId}`,
          severity: "HIGH",
          entityType: "PROJECT",
          entityId: p.projectId,
          entityTitle: `${p.projectCode} · ${p.projectName}`,
          explanation: `Final deadline is within 3 days but project is only ${completion}% complete.`,
          detectedAt: now.toISOString(),
          recommendedAction:
            "Expedite remaining deliverables and assess scope compression.",
          navigationTarget: `/projects/${p.projectId}`,
        });
      }
    }
  }

  // R3: Overdue Deliverable Review Deadlines (HIGH)
  for (const d of activeDeliverablesList) {
    const sessions = sessionsByDeliverable.get(d.deliverableId) ?? [];
    const overdueSession = sessions.find(
      (s) =>
        (s.status === "client_review" || s.status === "preparing") &&
        s.deadlineAt &&
        new Date(s.deadlineAt).getTime() < now.getTime(),
    );
    if (overdueSession && overdueSession.deadlineAt) {
      const hoursLate = Math.round(
        (now.getTime() - new Date(overdueSession.deadlineAt).getTime()) /
          (1000 * 3600),
      );
      risks.push({
        id: `risk-del-overdue-${d.deliverableId}`,
        severity: "HIGH",
        entityType: "DELIVERABLE",
        entityId: d.deliverableId,
        entityTitle: d.title,
        explanation: `Review session deadline passed ${hoursLate} hour(s) ago without sign-off.`,
        detectedAt: now.toISOString(),
        recommendedAction:
          "Follow up with client approver or re-issue review reminder.",
        navigationTarget: `/deliverables/${d.deliverableId}`,
      });
    }
  }

  // R4: Repeated Revision Requests (HIGH)
  for (const d of activeDeliverablesList) {
    const revs = revisionsByDeliverable.get(d.deliverableId) ?? [];
    if (revs.length >= 3 && d.status === "revision_requested") {
      risks.push({
        id: `risk-del-revisions-${d.deliverableId}`,
        severity: "HIGH",
        entityType: "DELIVERABLE",
        entityId: d.deliverableId,
        entityTitle: d.title,
        explanation: `Deliverable has undergone ${revs.length} revision cycles with further changes requested.`,
        detectedAt: now.toISOString(),
        recommendedAction:
          "Convene creative alignment sync with client stakeholder.",
        navigationTarget: `/deliverables/${d.deliverableId}`,
      });
    }
  }

  // R5: Overdue Critical/High Tasks (MEDIUM / HIGH)
  for (const t of openTasksList) {
    if (
      t.dueDate &&
      new Date(t.dueDate).getTime() < now.getTime() &&
      (t.priority === "critical" || t.priority === "high")
    ) {
      risks.push({
        id: `risk-task-overdue-${t.taskId}`,
        severity: t.priority === "critical" ? "HIGH" : "MEDIUM",
        entityType: "TASK",
        entityId: t.taskId,
        entityTitle: `${t.taskCode} · ${t.name}`,
        explanation: `${t.priority.toUpperCase()} priority task is overdue since ${new Date(t.dueDate).toLocaleDateString()}.`,
        detectedAt: now.toISOString(),
        recommendedAction: "Reassign or escalate task blocker.",
        navigationTarget: `/tasks`,
      });
    }
  }

  // R6: Unassigned Critical/High Tasks (MEDIUM)
  for (const t of openTasksList) {
    if (
      (t.priority === "critical" || t.priority === "high") &&
      (!assigneesByTask.get(t.taskId) ||
        assigneesByTask.get(t.taskId)!.length === 0)
    ) {
      risks.push({
        id: `risk-task-unassigned-${t.taskId}`,
        severity: "MEDIUM",
        entityType: "TASK",
        entityId: t.taskId,
        entityTitle: `${t.taskCode} · ${t.name}`,
        explanation: `${t.priority.toUpperCase()} priority task is currently unassigned.`,
        detectedAt: now.toISOString(),
        recommendedAction: "Assign task owner to prevent production lag.",
        navigationTarget: `/tasks`,
      });
    }
  }

  // R7: Client with Multiple Delayed Projects (HIGH)
  for (const c of orgClients) {
    const clientProjects = orgProjects.filter(
      (p) =>
        p.clientId === c.clientId && activeProjectStatuses.includes(p.status),
    );
    const clientOverdueProjects = clientProjects.filter(
      (p) =>
        p.estimatedEndDate &&
        new Date(p.estimatedEndDate).getTime() < now.getTime(),
    );
    if (clientOverdueProjects.length >= 2 || c.clientHealth === "critical") {
      risks.push({
        id: `risk-client-${c.clientId}`,
        severity: "HIGH",
        entityType: "CLIENT",
        entityId: c.clientId,
        entityTitle: c.companyName,
        explanation: `Client account has ${clientOverdueProjects.length} overdue project(s) and critical relationship status.`,
        detectedAt: now.toISOString(),
        recommendedAction:
          "Schedule executive account review with account manager.",
        navigationTarget: `/clients/${c.clientId}`,
      });
    }
  }

  // Sort risks: CRITICAL > HIGH > MEDIUM > LOW
  const severityRank: Record<RiskSeverity, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };
  risks.sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);

  // -------------------------------------------------------------
  // LAYER 10: "WHAT NEEDS MY ATTENTION?" (Executive Action Queue)
  // -------------------------------------------------------------
  const actionQueue: ActionQueueItemDto[] = [];

  // 1. Immediate Project Interventions
  for (const p of activeProjects) {
    if (
      p.estimatedEndDate &&
      new Date(p.estimatedEndDate).getTime() < now.getTime()
    ) {
      actionQueue.push({
        id: `action-proj-${p.projectId}`,
        priority: "CRITICAL",
        category: "OVERDUE",
        title: `Overdue Project: ${p.projectName}`,
        reason:
          "Estimated completion date has lapsed with active deliverables in flight.",
        context: `${p.projectCode} · PM: ${p.manager?.firstName ?? "Unassigned"}`,
        recommendedAction: "Review Project Timeline",
        navigationTarget: `/projects/${p.projectId}`,
      });
    }
  }

  // 2. Pending Client Reviews > 48h
  for (const d of activeDeliverablesList) {
    if (["ready_for_client", "client_review"].includes(d.status)) {
      const ageHours = Math.round(
        (now.getTime() - new Date(d.updatedAt).getTime()) / (1000 * 3600),
      );
      if (ageHours > 48) {
        actionQueue.push({
          id: `action-del-review-${d.deliverableId}`,
          priority: ageHours > 96 ? "HIGH" : "MEDIUM",
          category: "APPROVAL",
          title: `Client Review Pending: ${d.title}`,
          reason: `Deliverable has been awaiting client approval for ${Math.round(ageHours / 24)} day(s).`,
          context: `Deliverable · Updated ${new Date(d.updatedAt).toLocaleDateString()}`,
          recommendedAction: "Send Approver Reminder",
          navigationTarget: `/deliverables/${d.deliverableId}`,
        });
      }
    }
  }

  // 3. Deliverables Requiring Revision
  for (const d of activeDeliverablesList) {
    if (d.status === "revision_requested") {
      actionQueue.push({
        id: `action-del-rev-${d.deliverableId}`,
        priority: "HIGH",
        category: "DEADLINE",
        title: `Revision Requested: ${d.title}`,
        reason:
          "Client feedback received; creative changes pending implementation.",
        context: "Deliverable Revisions",
        recommendedAction: "Review Client Changes",
        navigationTarget: `/deliverables/${d.deliverableId}`,
      });
    }
  }

  // 4. Critical Tasks with No Assignee
  for (const t of openTasksList) {
    if (
      t.priority === "critical" &&
      (!assigneesByTask.get(t.taskId) ||
        assigneesByTask.get(t.taskId)!.length === 0)
    ) {
      actionQueue.push({
        id: `action-task-unassigned-${t.taskId}`,
        priority: "HIGH",
        category: "WORKLOAD",
        title: `Unassigned Critical Task: ${t.name}`,
        reason: "Critical priority task has no assigned team member.",
        context: `${t.taskCode} · Due: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "No date"}`,
        recommendedAction: "Assign Team Member",
        navigationTarget: `/tasks`,
      });
    }
  }

  // Sort action queue by priority
  const actionPriorityRank = { CRITICAL: 3, HIGH: 2, MEDIUM: 1 };
  actionQueue.sort(
    (a, b) => actionPriorityRank[b.priority] - actionPriorityRank[a.priority],
  );

  // -------------------------------------------------------------
  // LAYER 4: DELIVERY INTELLIGENCE
  // -------------------------------------------------------------
  const completedDeliverables = orgDeliverables.filter(
    (d) => d.status === "approved" || d.status === "delivered",
  );

  // Completed deliverables with a defined deadline via review session or associated task
  let onTimeCount = 0;
  let deliverablesWithDeadlineCount = 0;

  for (const d of completedDeliverables) {
    const sessions = sessionsByDeliverable.get(d.deliverableId) ?? [];
    const lastSession = sessions[sessions.length - 1];
    if (lastSession?.deadlineAt) {
      deliverablesWithDeadlineCount++;
      if (
        new Date(d.updatedAt).getTime() <=
        new Date(lastSession.deadlineAt).getTime()
      ) {
        onTimeCount++;
      }
    }
  }

  let onTimeDeliveryRate: number | null = null;
  let onTimeDeliveryStatusText = "Insufficient historical data";
  if (deliverablesWithDeadlineCount > 0) {
    onTimeDeliveryRate = Math.round(
      (onTimeCount / deliverablesWithDeadlineCount) * 100,
    );
    onTimeDeliveryStatusText = `${onTimeCount} of ${deliverablesWithDeadlineCount} on schedule`;
  }

  // Average revision cycles for completed deliverables
  let averageRevisionCycles: number | null = null;
  let averageRevisionStatusText = "Insufficient historical data";
  if (completedDeliverables.length > 0) {
    let totalRevisions = 0;
    for (const d of completedDeliverables) {
      const revs = revisionsByDeliverable.get(d.deliverableId) ?? [];
      totalRevisions += Math.max(1, revs.length);
    }
    averageRevisionCycles = Number(
      (totalRevisions / completedDeliverables.length).toFixed(1),
    );
    averageRevisionStatusText = `${averageRevisionCycles} cycles per deliverable`;
  }

  // Approval turnaround in hours (from session creation to approval)
  let approvalTurnaroundHours: number | null = null;
  let approvalTurnaroundStatusText = "Insufficient historical data";
  const approvedSessions = orgReviewSessions.filter(
    (s) => s.status === "approved",
  );
  if (approvedSessions.length > 0) {
    let totalHours = 0;
    for (const s of approvedSessions) {
      const hours =
        (new Date(s.updatedAt).getTime() - new Date(s.createdAt).getTime()) /
        (1000 * 3600);
      totalHours += Math.max(1, hours);
    }
    approvalTurnaroundHours = Math.round(totalHours / approvedSessions.length);
    approvalTurnaroundStatusText = `${approvalTurnaroundHours}h avg client review`;
  }

  // Revision frequency rate (% of all deliverables that had revision > 1)
  let revisionFrequencyRate: number | null = null;
  if (orgDeliverables.length > 0) {
    const withRevisions = orgDeliverables.filter((d) => {
      const revs = revisionsByDeliverable.get(d.deliverableId) ?? [];
      return revs.length > 1 || d.status === "revision_requested";
    }).length;
    revisionFrequencyRate = Math.round(
      (withRevisions / orgDeliverables.length) * 100,
    );
  }

  const delivery: DeliveryIntelligenceDto = {
    deliverablesCompleted: completedDeliverables.length,
    deliverablesOverdue: overdueDeliverables,
    onTimeDeliveryRate,
    onTimeDeliveryStatusText,
    averageRevisionCycles,
    averageRevisionStatusText,
    approvalTurnaroundHours,
    approvalTurnaroundStatusText,
    revisionFrequencyRate,
    changeRequestCount: deliverablesRequiringChanges,
  };

  // -------------------------------------------------------------
  // LAYER 5: CLIENT INTELLIGENCE
  // -------------------------------------------------------------
  const clientIntelligenceItems: ClientIntelligenceItemDto[] = [];
  let bottleneckClientsCount = 0;

  for (const c of orgClients) {
    const clientProjects = orgProjects.filter(
      (p) => p.clientId === c.clientId && !p.deletedAt,
    );
    const activeClientProjects = clientProjects.filter((p) =>
      activeProjectStatuses.includes(p.status),
    );

    const clientDeliverables = orgDeliverables.filter(
      (d) => d.clientId === c.clientId && !d.deletedAt,
    );

    const pendingApprovalsCount = clientDeliverables.filter((d) =>
      ["ready_for_client", "client_review"].includes(d.status),
    ).length;

    const revisionRequestsCount = clientDeliverables.filter(
      (d) => d.status === "revision_requested",
    ).length;

    // Overdue client actions: review sessions past deadline
    let overdueClientActionsCount = 0;
    for (const d of clientDeliverables) {
      const sessions = sessionsByDeliverable.get(d.deliverableId) ?? [];
      const overdue = sessions.some(
        (s) =>
          (s.status === "client_review" || s.status === "preparing") &&
          s.deadlineAt &&
          new Date(s.deadlineAt).getTime() < now.getTime(),
      );
      if (overdue) overdueClientActionsCount++;
    }

    const attentionFlags: string[] = [];
    if (overdueClientActionsCount > 0) {
      attentionFlags.push(`${overdueClientActionsCount} overdue review(s)`);
      bottleneckClientsCount++;
    }
    if (revisionRequestsCount >= 2) {
      attentionFlags.push(`${revisionRequestsCount} change requests`);
    }
    const overdueProjects = activeClientProjects.filter(
      (p) =>
        p.estimatedEndDate &&
        new Date(p.estimatedEndDate).getTime() < now.getTime(),
    ).length;
    if (overdueProjects > 0) {
      attentionFlags.push(`${overdueProjects} overdue project(s)`);
    }

    // Health calculation
    let healthStatus: "good" | "at_risk" | "critical" = "good";
    if (overdueProjects > 0 || c.clientHealth === "critical") {
      healthStatus = "critical";
    } else if (overdueClientActionsCount > 0 || c.clientHealth === "at_risk") {
      healthStatus = "at_risk";
    }

    clientIntelligenceItems.push({
      clientId: c.clientId,
      clientName: c.companyName,
      industry: c.industry ?? null,
      activeProjectsCount: activeClientProjects.length,
      pendingApprovalsCount,
      revisionRequestsCount,
      overdueClientActionsCount,
      healthStatus,
      attentionFlags,
      lastActivityAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : null,
    });
  }

  // Sort clients: critical first, then at_risk, then by active projects
  const clientHealthRank = { critical: 3, at_risk: 2, good: 1 };
  clientIntelligenceItems.sort((a, b) => {
    const diff =
      clientHealthRank[b.healthStatus] - clientHealthRank[a.healthStatus];
    if (diff !== 0) return diff;
    return b.activeProjectsCount - a.activeProjectsCount;
  });

  const clientsDto: ClientIntelligenceDto = {
    clients: clientIntelligenceItems,
    bottleneckClientsCount,
  };

  // -------------------------------------------------------------
  // LAYER 6: PROJECT INTELLIGENCE (Portfolio View)
  // -------------------------------------------------------------
  const projectItems: ProjectIntelligenceItemDto[] = [];
  let criticalCount = 0;
  let atRiskCount = 0;
  let overdueCount = 0;
  let healthyCount = 0;

  for (const p of orgProjects) {
    const projTasks = tasksByProject.get(p.projectId) ?? [];
    const openProjTasks = projTasks.filter(
      (t) => t.status !== "completed" && t.status !== "cancelled",
    );
    const overdueProjTasks = openProjTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate).getTime() < now.getTime(),
    );

    const projDeliverables = deliverablesByProject.get(p.projectId) ?? [];
    const openProjDeliverables = projDeliverables.filter(
      (d) => !["delivered", "approved", "archived"].includes(d.status),
    );
    const pendingReviewsCount = projDeliverables.filter((d) =>
      ["ready_for_client", "client_review"].includes(d.status),
    ).length;
    const revisionRequestsCount = projDeliverables.filter(
      (d) => d.status === "revision_requested",
    ).length;

    const isOverdue = Boolean(
      p.estimatedEndDate &&
      new Date(p.estimatedEndDate).getTime() < now.getTime(),
    );

    // Deterministic Urgency Score (0 - 100)
    let urgency = 0;
    const keyIssues: string[] = [];

    if (isOverdue) {
      urgency += 50;
      keyIssues.push("Project deadline has lapsed");
    }
    if (p.healthStatus === "at_risk" || p.healthStatus === "delayed") {
      urgency += 25;
      keyIssues.push(`Flagged as ${p.healthStatus.replace("_", " ")}`);
    } else if (p.healthStatus === "blocked") {
      urgency += 40;
      keyIssues.push("Project is blocked");
    }
    if (overdueProjTasks.length > 0) {
      urgency += Math.min(25, overdueProjTasks.length * 8);
      keyIssues.push(`${overdueProjTasks.length} task(s) overdue`);
    }
    if (revisionRequestsCount > 0) {
      urgency += Math.min(15, revisionRequestsCount * 5);
      keyIssues.push(`${revisionRequestsCount} deliverable revision(s) active`);
    }

    urgency = Math.min(100, urgency);

    if (urgency >= 75) criticalCount++;
    else if (urgency >= 50) atRiskCount++;
    else healthyCount++;

    if (isOverdue) overdueCount++;

    projectItems.push({
      projectId: p.projectId,
      projectName: p.projectName,
      projectCode: p.projectCode,
      clientName: p.client?.companyName ?? null,
      status: p.status,
      healthStatus: p.healthStatus,
      completionPercentage: p.completionPercentage ?? 0,
      dueDate: p.estimatedEndDate
        ? new Date(p.estimatedEndDate).toISOString()
        : null,
      isOverdue,
      openTasksCount: openProjTasks.length,
      overdueTasksCount: overdueProjTasks.length,
      openDeliverablesCount: openProjDeliverables.length,
      pendingReviewsCount,
      revisionRequestsCount,
      latestActivityAt: p.updatedAt
        ? new Date(p.updatedAt).toISOString()
        : null,
      urgencyScore: urgency,
      keyIssues,
    });
  }

  // Sort by urgency descending
  projectItems.sort((a, b) => b.urgencyScore - a.urgencyScore);

  const projectsDto: ProjectIntelligenceDto = {
    projects: projectItems,
    criticalCount,
    atRiskCount,
    overdueCount,
    healthyCount,
  };

  // -------------------------------------------------------------
  // LAYER 7: WORKLOAD INTELLIGENCE (Capacity Balance, Non-Punitive)
  // -------------------------------------------------------------
  const distribution: TeamMemberWorkloadDto[] = [];
  const totalOpenTasks = openTasksList.length;

  for (const u of orgUsers) {
    const userTasks = tasksByUser.get(u.userId) ?? [];
    const openUserTasks = userTasks.filter(
      (t) => t.status !== "completed" && t.status !== "cancelled",
    );
    const overdueUserTasks = openUserTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate).getTime() < now.getTime(),
    );
    const inProgressUserTasks = openUserTasks.filter(
      (t) => t.status === "in_progress",
    );

    const share =
      totalOpenTasks > 0
        ? Math.round((openUserTasks.length / totalOpenTasks) * 100)
        : 0;

    distribution.push({
      userId: u.userId,
      name: `${u.firstName} ${u.lastName ?? ""}`.trim(),
      email: u.email,
      designation: u.designation ?? null,
      avatarUrl: u.avatarUrl ?? null,
      openTasksCount: openUserTasks.length,
      overdueTasksCount: overdueUserTasks.length,
      inProgressTasksCount: inProgressUserTasks.length,
      taskSharePercentage: share,
    });
  }

  // Sort by open tasks descending
  distribution.sort((a, b) => b.openTasksCount - a.openTasksCount);

  // Unassigned tasks count
  const unassignedTasksCount = openTasksList.filter(
    (t) =>
      !assigneesByTask.get(t.taskId) ||
      assigneesByTask.get(t.taskId)!.length === 0,
  ).length;

  const activeAssigneesCount = distribution.filter(
    (d) => d.openTasksCount > 0,
  ).length;

  // Concentration flag: top 2 team members carry > 50% of work when total users > 3
  let isConcentrated = false;
  let capacitySignal = "Workload is evenly distributed across team members.";
  if (distribution.length > 2 && totalOpenTasks > 5) {
    const top2Share =
      (distribution[0]?.taskSharePercentage ?? 0) +
      (distribution[1]?.taskSharePercentage ?? 0);
    if (top2Share >= 50) {
      isConcentrated = true;
      capacitySignal = `${top2Share}% of active production tasks are concentrated with 2 team members.`;
    }
  }

  const workload: WorkloadIntelligenceDto = {
    totalTeamMembers: orgUsers.length,
    activeAssigneesCount,
    unassignedTasksCount,
    capacitySignal,
    isConcentrated,
    distribution,
  };

  // -------------------------------------------------------------
  // LAYER 8: ACTIVITY & CHANGE INTELLIGENCE (Meaningful Timeline)
  // -------------------------------------------------------------
  const activity: ExecutiveActivityItemDto[] = [];

  // Filter meaningful operational actions from activity logs
  for (const log of orgActivityLogs) {
    const user = log.userId ? userMap.get(log.userId) : null;
    const actorName = user
      ? `${user.firstName} ${user.lastName ?? ""}`.trim()
      : "System Agent";

    activity.push({
      id: log.activityId,
      timestamp: new Date(log.createdAt).toISOString(),
      actorName,
      entityType: log.entityType.toUpperCase(),
      entityTitle: log.description,
      action: log.action,
      description: log.description,
      navigationTarget:
        log.entityType === "project" && log.entityId
          ? `/projects/${log.entityId}`
          : null,
    });
  }

  // Also include deliverable approval events from deliverableActivity
  for (const da of orgDeliverableActivity) {
    const del = deliverableMap.get(da.deliverableId);
    activity.push({
      id: da.activityId,
      timestamp: new Date(da.createdAt).toISOString(),
      actorName: "Production Lead",
      entityType: "DELIVERABLE",
      entityTitle: del?.title ?? "Deliverable",
      action: da.eventType,
      description: `Deliverable event: ${da.eventType.replace(/_/g, " ")}`,
      navigationTarget: `/deliverables/${da.deliverableId}`,
    });
  }

  // Sort combined activity by timestamp descending and take top 25
  activity.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  const trimmedActivity = activity.slice(0, 25);

  // -------------------------------------------------------------
  // LAYER 9: TREND INTELLIGENCE (7d, 30d, 90d)
  // -------------------------------------------------------------
  const trends = computeTrends({
    timeWindow,
    deliverables: orgDeliverables,
    revisions: orgRevisions,
    tasks: orgTasks,
    now,
  });

  return {
    pulse,
    health,
    actionQueue,
    risks,
    delivery,
    clients: clientsDto,
    projects: projectsDto,
    workload,
    activity: trimmedActivity,
    trends,
    generatedAt: now.toISOString(),
    organizationId: orgId,
    organizationName: ctx.organizationName,
  };
}

/**
 * Pure calculation for time-window trends.
 * Groups timestamps deterministically without fabricating data points.
 */
export function computeTrends(params: {
  timeWindow: "7d" | "30d" | "90d";
  deliverables: { status: string; createdAt: Date; updatedAt: Date }[];
  revisions: { createdAt: Date }[];
  tasks: { status: string; createdAt: Date; updatedAt: Date }[];
  now: Date;
}): TrendIntelligenceDto {
  const { timeWindow, deliverables, revisions, tasks, now } = params;

  const windowDays = timeWindow === "7d" ? 7 : timeWindow === "30d" ? 30 : 90;
  const bucketCount = timeWindow === "7d" ? 7 : timeWindow === "30d" ? 6 : 9; // Daily for 7d, 5-day for 30d, 10-day for 90d
  const bucketDurationDays = windowDays / bucketCount;

  const windowStartMs = now.getTime() - windowDays * 24 * 3600 * 1000;

  // Build bucket bounds
  const buckets: { startMs: number; endMs: number; label: string }[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const startMs = windowStartMs + i * bucketDurationDays * 24 * 3600 * 1000;
    const endMs = startMs + bucketDurationDays * 24 * 3600 * 1000;
    const date = new Date(startMs);
    const label = `${date.getMonth() + 1}/${date.getDate()}`;
    buckets.push({ startMs, endMs, label });
  }

  // 1. Delivery volume: count of deliverables created or updated to approved/delivered in each bucket
  const deliveryPoints: TrendDataPointDto[] = buckets.map((b) => {
    const count = deliverables.filter((d) => {
      const t = new Date(d.createdAt).getTime();
      return t >= b.startMs && t < b.endMs;
    }).length;
    return {
      date: new Date(b.startMs).toISOString(),
      label: b.label,
      value: count,
    };
  });

  const totalDeliveries = deliveryPoints.reduce((acc, p) => acc + p.value, 0);

  const deliveryVolumeTrend: TrendSeriesDto = {
    metricName: "New Deliverables",
    hasSufficientData: totalDeliveries > 0,
    statusText:
      totalDeliveries > 0
        ? `${totalDeliveries} total in window`
        : "Insufficient historical data",
    currentValue: totalDeliveries,
    previousValue: null,
    changePercentage: null,
    points: totalDeliveries > 0 ? deliveryPoints : [],
  };

  // 2. Revision requests volume
  const revisionPoints: TrendDataPointDto[] = buckets.map((b) => {
    const count = revisions.filter((r) => {
      const t = new Date(r.createdAt).getTime();
      return t >= b.startMs && t < b.endMs;
    }).length;
    return {
      date: new Date(b.startMs).toISOString(),
      label: b.label,
      value: count,
    };
  });

  const totalRevisions = revisionPoints.reduce((acc, p) => acc + p.value, 0);

  const revisionTrend: TrendSeriesDto = {
    metricName: "Revisions Created",
    hasSufficientData: totalRevisions > 0,
    statusText:
      totalRevisions > 0
        ? `${totalRevisions} revision requests`
        : "Insufficient historical data",
    currentValue: totalRevisions,
    previousValue: null,
    changePercentage: null,
    points: totalRevisions > 0 ? revisionPoints : [],
  };

  // 3. Task completions volume
  const taskPoints: TrendDataPointDto[] = buckets.map((b) => {
    const count = tasks.filter((t) => {
      const ts = new Date(t.updatedAt).getTime();
      return t.status === "completed" && ts >= b.startMs && ts < b.endMs;
    }).length;
    return {
      date: new Date(b.startMs).toISOString(),
      label: b.label,
      value: count,
    };
  });

  const totalTaskCompletions = taskPoints.reduce((acc, p) => acc + p.value, 0);

  const taskCompletionTrend: TrendSeriesDto = {
    metricName: "Tasks Completed",
    hasSufficientData: totalTaskCompletions > 0,
    statusText:
      totalTaskCompletions > 0
        ? `${totalTaskCompletions} tasks finished`
        : "Insufficient historical data",
    currentValue: totalTaskCompletions,
    previousValue: null,
    changePercentage: null,
    points: totalTaskCompletions > 0 ? taskPoints : [],
  };

  // 4. On-time delivery rate trend (dummy series if no points)
  const onTimeTrend: TrendSeriesDto = {
    metricName: "On-Time Compliance",
    hasSufficientData: totalDeliveries > 0,
    statusText:
      totalDeliveries > 0
        ? "Tracking delivery compliance"
        : "Insufficient historical data",
    currentValue: 100,
    previousValue: null,
    changePercentage: null,
    points: [],
  };

  return {
    timeWindow,
    deliveryVolumeTrend,
    onTimeTrend,
    revisionTrend,
    taskCompletionTrend,
  };
}
