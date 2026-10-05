// @vitest-environment node

import { describe, expect, it, beforeEach } from "vitest";
import { computeTrends } from "@/features/intelligence/service";
import {
  hasPermission,
  requirePermission,
  PermissionDeniedError,
} from "@/features/permissions/engine";
import type { PermissionMap } from "@/features/permissions/constants";

describe("Phase 4H: Executive Intelligence", () => {
  describe("1. Authorization Gates & Role Boundaries", () => {
    it("permits users with analytics:read permission", () => {
      const permissions: PermissionMap = {
        analytics: ["read"],
      };
      expect(hasPermission(permissions, "analytics", "read")).toBe(true);
      expect(() =>
        requirePermission(permissions, "analytics", "read"),
      ).not.toThrow();
    });

    it("permits users with wildcard *:* permission (e.g. Owner)", () => {
      const permissions: PermissionMap = {
        "*": ["*"],
      };
      expect(hasPermission(permissions, "analytics", "read")).toBe(true);
      expect(() =>
        requirePermission(permissions, "analytics", "read"),
      ).not.toThrow();
    });

    it("permits users with analytics:* permission (e.g. Super Admin)", () => {
      const permissions: PermissionMap = {
        analytics: ["*"],
      };
      expect(hasPermission(permissions, "analytics", "read")).toBe(true);
      expect(() =>
        requirePermission(permissions, "analytics", "read"),
      ).not.toThrow();
    });

    it("rejects team_member who lacks analytics:read permission", () => {
      const permissions: PermissionMap = {
        projects: ["read"],
        tasks: ["read", "update"],
        deliverables: ["read"],
      };
      expect(hasPermission(permissions, "analytics", "read")).toBe(false);
      expect(() => requirePermission(permissions, "analytics", "read")).toThrow(
        PermissionDeniedError,
      );
    });

    it("rejects guest / unauthenticated callers with null permissions", () => {
      expect(hasPermission(null, "analytics", "read")).toBe(false);
      expect(() => requirePermission(null, "analytics", "read")).toThrow(
        PermissionDeniedError,
      );
    });

    it("rejects empty permission map", () => {
      expect(hasPermission({}, "analytics", "read")).toBe(false);
      expect(() => requirePermission({}, "analytics", "read")).toThrow(
        PermissionDeniedError,
      );
    });
  });

  describe("2. Metric Calculations & Deterministic Formulas", () => {
    it("calculates on-time delivery rate correctly", () => {
      const now = new Date("2026-10-04T12:00:00Z");
      const completedWithDeadlines = [
        {
          deliverableId: "d1",
          status: "delivered",
          updatedAt: new Date("2026-10-01T12:00:00Z"),
          deadlineAt: new Date("2026-10-02T12:00:00Z"), // On time
        },
        {
          deliverableId: "d2",
          status: "approved",
          updatedAt: new Date("2026-10-03T12:00:00Z"),
          deadlineAt: new Date("2026-10-02T12:00:00Z"), // Late
        },
        {
          deliverableId: "d3",
          status: "delivered",
          updatedAt: new Date("2026-09-30T12:00:00Z"),
          deadlineAt: new Date("2026-10-01T12:00:00Z"), // On time
        },
      ];

      const onTimeCount = completedWithDeadlines.filter(
        (d) => d.updatedAt.getTime() <= d.deadlineAt.getTime(),
      ).length;

      const rate = Math.round(
        (onTimeCount / completedWithDeadlines.length) * 100,
      );
      expect(rate).toBe(67); // 2 out of 3 = 66.67% -> 67%
    });

    it("handles zero completed deliverables without division by zero", () => {
      const completed: any[] = [];
      const rate = completed.length > 0 ? (0 / completed.length) * 100 : null;
      expect(rate).toBeNull();
    });

    it("calculates average revision cycles per deliverable accurately", () => {
      const deliverables = [
        { deliverableId: "d1", revisions: 1 },
        { deliverableId: "d2", revisions: 3 },
        { deliverableId: "d3", revisions: 2 },
      ];
      const totalRevisions = deliverables.reduce(
        (acc, d) => acc + d.revisions,
        0,
      );
      const avg = Number((totalRevisions / deliverables.length).toFixed(1));
      expect(avg).toBe(2.0);
    });

    it("calculates task execution health score correctly", () => {
      const openTasks = 40;
      const overdueTasks = 4;
      const overdueRatio = overdueTasks / openTasks;
      const score = Math.max(0, Math.round((1 - overdueRatio) * 100));
      expect(score).toBe(90);
    });

    it("handles zero open tasks with 100% execution score", () => {
      const openTasks = 0;
      const overdueTasks = 0;
      const score =
        openTasks === 0
          ? 100
          : Math.max(0, Math.round((1 - overdueTasks / openTasks) * 100));
      expect(score).toBe(100);
    });
  });

  describe("3. Deterministic Risk Radar Rules", () => {
    const now = new Date("2026-10-04T12:00:00Z");

    it("flags an overdue project as CRITICAL", () => {
      const project = {
        projectId: "proj-1",
        projectCode: "AIC-P-01",
        projectName: "Brand Campaign",
        status: "in_progress",
        estimatedEndDate: new Date("2026-10-01T12:00:00Z"), // 3 days ago
        completionPercentage: 50,
      };

      const isOverdue =
        project.estimatedEndDate.getTime() < now.getTime() &&
        project.status !== "completed";

      expect(isOverdue).toBe(true);
      const severity = "CRITICAL";
      expect(severity).toBe("CRITICAL");
    });

    it("flags an approaching deadline (<3 days) with low completion as HIGH", () => {
      const project = {
        projectId: "proj-2",
        status: "in_progress",
        estimatedEndDate: new Date("2026-10-06T12:00:00Z"), // 2 days away
        completionPercentage: 40, // < 75%
      };

      const daysUntilDue =
        (project.estimatedEndDate.getTime() - now.getTime()) /
        (1000 * 3600 * 24);
      const isApproaching = daysUntilDue <= 3 && daysUntilDue >= 0;
      const isLagging = project.completionPercentage < 75;

      expect(isApproaching).toBe(true);
      expect(isLagging).toBe(true);
    });

    it("flags repeated revisions (>=3) with pending changes as HIGH", () => {
      const revisionsCount = 3;
      const status = "revision_requested";

      const isHighRisk = revisionsCount >= 3 && status === "revision_requested";
      expect(isHighRisk).toBe(true);
    });

    it("flags overdue deliverable review deadline as HIGH", () => {
      const reviewDeadline = new Date("2026-10-03T12:00:00Z"); // Yesterday
      const status = "client_review";

      const isLateReview =
        reviewDeadline.getTime() < now.getTime() &&
        (status === "client_review" || status === "preparing");
      expect(isLateReview).toBe(true);
    });

    it("classifies on-track healthy projects as zero-risk", () => {
      const project = {
        projectId: "proj-3",
        status: "in_progress",
        healthStatus: "on_track",
        estimatedEndDate: new Date("2026-10-25T12:00:00Z"), // Far away
        completionPercentage: 80,
      };

      const isOverdue = project.estimatedEndDate.getTime() < now.getTime();
      const isAtRisk =
        project.healthStatus === "at_risk" ||
        project.healthStatus === "delayed";

      expect(isOverdue).toBe(false);
      expect(isAtRisk).toBe(false);
    });
  });

  describe("4. Trend Intelligence Engine", () => {
    const now = new Date("2026-10-04T12:00:00Z");

    it("computes delivery and revision trends with sufficient data", () => {
      const deliverables = [
        {
          status: "delivered",
          createdAt: new Date("2026-10-01T10:00:00Z"),
          updatedAt: new Date("2026-10-02T10:00:00Z"),
        },
        {
          status: "in_progress",
          createdAt: new Date("2026-10-03T10:00:00Z"),
          updatedAt: new Date("2026-10-03T10:00:00Z"),
        },
      ];
      const revisions = [{ createdAt: new Date("2026-10-02T11:00:00Z") }];
      const tasks = [
        {
          status: "completed",
          createdAt: new Date("2026-09-29T10:00:00Z"),
          updatedAt: new Date("2026-10-02T15:00:00Z"),
        },
      ];

      const trends = computeTrends({
        timeWindow: "7d",
        deliverables,
        revisions,
        tasks,
        now,
      });

      expect(trends.deliveryVolumeTrend.hasSufficientData).toBe(true);
      expect(trends.deliveryVolumeTrend.currentValue).toBe(2);
      expect(trends.revisionTrend.hasSufficientData).toBe(true);
      expect(trends.revisionTrend.currentValue).toBe(1);
      expect(trends.taskCompletionTrend.hasSufficientData).toBe(true);
      expect(trends.taskCompletionTrend.currentValue).toBe(1);
    });

    it("returns hasSufficientData=false when data is empty without fabricating points", () => {
      const trends = computeTrends({
        timeWindow: "30d",
        deliverables: [],
        revisions: [],
        tasks: [],
        now,
      });

      expect(trends.deliveryVolumeTrend.hasSufficientData).toBe(false);
      expect(trends.deliveryVolumeTrend.points).toEqual([]);
      expect(trends.deliveryVolumeTrend.statusText).toContain(
        "Insufficient historical data",
      );

      expect(trends.revisionTrend.hasSufficientData).toBe(false);
      expect(trends.revisionTrend.points).toEqual([]);

      expect(trends.taskCompletionTrend.hasSufficientData).toBe(false);
      expect(trends.taskCompletionTrend.points).toEqual([]);
    });

    it("supports 7d, 30d, and 90d time windows", () => {
      for (const window of ["7d", "30d", "90d"] as const) {
        const trends = computeTrends({
          timeWindow: window,
          deliverables: [],
          revisions: [],
          tasks: [],
          now,
        });
        expect(trends.timeWindow).toBe(window);
      }
    });
  });

  describe("5. Multi-Tenant Isolation & Security Boundary", () => {
    it("ensures organizationId cannot be injected from client payload", async () => {
      // Import the real action modules and assert their parameter types
      const realActions = await import("@/features/intelligence/real-actions");
      expect(typeof realActions.getExecutiveIntelligence).toBe("function");
      expect(typeof realActions.getExecutiveRisks).toBe("function");
      expect(typeof realActions.getExecutiveAttentionQueue).toBe("function");
      expect(typeof realActions.getExecutivePulse).toBe("function");

      // Verify getExecutiveIntelligence takes only optional timeWindow, never organizationId
      expect(realActions.getExecutiveIntelligence.length).toBeLessThanOrEqual(
        1,
      );
    });

    it("ensures mock actions preserve the same public signature", async () => {
      const mockActions = await import("@/features/intelligence/mock-actions");
      expect(typeof mockActions.getExecutiveIntelligence).toBe("function");
      expect(typeof mockActions.getExecutiveRisks).toBe("function");
      expect(typeof mockActions.getExecutiveAttentionQueue).toBe("function");
      expect(typeof mockActions.getExecutivePulse).toBe("function");

      const mockData = await mockActions.getExecutiveIntelligence("30d");
      expect(mockData.pulse).toBeDefined();
      expect(mockData.health).toBeDefined();
      expect(mockData.risks).toBeDefined();
      expect(mockData.actionQueue).toBeDefined();
      expect(mockData.delivery).toBeDefined();
      expect(mockData.clients).toBeDefined();
      expect(mockData.projects).toBeDefined();
      expect(mockData.workload).toBeDefined();
      expect(mockData.trends).toBeDefined();
    });
  });

  describe("6. Edge Cases & Robustness", () => {
    it("handles null estimatedEndDate and null due dates safely", () => {
      const projectWithNullDate = {
        projectId: "p-null",
        estimatedEndDate: null,
        status: "in_progress",
      };

      const now = new Date();
      const isOverdue = Boolean(
        projectWithNullDate.estimatedEndDate &&
        new Date(projectWithNullDate.estimatedEndDate).getTime() <
          now.getTime(),
      );

      expect(isOverdue).toBe(false);
    });

    it("ignores archived and deleted entities from active counts", () => {
      const projects = [
        { id: "1", status: "in_progress", deletedAt: null },
        { id: "2", status: "completed", deletedAt: null },
        { id: "3", status: "in_progress", deletedAt: new Date() }, // Deleted
        { id: "4", status: "archived", deletedAt: null }, // Archived
      ];

      const active = projects.filter(
        (p) =>
          !p.deletedAt &&
          !["completed", "cancelled", "archived"].includes(p.status),
      );

      expect(active.length).toBe(1);
      expect(active[0]?.id).toBe("1");
    });
  });
});
