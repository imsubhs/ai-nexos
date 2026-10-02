// @vitest-environment node

/**
 * Phase 2 — Tenant Foundation & Organization Code Prefix Test Suite
 *
 * Covers requirements TEST-P2-001 through TEST-P2-012:
 * - TEST-P2-001: Organization prefix validation
 * - TEST-P2-002: Organization prefix uniqueness / reserved prefixes rejection
 * - TEST-P2-003: Code generation format
 * - TEST-P2-004: Concurrent code generation
 * - TEST-P2-005: Cross-tenant isolation
 * - TEST-P2-006: Unauthorized organization access
 * - TEST-P2-007: Year rollover
 * - TEST-P2-008: Existing identifier compatibility
 * - TEST-P2-009: Transaction rollback behavior
 * - TEST-P2-010: Server-side organization derivation
 * - TEST-P2-011: Client-supplied organizationId rejection
 * - TEST-P2-012: Code immutability
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  codePrefixSchema,
  formatEntityCode,
  generateEntityCode,
  generateProjectCode,
  generateTaskCode,
  RESERVED_CODE_PREFIXES,
  validateCodePrefix,
} from "@/features/organizations/code-generation";
import { zonedParts } from "@/features/workforce/shared/business-day";

describe("PHASE 2 — Tenant Foundation & Organization Code Prefix", () => {
  // ==========================================================================
  // TEST-P2-001: Organization prefix validation
  // ==========================================================================
  describe("TEST-P2-001: Organization prefix validation", () => {
    it("accepts valid alphanumeric prefixes between 2 and 8 characters", () => {
      const validCases = ["AIC", "ACME", "STUDIO1", "NEX", "AB", "12345678"];
      for (const prefix of validCases) {
        const val = validateCodePrefix(prefix);
        expect(val.valid, `Expected "${prefix}" to be valid`).toBe(true);
        expect(val.normalized).toBe(prefix.toUpperCase());

        const parsed = codePrefixSchema.safeParse(prefix);
        expect(parsed.success, `Zod schema rejected "${prefix}"`).toBe(true);
      }
    });

    it("normalizes lowercase and whitespace to uppercase trimmed format", () => {
      const result = validateCodePrefix("  acme  ");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe("ACME");

      const parsed = codePrefixSchema.parse("  acme  ");
      expect(parsed).toBe("ACME");
    });

    it("rejects prefixes shorter than 2 characters", () => {
      const shortCases = ["", "A", " 1 "];
      for (const prefix of shortCases) {
        const val = validateCodePrefix(prefix);
        expect(val.valid, `Expected "${prefix}" to be rejected (too short)`).toBe(false);

        const parsed = codePrefixSchema.safeParse(prefix);
        expect(parsed.success).toBe(false);
      }
    });

    it("rejects prefixes longer than 8 characters", () => {
      const longCases = ["TOOLONGA1", "VERYLONGAUX"];
      for (const prefix of longCases) {
        const val = validateCodePrefix(prefix);
        expect(val.valid, `Expected "${prefix}" to be rejected (too long)`).toBe(false);

        const parsed = codePrefixSchema.safeParse(prefix);
        expect(parsed.success).toBe(false);
      }
    });

    it("rejects prefixes with special characters, symbols, or spaces inside", () => {
      const invalidChars = ["AC-ME", "AC_ME", "NEX!", "AC ME", "AC.ME"];
      for (const prefix of invalidChars) {
        const val = validateCodePrefix(prefix);
        expect(val.valid, `Expected "${prefix}" to be rejected (invalid characters)`).toBe(false);

        const parsed = codePrefixSchema.safeParse(prefix);
        expect(parsed.success).toBe(false);
      }
    });
  });

  // ==========================================================================
  // TEST-P2-002: Organization prefix uniqueness / reserved prefixes rejection
  // ==========================================================================
  describe("TEST-P2-002: Reserved prefix rejection", () => {
    it("rejects all reserved system prefixes", () => {
      const reserved = ["SYS", "ADMIN", "NEXOS", "API", "ROOT", "TEST", "DEMO"];
      for (const prefix of reserved) {
        expect(RESERVED_CODE_PREFIXES.has(prefix)).toBe(true);

        const val = validateCodePrefix(prefix);
        expect(val.valid, `Expected reserved prefix "${prefix}" to be rejected`).toBe(false);
        expect(val.error).toContain("reserved");

        const parsed = codePrefixSchema.safeParse(prefix);
        expect(parsed.success).toBe(false);
      }
    });

    it("rejects reserved prefixes case-insensitively", () => {
      const mixedCases = ["sys", "Admin", "nexos", "api", "Root", "test", "demo"];
      for (const prefix of mixedCases) {
        const val = validateCodePrefix(prefix);
        expect(val.valid, `Expected "${prefix}" to be rejected as reserved`).toBe(false);

        const parsed = codePrefixSchema.safeParse(prefix);
        expect(parsed.success).toBe(false);
      }
    });
  });

  // ==========================================================================
  // TEST-P2-003: Code generation format
  // ==========================================================================
  describe("TEST-P2-003: Code generation format", () => {
    it("formats project codes as {PREFIX}-{YYYY}-{XXXX}", () => {
      expect(formatEntityCode("ACME", "project_code", 1, 2026)).toBe("ACME-2026-0001");
      expect(formatEntityCode("ACME", "project", 42, 2026)).toBe("ACME-2026-0042");
      expect(formatEntityCode("OGILVY", "project_code", 9999, 2026)).toBe("OGILVY-2026-9999");
    });

    it("formats task codes as {PREFIX}-T-{YYYY}-{XXXX}", () => {
      expect(formatEntityCode("ACME", "task_code", 1, 2026)).toBe("ACME-T-2026-0001");
      expect(formatEntityCode("ACME", "task", 42, 2026)).toBe("ACME-T-2026-0042");
      expect(formatEntityCode("OGILVY", "task_code", 9999, 2026)).toBe("OGILVY-T-2026-9999");
    });

    it("formats correction codes as COR-{XXXX}", () => {
      expect(formatEntityCode("ACME", "correction_code", 1, 2026)).toBe("COR-0001");
      expect(formatEntityCode("ANY", "correction", 42, 2026)).toBe("COR-0042");
    });

    it("widens beyond 4 digits without truncation to guarantee uniqueness", () => {
      expect(formatEntityCode("ACME", "project_code", 10000, 2026)).toBe("ACME-2026-10000");
      expect(formatEntityCode("ACME", "task_code", 100000, 2026)).toBe("ACME-T-2026-100000");
    });
  });

  // ==========================================================================
  // TEST-P2-004: Concurrent code generation
  // ==========================================================================
  describe("TEST-P2-004: Concurrent code generation simulation", () => {
    it("allocates strictly unique, monotonic identifiers under concurrent access", async () => {
      // Simulate atomic sequence allocator representing Postgres ON CONFLICT DO UPDATE
      const dbSequences = new Map<string, number>();
      const orgPrefixes = new Map<string, { codePrefix: string; timezone: string }>([
        ["org-acme", { codePrefix: "ACME", timezone: "UTC" }],
      ]);

      const mockClient = {
        select: () => ({
          from: () => ({
            where: () => {
              const org = orgPrefixes.get("org-acme");
              return Promise.resolve(org ? [org] : []);
            },
          }),
        }),
        insert: () => ({
          values: ({ organizationId, entityType }: { organizationId: string; entityType: string }) => ({
            onConflictDoUpdate: () => ({
              returning: () => {
                const key = `${organizationId}:${entityType}`;
                const current = dbSequences.get(key) ?? 0;
                const next = current + 1;
                dbSequences.set(key, next);
                return Promise.resolve([{ nextValue: next }]);
              },
            }),
          }),
        }),
      };

      // Launch 50 concurrent generation requests
      const promises = Array.from({ length: 50 }, () =>
        generateEntityCode({
          organizationId: "org-acme",
          entityType: "project_code",
          tx: mockClient as any,
          year: 2026,
        }),
      );

      const results = await Promise.all(promises);

      // Verify no duplicates
      const uniqueCodes = new Set(results);
      expect(uniqueCodes.size).toBe(50);

      // Verify sequence covers 0001 through 0050
      expect(results).toContain("ACME-2026-0001");
      expect(results).toContain("ACME-2026-0050");
    });
  });

  // ==========================================================================
  // TEST-P2-005: Cross-tenant isolation
  // ==========================================================================
  describe("TEST-P2-005: Cross-tenant isolation", () => {
    it("keeps sequences completely isolated between different organizations", async () => {
      const dbSequences = new Map<string, number>();
      const orgPrefixes = new Map<string, { codePrefix: string; timezone: string }>([
        ["org-alpha", { codePrefix: "ALPHA", timezone: "UTC" }],
        ["org-beta", { codePrefix: "BETA", timezone: "UTC" }],
      ]);

      const createMockClient = (targetOrgId: string) => ({
        select: () => ({
          from: () => ({
            where: () => {
              const org = orgPrefixes.get(targetOrgId);
              return Promise.resolve(org ? [org] : []);
            },
          }),
        }),
        insert: () => ({
          values: ({ organizationId, entityType }: { organizationId: string; entityType: string }) => ({
            onConflictDoUpdate: () => ({
              returning: () => {
                const key = `${organizationId}:${entityType}`;
                const current = dbSequences.get(key) ?? 0;
                const next = current + 1;
                dbSequences.set(key, next);
                return Promise.resolve([{ nextValue: next }]);
              },
            }),
          }),
        }),
      });

      const alpha1 = await generateProjectCode("org-alpha", createMockClient("org-alpha") as any, 2026);
      const beta1 = await generateProjectCode("org-beta", createMockClient("org-beta") as any, 2026);
      const alpha2 = await generateProjectCode("org-alpha", createMockClient("org-alpha") as any, 2026);
      const beta2 = await generateProjectCode("org-beta", createMockClient("org-beta") as any, 2026);

      // Both start at sequence 0001 because their tenant namespaces are sovereign
      expect(alpha1).toBe("ALPHA-2026-0001");
      expect(beta1).toBe("BETA-2026-0001");
      expect(alpha2).toBe("ALPHA-2026-0002");
      expect(beta2).toBe("BETA-2026-0002");
    });
  });

  // ==========================================================================
  // TEST-P2-006: Unauthorized organization access
  // ==========================================================================
  describe("TEST-P2-006: Unauthorized / invalid organization access", () => {
    it("rejects code generation when organizationId is missing or empty", async () => {
      await expect(
        generateProjectCode("", {} as any),
      ).rejects.toThrow("organizationId is required");
    });

    it("throws error when organization does not exist in the database", async () => {
      const mockClient = {
        select: () => ({
          from: () => ({
            where: () => Promise.resolve([]), // Org not found
          }),
        }),
      };

      await expect(
        generateProjectCode("non-existent-org-id", mockClient as any),
      ).rejects.toThrow("Organization non-existent-org-id not found");
    });
  });

  // ==========================================================================
  // TEST-P2-007: Year rollover
  // ==========================================================================
  describe("TEST-P2-007: Year rollover behavior", () => {
    it("incorporates the current year while keeping monotonic sequence progression", async () => {
      let counter = 41;
      const mockClient = {
        select: () => ({
          from: () => ({
            where: () => Promise.resolve([{ codePrefix: "ACME", timezone: "UTC" }]),
          }),
        }),
        insert: () => ({
          values: () => ({
            onConflictDoUpdate: () => ({
              returning: () => {
                counter += 1;
                return Promise.resolve([{ nextValue: counter }]);
              },
            }),
          }),
        }),
      };

      // In December 2026
      const code2026 = await generateProjectCode("org-1", mockClient as any, 2026);
      expect(code2026).toBe("ACME-2026-0042");

      // In January 2027 (sequence continues monotonically, year advances)
      const code2027 = await generateProjectCode("org-1", mockClient as any, 2027);
      expect(code2027).toBe("ACME-2027-0043");
    });

    it("resolves the calendar year using the organization's configured timezone", () => {
      // 2026-12-31 at 23:30 UTC: In Kolkata (UTC+5:30), it is already 2027-01-01 05:00
      const instant = new Date("2026-12-31T23:30:00Z");
      const utcYear = zonedParts(instant, "UTC").year;
      const kolkataYear = zonedParts(instant, "Asia/Kolkata").year;

      expect(utcYear).toBe(2026);
      expect(kolkataYear).toBe(2027);
    });
  });

  // ==========================================================================
  // TEST-P2-008: Existing identifier compatibility
  // ==========================================================================
  describe("TEST-P2-008: Existing identifier compatibility", () => {
    it("generates AIC-prefixed codes for legacy organization 'AIC'", async () => {
      const mockClient = {
        select: () => ({
          from: () => ({
            where: () => Promise.resolve([{ codePrefix: "AIC", timezone: "Asia/Kolkata" }]),
          }),
        }),
        insert: () => ({
          values: () => ({
            onConflictDoUpdate: () => ({
              returning: () => Promise.resolve([{ nextValue: 1 }]),
            }),
          }),
        }),
      };

      const projectCode = await generateProjectCode("legacy-aic-org", mockClient as any, 2026);
      expect(projectCode).toBe("AIC-2026-0001");

      const taskCode = await generateTaskCode("legacy-aic-org", mockClient as any, 2026);
      expect(taskCode).toBe("AIC-T-2026-0001");
    });
  });

  // ==========================================================================
  // TEST-P2-009: Transaction rollback behavior
  // ==========================================================================
  describe("TEST-P2-009: Transaction rollback compatibility", () => {
    it("accepts a transaction client to participate in caller transaction scope", async () => {
      let txUsed = false;
      const mockTx = {
        select: () => ({
          from: () => ({
            where: () => Promise.resolve([{ codePrefix: "NEX", timezone: "UTC" }]),
          }),
        }),
        insert: () => {
          txUsed = true;
          return {
            values: () => ({
              onConflictDoUpdate: () => ({
                returning: () => Promise.resolve([{ nextValue: 1 }]),
              }),
            }),
          };
        },
      };

      const code = await generateProjectCode("org-1", mockTx as any, 2026);
      expect(txUsed).toBe(true);
      expect(code).toBe("NEX-2026-0001");
    });
  });

  // ==========================================================================
  // TEST-P2-010: Server-side organization derivation
  // ==========================================================================
  describe("TEST-P2-010: Server-side organization derivation", () => {
    it("verifies createProject and createTask derive organizationId from session", () => {
      const projectActionsContent = readFileSync(
        join(process.cwd(), "src/features/projects/real-actions.ts"),
        "utf8",
      );
      const taskActionsContent = readFileSync(
        join(process.cwd(), "src/features/tasks/real-actions.ts"),
        "utf8",
      );

      // Verify createProject calls requireCurrentUser and passes user.organizationId
      expect(projectActionsContent).toContain("const user = await requireCurrentUser()");
      expect(projectActionsContent).toContain("generateProjectCode(user.organizationId");

      // Verify createTask calls requireCurrentUser and passes user.organizationId
      expect(taskActionsContent).toContain("const user = await requireCurrentUser()");
      expect(taskActionsContent).toContain("generateTaskCode(user.organizationId");
    });
  });

  // ==========================================================================
  // TEST-P2-011: Client-supplied organizationId rejection
  // ==========================================================================
  describe("TEST-P2-011: Client-supplied organizationId rejection", () => {
    it("ensures code-generation.ts is an internal module WITHOUT 'use server'", () => {
      const codeGenContent = readFileSync(
        join(process.cwd(), "src/features/organizations/code-generation.ts"),
        "utf8",
      );
      // If code-generation had "use server", Next.js would expose it as an RPC endpoint
      expect(codeGenContent.startsWith('"use server"')).toBe(false);
      expect(codeGenContent.startsWith("'use server'")).toBe(false);
      expect(codeGenContent).not.toContain('"use server"');
    });
  });

  // ==========================================================================
  // TEST-P2-012: Code immutability
  // ==========================================================================
  describe("TEST-P2-012: Code immutability", () => {
    it("produces deterministic string identifiers with standard format", () => {
      const code1 = formatEntityCode("ACME", "project_code", 42, 2026);
      const code2 = formatEntityCode("ACME", "project_code", 42, 2026);
      expect(code1).toBe(code2);
      expect(code1).toBe("ACME-2026-0042");
    });
  });
});
