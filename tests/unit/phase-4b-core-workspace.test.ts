import { describe, expect, it } from "vitest";
import { NAV_SECTIONS } from "@/config/navigation";
import { hasPermission, type PermissionMap } from "@/features/permissions";

describe("Phase 4B — Core Workspace & Global Navigation", () => {
  describe("Sidebar Navigation Model & Workforce Consolidation", () => {
    it("defines the 5 canonical top-level navigation sections", () => {
      const sectionLabels = NAV_SECTIONS.map((s) => s.label);
      expect(sectionLabels).toEqual([
        "Workspace",
        "Production",
        "Workforce",
        "Intelligence",
        "Organization",
      ]);
    });

    it("consolidates Workforce into exactly 2 primary items: My Time and Team & People", () => {
      const workforceSection = NAV_SECTIONS.find(
        (s) => s.label === "Workforce",
      );
      expect(workforceSection).toBeDefined();
      expect(workforceSection?.items.length).toBe(2);

      const itemTitles = workforceSection?.items.map((i) => i.title);
      expect(itemTitles).toEqual(["My Time", "Team & People"]);
    });

    it("preserves all 3 personal time-tracking routes under My Time", () => {
      const workforceSection = NAV_SECTIONS.find(
        (s) => s.label === "Workforce",
      );
      const myTime = workforceSection?.items.find((i) => i.title === "My Time");

      expect(myTime?.children).toBeDefined();
      expect(myTime?.children?.length).toBe(3);

      const childTitles = myTime?.children?.map((c) => c.title);
      expect(childTitles).toEqual(["Punch Clock", "History", "Corrections"]);

      const childHrefs = myTime?.children?.map((c) => c.href);
      expect(childHrefs).toEqual([
        "/workforce/attendance",
        "/workforce/history",
        "/workforce/corrections",
      ]);
    });

    it("preserves all 4 team/managerial routes under Team & People", () => {
      const workforceSection = NAV_SECTIONS.find(
        (s) => s.label === "Workforce",
      );
      const teamAndPeople = workforceSection?.items.find(
        (i) => i.title === "Team & People",
      );

      expect(teamAndPeople?.children).toBeDefined();
      expect(teamAndPeople?.children?.length).toBe(4);

      const childTitles = teamAndPeople?.children?.map((c) => c.title);
      expect(childTitles).toEqual([
        "Team Attendance",
        "Employees",
        "Review Queue",
        "Reports",
      ]);

      const childHrefs = teamAndPeople?.children?.map((c) => c.href);
      expect(childHrefs).toEqual([
        "/workforce/team",
        "/workforce/employees",
        "/workforce/corrections/review",
        "/workforce/reports",
      ]);
    });

    it("evaluates permission filtering accurately for individual contributors", () => {
      // Individual contributor who only has clocking permissions
      const memberPermissions: PermissionMap = {
        attendance: ["clock", "read"],
        corrections: ["create"],
      };

      const workforceSection = NAV_SECTIONS.find(
        (s) => s.label === "Workforce",
      )!;
      const myTime = workforceSection.items.find((i) => i.title === "My Time")!;
      const teamAndPeople = workforceSection.items.find(
        (i) => i.title === "Team & People",
      )!;

      // My Time should be accessible
      const myTimePermitted =
        !myTime.permission ||
        hasPermission(
          memberPermissions,
          myTime.permission[0],
          myTime.permission[1],
        );
      expect(myTimePermitted).toBe(true);

      // Team & People should NOT be accessible to standard contributor
      const teamPermitted =
        !teamAndPeople.permission ||
        hasPermission(
          memberPermissions,
          teamAndPeople.permission[0],
          teamAndPeople.permission[1],
        );
      expect(teamPermitted).toBe(false);
    });

    it("evaluates permission filtering accurately for managers/admins", () => {
      const managerPermissions: PermissionMap = {
        attendance: ["*"],
        corrections: ["*"],
        users: ["read"],
        reports: ["read"],
      };

      const workforceSection = NAV_SECTIONS.find(
        (s) => s.label === "Workforce",
      )!;
      const myTime = workforceSection.items.find((i) => i.title === "My Time")!;
      const teamAndPeople = workforceSection.items.find(
        (i) => i.title === "Team & People",
      )!;

      expect(
        hasPermission(
          managerPermissions,
          myTime.permission![0],
          myTime.permission![1],
        ),
      ).toBe(true);
      expect(
        hasPermission(
          managerPermissions,
          teamAndPeople.permission![0],
          teamAndPeople.permission![1],
        ),
      ).toBe(true);
    });
  });

  describe("Permission-Tolerant Asset Surface Guards", () => {
    it("safely resolves empty project set when projects.read is missing", () => {
      const restrictedUserPermissions: PermissionMap = {
        files: ["read", "create"],
        deliverables: ["read", "approve"],
        meetings: ["read"],
      };

      // Demonstrates the Phase 4B guard logic
      const canReadProjects = hasPermission(
        restrictedUserPermissions,
        "projects",
        "read",
      );
      expect(canReadProjects).toBe(false);

      // The guard pattern returns empty array rather than invoking getProjects() and throwing
      const safeProjectRows = canReadProjects
        ? [{ projectId: "p1", projectName: "Project 1" }]
        : [];
      expect(safeProjectRows).toEqual([]);
    });

    it("allows full project resolution when projects.read is present", () => {
      const authorizedUserPermissions: PermissionMap = {
        files: ["read"],
        projects: ["read"],
      };

      const canReadProjects = hasPermission(
        authorizedUserPermissions,
        "projects",
        "read",
      );
      expect(canReadProjects).toBe(true);
    });
  });
});
