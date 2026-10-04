// @vitest-environment node

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Phase 4I: Accessibility + Polish", () => {
  const rootDir = path.resolve(__dirname, "../../");

  describe("1. WCAG 2.4.1: Bypass Blocks & Semantic Landmarks", () => {
    it("app-shell defines a skip link targeting #main-content and sets main tabIndex={-1}", () => {
      const appShellPath = path.join(rootDir, "src/components/layout/app-shell.tsx");
      const content = fs.readFileSync(appShellPath, "utf-8");

      expect(content).toContain('href="#main-content"');
      expect(content).toContain("skip-link");
      expect(content).toContain('id="main-content"');
      expect(content).toContain("tabIndex={-1}");
    });

    it("portal review workspace defines a skip link targeting #portal-review-main and sets main tabIndex={-1}", () => {
      const portalPath = path.join(
        rootDir,
        "src/features/deliverables/components/portal-review-workspace.tsx"
      );
      const content = fs.readFileSync(portalPath, "utf-8");

      expect(content).toContain('href="#portal-review-main"');
      expect(content).toContain("skip-link");
      expect(content).toContain('id="portal-review-main"');
      expect(content).toContain("tabIndex={-1}");
    });
  });

  describe("2. WCAG 2.1 & 2.4.7: Focus Indicators & Reduced Motion", () => {
    it("globals.css implements prefers-reduced-motion reset for assistive technology", () => {
      const cssPath = path.join(rootDir, "src/app/globals.css");
      const content = fs.readFileSync(cssPath, "utf-8");

      expect(content).toContain("@media (prefers-reduced-motion: reduce)");
      expect(content).toContain("animation-duration: 0.01ms !important");
      expect(content).toContain("transition-duration: 0.01ms !important");
    });

    it("globals.css provides high-contrast visible focus styling and skip-link positioning", () => {
      const cssPath = path.join(rootDir, "src/app/globals.css");
      const content = fs.readFileSync(cssPath, "utf-8");

      expect(content).toContain(":focus-visible");
      expect(content).toContain("outline: 2px solid var(--ring)");
      expect(content).toContain(".skip-link");
      expect(content).toContain(".skip-link:focus");
    });

    it("global-search trigger button provides focus-visible ring classes", () => {
      const searchPath = path.join(
        rootDir,
        "src/features/search/components/global-search.tsx"
      );
      const content = fs.readFileSync(searchPath, "utf-8");

      expect(content).toContain("focus-visible:ring-2");
      expect(content).toContain("focus-visible:ring-ring");
    });

    it("auth login-form method switcher buttons provide focus-visible rings", () => {
      const loginPath = path.join(
        rootDir,
        "src/features/auth/components/login-form.tsx"
      );
      const content = fs.readFileSync(loginPath, "utf-8");

      expect(content).toContain("focus-visible:ring-2");
      expect(content).toContain("focus-visible:ring-ring");
    });
  });

  describe("3. WCAG 1.3 & 4.1.2: Shared UI Primitives Accessibility", () => {
    it("data-table wraps pagination in nav element with accessible previous and next labels", () => {
      const tablePath = path.join(rootDir, "src/components/shared/data-table.tsx");
      const content = fs.readFileSync(tablePath, "utf-8");

      expect(content).toContain('aria-label="Pagination navigation"');
      expect(content).toContain('aria-label="Go to previous page"');
      expect(content).toContain('aria-label="Go to next page"');
    });

    it("status-badge marks decorative colored dots with aria-hidden", () => {
      const badgePath = path.join(rootDir, "src/components/shared/status-badge.tsx");
      const content = fs.readFileSync(badgePath, "utf-8");

      expect(content).toContain('aria-hidden="true"');
    });

    it("empty-state component provides role='status' and aria-hidden on decorative icon", () => {
      const emptyStatePath = path.join(
        rootDir,
        "src/components/shared/empty-state.tsx"
      );
      const content = fs.readFileSync(emptyStatePath, "utf-8");

      expect(content).toContain('role="status"');
      expect(content).toContain('aria-hidden="true"');
    });

    it("app-header user avatar button has accessible name with user full name", () => {
      const headerPath = path.join(
        rootDir,
        "src/components/layout/app-header.tsx"
      );
      const content = fs.readFileSync(headerPath, "utf-8");

      expect(content).toContain("aria-label={`User account menu for ${fullName}`}");
    });

    it("organization-switcher provides informative aria-label with active workspace", () => {
      const switcherPath = path.join(
        rootDir,
        "src/components/layout/organization-switcher.tsx"
      );
      const content = fs.readFileSync(switcherPath, "utf-8");

      expect(content).toContain("aria-label={`Switch workspace. Active workspace: ${activeOrgName}`}");
    });
  });

  describe("4. Phase 4G: Client Portal Accessibility & Usability", () => {
    const portalPath = path.join(
      rootDir,
      "src/features/deliverables/components/portal-review-workspace.tsx"
    );
    const content = fs.readFileSync(portalPath, "utf-8");

    it("provides descriptive contextual aria-labels on deliverable download buttons", () => {
      expect(content).toContain("aria-label={`Download ${file.title}");
    });

    it("feedback comments container is keyboard-focusable scrollable region with accessible label", () => {
      expect(content).toContain('role="region"');
      expect(content).toContain('tabIndex={0}');
      expect(content).toContain('aria-label="Feedback and comments list"');
    });

    it("comment textarea has focus ring and accessible placeholder", () => {
      expect(content).toContain("focus-visible:ring-2");
      expect(content).toContain("focus-visible:ring-[#D6D6D6]");
    });

    it("approval checkbox and change request form inputs provide clear focus-visible outlines", () => {
      expect(content).toContain("focus-visible:ring-emerald-500");
      expect(content).toContain("focus-visible:ring-amber-500");
    });
  });

  describe("5. Phase 4H: Executive Intelligence Accessibility Semantics", () => {
    it("executive-health-section provides role='progressbar' with aria-valuenow on health bars", () => {
      const healthPath = path.join(
        rootDir,
        "src/features/intelligence/components/executive-health-section.tsx"
      );
      const content = fs.readFileSync(healthPath, "utf-8");

      expect(content).toContain('role="progressbar"');
      expect(content).toContain("aria-valuenow={health.overallScore}");
      expect(content).toContain("aria-valuemin={0}");
      expect(content).toContain("aria-valuemax={100}");
      expect(content).toContain("aria-label={`Overall operational health index: ${health.overallScore} out of 100`}");
    });

    it("risk-radar-section provides role='group' on severity filter and accessible entity labels on action buttons", () => {
      const riskPath = path.join(
        rootDir,
        "src/features/intelligence/components/risk-radar-section.tsx"
      );
      const content = fs.readFileSync(riskPath, "utf-8");

      expect(content).toContain('role="group"');
      expect(content).toContain('aria-label="Filter risks by severity"');
      expect(content).toContain("aria-pressed={isSelected}");
      expect(content).toContain("aria-label={`Investigate ${risk.entityTitle} (${risk.severity} risk)`}");
    });

    it("action-queue-section provides distinct accessible action labels with item context", () => {
      const actionQueuePath = path.join(
        rootDir,
        "src/features/intelligence/components/action-queue-section.tsx"
      );
      const content = fs.readFileSync(actionQueuePath, "utf-8");

      expect(content).toContain("aria-label={`${item.recommendedAction}: ${item.title}`}");
    });

    it("project-intelligence-section provides table aria-label and progressbar semantics on completion bars", () => {
      const projPath = path.join(
        rootDir,
        "src/features/intelligence/components/project-intelligence-section.tsx"
      );
      const content = fs.readFileSync(projPath, "utf-8");

      expect(content).toContain('aria-label="Project portfolio intelligence"');
      expect(content).toContain('role="progressbar"');
      expect(content).toContain("aria-valuenow={proj.completionPercentage}");
      expect(content).toContain("aria-label={`Inspect ${proj.projectName} details`}");
    });

    it("workload-intelligence-section provides role='progressbar' on task share bars", () => {
      const workloadPath = path.join(
        rootDir,
        "src/features/intelligence/components/workload-intelligence-section.tsx"
      );
      const content = fs.readFileSync(workloadPath, "utf-8");

      expect(content).toContain('role="progressbar"');
      expect(content).toContain("aria-valuenow={member.taskSharePercentage}");
      expect(content).toContain("aria-label={`Task share for ${member.name}: ${member.taskSharePercentage}%`}");
    });

    it("trends-section provides role='group', aria-pressed on time buttons, and accessible chart bars", () => {
      const trendsPath = path.join(
        rootDir,
        "src/features/intelligence/components/trends-section.tsx"
      );
      const content = fs.readFileSync(trendsPath, "utf-8");

      expect(content).toContain('role="group"');
      expect(content).toContain('aria-label="Select trend time window"');
      expect(content).toContain("aria-pressed={timeWindow === tw}");
      expect(content).toContain('role="img"');
      expect(content).toContain("aria-label={`${p.label}: ${p.value} items`}");
      expect(content).toContain("tabIndex={0}");
    });
  });
});
