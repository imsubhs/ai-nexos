import { describe, expect, it } from "vitest";
import {
  verifyActionRegistry,
  ACTION_POLICY_REGISTRY,
  PUBLIC_ACTION_MODULES,
  getActionPolicy,
} from "@/lib/security/action-registry";
import { RATE_LIMITS, type RateLimitPolicy } from "@/lib/security/rate-limit";

describe("Action Policy Registry Verification (Phase S6.3)", () => {
  it("verifies 100% public action coverage with zero unmapped actions and zero conflicts", () => {
    const verification = verifyActionRegistry();

    expect(verification.conflictingMappings).toEqual([]);
    expect(verification.unmappedActions).toEqual([]);
    expect(verification.totalDiscovered).toBe(201);
    expect(verification.totalRegistered).toBe(201);

    expect(verification.valid).toBe(true);
  });

  it("ensures all 31 public action modules are present in the inventory", () => {
    expect(PUBLIC_ACTION_MODULES.length).toBe(31);
  });

  it("verifies every registered action maps to a valid S6.2 policy", () => {
    const validPolicies = new Set<RateLimitPolicy>(Object.values(RATE_LIMITS));

    for (const [key, mapping] of Object.entries(ACTION_POLICY_REGISTRY)) {
      expect(
        validPolicies.has(mapping.policy),
        `Action ${key} must reference a valid policy in RATE_LIMITS`,
      ).toBe(true);

      expect(mapping.actionName.length).toBeGreaterThan(0);
      expect(mapping.modulePath.length).toBeGreaterThan(0);
      expect(mapping.resourceBounds.length).toBeGreaterThan(0);
      expect(mapping.authorization.length).toBeGreaterThan(0);
    }
  });

  it("correctly retrieves policy mapping using getActionPolicy helper", () => {
    const projectPolicy = getActionPolicy(
      "src/features/projects/actions.ts",
      "createProject",
    );
    expect(projectPolicy).toBeDefined();
    expect(projectPolicy?.policy.name).toBe("resource:mutation");

    const searchPolicy = getActionPolicy(
      "src/features/search/actions.ts",
      "globalSearch",
    );
    expect(searchPolicy).toBeDefined();
    expect(searchPolicy?.policy.name).toBe("search:expensive");

    const reportPolicy = getActionPolicy(
      "src/features/workforce/attendance/read-model-actions.ts",
      "getWorkforceReportAction",
    );
    expect(reportPolicy).toBeDefined();
    expect(reportPolicy?.policy.name).toBe("report:expensive");

    const orgCreationPolicy = getActionPolicy(
      "src/features/organizations/onboarding-actions.ts",
      "createOrganizationAction",
    );
    expect(orgCreationPolicy).toBeDefined();
    expect(orgCreationPolicy?.policy.name).toBe("org:creation");
  });
});
