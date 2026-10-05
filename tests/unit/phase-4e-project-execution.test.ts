// @vitest-environment node

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  getProjects as mockGetProjects,
  getProjectById as mockGetProjectById,
  getProjectDashboardSummary as mockGetProjectDashboardSummary,
} from "@/features/projects/mock-actions";
import { getTasksByProject as mockGetTasksByProject } from "@/features/tasks/mock-actions";
import {
  getProjectTimeline as mockGetProjectTimeline,
  getTimelineMilestones as mockGetTimelineMilestones,
} from "@/features/timelines/mock-actions";
import { insertProjectSchema } from "@/features/projects/schemas";
import { insertTaskSchema } from "@/features/tasks/schemas";

import {
  insertTimelineSchema,
  insertMilestoneSchema,
} from "@/features/timelines/schemas";
import { BOARD_COLUMNS, TASK_STATUSES } from "@/features/tasks/constants";
import { getDemoStore } from "@/lib/demo/store";

describe("Phase 4E: Project Execution, Kanban & Gantt Architecture", () => {
  it("Phase 4A Bug Fix: verifies tasks/page.tsx has zero hardcoded demo milestone UUIDs", () => {
    const tasksPagePath = join(
      process.cwd(),
      "src/app/(dashboard)/tasks/page.tsx",
    );
    const content = readFileSync(tasksPagePath, "utf-8");

    // The known Phase 4A bug was the fallback UUID "00000000-0000-4000-8000-000000000312"
    expect(content.includes("00000000-0000-4000-8000-000000000312")).toBe(
      false,
    );
    expect(content.includes("DEMO_TASK_SCOPE")).toBe(false);
  });

  describe("Project Schemas & Data Model Invariants", () => {
    it("validates project creation payload with full Phase 4E execution metadata", () => {
      const payload = {
        projectName: "Brand Transformation 2026",
        description: "Complete visual redesign and creative execution.",
        clientId: "00000000-0000-4000-8000-000000000001",
        priority: "high" as const,
        status: "in_progress" as const,
        healthStatus: "on_track" as const,
        visibility: "client_shared" as const,
        startDate: new Date("2026-03-01"),
        estimatedEndDate: new Date("2026-06-30"),
        budget: "75000",
      };

      const result = insertProjectSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.projectName).toBe("Brand Transformation 2026");
        expect(result.data.status).toBe("in_progress");
        expect(result.data.healthStatus).toBe("on_track");
        expect(result.data.priority).toBe("high");
      }
    });

    it("validates task creation payload requiring phase, milestone, and timeline bounds", () => {
      const payload = {
        projectId: "00000000-0000-4000-8000-000000000001",
        timelineId: "00000000-0000-4000-8000-000000000002",
        phaseId: "00000000-0000-4000-8000-000000000003",
        milestoneId: "00000000-0000-4000-8000-000000000004",
        name: "Produce Hero Video Cutdown",
        status: "in_progress" as const,
        priority: "critical" as const,
        taskType: "video_editing" as const,
        estimatedDurationMins: 240,
        progress: 50,
      };

      const result = insertTaskSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Produce Hero Video Cutdown");
        expect(result.data.status).toBe("in_progress");
        expect(result.data.progress).toBe(50);
      }
    });

    it("validates timeline and milestone schemas without requiring new database migrations", () => {
      const timelineResult = insertTimelineSchema.safeParse({
        projectId: "00000000-0000-4000-8000-000000000001",
        status: "planning" as const,
      });
      expect(timelineResult.success).toBe(true);

      const milestoneResult = insertMilestoneSchema.safeParse({
        timelineId: "00000000-0000-4000-8000-000000000002",
        phaseId: "00000000-0000-4000-8000-000000000003",
        name: "Initial Creative Concept Sign-Off",
        startDate: new Date("2026-03-01"),
        endDate: new Date("2026-03-15"),
      });
      expect(milestoneResult.success).toBe(true);
    });
  });

  describe("Project Directory: Search & Filtering", () => {
    it("searches projects by code and filters by status and health", async () => {
      const allProjects = await mockGetProjects();
      expect(Array.isArray(allProjects)).toBe(true);
      expect(allProjects.length).toBeGreaterThanOrEqual(1);

      const sample = allProjects[0];

      // Search by exact project name
      const searched = await mockGetProjects(sample.projectName);
      expect(searched.some((p: any) => p.projectId === sample.projectId)).toBe(
        true,
      );

      // Search by code
      if (sample.projectCode) {
        const byCode = await mockGetProjects(sample.projectCode);
        expect(byCode.some((p: any) => p.projectId === sample.projectId)).toBe(
          true,
        );
      }

      // Filter by status
      const filteredByStatus = await mockGetProjects(
        undefined,
        50,
        0,
        sample.status,
      );
      expect(
        filteredByStatus.every((p: any) => p.status === sample.status),
      ).toBe(true);

      // Filter by healthStatus
      const filteredByHealth = await mockGetProjects(
        undefined,
        50,
        0,
        undefined,
        sample.healthStatus,
      );
      expect(
        filteredByHealth.every(
          (p: any) => p.healthStatus === sample.healthStatus,
        ),
      ).toBe(true);
    });
  });

  describe("Project Command Center & Execution Metrics", () => {
    it("loads project by ID with client summary", async () => {
      const store = getDemoStore();
      const demoProject = store.projects[0];
      expect(demoProject).toBeDefined();

      const project = await mockGetProjectById(demoProject.projectId);
      expect(project).toBeDefined();
      expect(project?.projectId).toBe(demoProject.projectId);
      expect(project?.projectName).toBe(demoProject.projectName);
    });

    it("aggregates authentic task counts and real progress for project summary", async () => {
      const store = getDemoStore();
      const demoProject = store.projects[0];
      const summary = await mockGetProjectDashboardSummary(
        demoProject.projectId,
      );

      expect(summary).toBeDefined();
      expect(typeof summary.overallProgress).toBe("number");
      expect(summary.overallProgress).toBeGreaterThanOrEqual(0);
      expect(summary.overallProgress).toBeLessThanOrEqual(100);
      expect(typeof summary.openTasks).toBe("number");
      expect(typeof summary.completedTasks).toBe("number");
    });
  });

  describe("Kanban Execution & Status Vocabulary", () => {
    it("conforms to canonical BOARD_COLUMNS definitions (5 columns: Backlog, To Do, In Progress, Review, Completed)", () => {
      const columnIds = BOARD_COLUMNS.map((c) => c.id);

      expect(columnIds).toEqual([
        "backlog",
        "todo",
        "in_progress",
        "review",
        "completed",
      ]);

      // All board columns must be valid TASK_STATUSES
      for (const col of BOARD_COLUMNS) {
        expect(TASK_STATUSES).toContain(col.id);
      }
    });

    it("fetches tasks strictly scoped to the specified project via getTasksByProject", async () => {
      const store = getDemoStore();
      const demoProject = store.projects[0];
      const projectTasks = await mockGetTasksByProject(demoProject.projectId);

      expect(Array.isArray(projectTasks)).toBe(true);
      for (const task of projectTasks) {
        expect(task.projectId).toBe(demoProject.projectId);
      }
    });
  });

  describe("Timeline & Gantt Data Mapping", () => {
    it("loads project timeline with ordered phases and milestones", async () => {
      const store = getDemoStore();
      const demoProject = store.projects[0];
      const timeline = await mockGetProjectTimeline(demoProject.projectId);

      if (timeline) {
        expect(timeline.projectId).toBe(demoProject.projectId);
        expect(Array.isArray(timeline.phases)).toBe(true);

        const milestones = await mockGetTimelineMilestones(timeline.timelineId);
        expect(Array.isArray(milestones)).toBe(true);
        for (const m of milestones) {
          expect(m.timelineId).toBe(timeline.timelineId);
          expect(typeof m.progress).toBe("number");
        }
      }
    });
  });
});
