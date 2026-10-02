// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  resetRateLimitState,
  __simulateRedisFailure,
  __setRateLimitRedisClient,
} from "@/lib/security/rate-limit";
import {
  createOrganizationAction,
  previewInvitationAction,
} from "@/features/organizations/onboarding-actions";
import { globalSearch } from "@/features/search/actions";
import { getWorkforceReportAction } from "@/features/workforce/attendance/read-model-actions";
import { DELETE as deletePortalSession } from "@/app/api/v1/portal/auth/session/route";
import { ApiError } from "@/lib/security/errors";

const mockCurrentUser = {
  userId: "user-high-risk-uuid",
  organizationId: "org-high-risk-uuid",
  organizationTimezone: "UTC",
  permissions: {
    attendance: ["view_team", "clock_in"],
    corrections: ["review"],
  },
};

vi.mock("@/features/auth/current-user", () => ({
  requireCurrentUser: async () => mockCurrentUser,
  getCurrentUser: async () => mockCurrentUser,
}));

vi.mock("next/headers", () => ({
  headers: async () => ({
    get: (name: string) =>
      name.toLowerCase() === "x-forwarded-for" ? "203.0.113.195" : null,
  }),
  cookies: async () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock("@/features/organizations/invitation-service", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/features/organizations/invitation-service")
  >();
  return {
    ...actual,
    getInvitationByToken: vi.fn(async () => null),
  };
});

describe("High-Risk Surface Remediation Tests (Phase S6.3)", () => {
  beforeEach(() => {
    resetRateLimitState();
    vi.restoreAllMocks();
  });

  describe("Organization Creation (ORG_CREATION & Fail-Closed)", () => {
    it("throttles organization creation after exceeding budget", async () => {
      // Degraded/local test limit for orgCreation is 1
      const res1 = await createOrganizationAction({
        organizationName: "Test Org 1",
      });
      // Either succeeds or fails with validation/service error, but NOT rate limited yet
      expect(res1.error).not.toMatch(/Too many organization creation requests/);

      // Subsequent attempt throttles
      const throttled = await createOrganizationAction({
        organizationName: "Test Org 2",
      });
      expect(throttled.success).toBe(false);
      expect(throttled.error).toMatch(/Too many organization creation requests/);
    });

    it("enforces fail-closed on Redis failure for organization creation", async () => {
      __simulateRedisFailure();

      const result = await createOrganizationAction({
        organizationName: "Fail Closed Org",
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(
        /Organization creation is temporarily unavailable due to system maintenance/,
      );

      __setRateLimitRedisClient(null);
    });
  });

  describe("Invitation Preview (Coarse Prefix Bucket Protection)", () => {
    it("silently rejects preview queries after exceeding prefix-bucket budget", async () => {
      // Dummy raw token (64 hex characters)
      const rawToken = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

      // Limit in degraded mode is 10
      for (let i = 0; i < 10; i++) {
        await previewInvitationAction({ rawToken });
      }

      // 11th request throttles (returns INVITATION_NOT_FOUND to avoid confirming existence)
      const throttled = await previewInvitationAction({ rawToken });
      expect(throttled.valid).toBe(false);
      expect(throttled.error).toBe("INVITATION_NOT_FOUND");
    });
  });

  describe("Search Bounds (min 2, max 64, SEARCH_EXPENSIVE)", () => {
    it("returns empty array for search terms shorter than 2 characters", async () => {
      expect(await globalSearch("")).toEqual([]);
      expect(await globalSearch(" ")).toEqual([]);
      expect(await globalSearch("a")).toEqual([]);
    });

    it("returns empty array for search terms longer than 64 characters", async () => {
      const longTerm = "a".repeat(65);
      expect(await globalSearch(longTerm)).toEqual([]);
    });

    it("throttles globalSearch when SEARCH_EXPENSIVE rate limit is exceeded", async () => {
      // Degraded limit for searchExpensive is 10
      for (let i = 0; i < 10; i++) {
        try {
          await globalSearch("valid query");
        } catch (err: unknown) {
          // May fail on auth in test env, but not rate limited yet
          expect((err as ApiError)?.code).not.toBe("rate_limited");
        }
      }

      // 11th search request must throw ApiError with rate_limited code
      await expect(globalSearch("valid query")).rejects.toThrow(
        /Too many search requests/,
      );
    });
  });

  describe("Workforce Report (Date Bounds, 31-day clamp, REPORT_EXPENSIVE)", () => {
    it("rejects invalid date format or inverted date range", async () => {
      await expect(
        getWorkforceReportAction({ from: "invalid", to: "2026-03-01" }),
      ).rejects.toThrow(/Invalid date range/);

      await expect(
        getWorkforceReportAction({ from: "2026-03-31", to: "2026-03-01" }),
      ).rejects.toThrow(/Invalid date range/);
    });

    it("rejects date range exceeding 31 days with 400 Bad Request", async () => {
      await expect(
        getWorkforceReportAction({
          from: "2026-01-01",
          to: "2026-03-01", // 59 days!
        }),
      ).rejects.toThrow(/cannot exceed 31 days/);
    });

    it("throttles workforce report when REPORT_EXPENSIVE budget is exceeded", async () => {
      // Degraded limit for reportExpensive is 2
      for (let i = 0; i < 2; i++) {
        try {
          await getWorkforceReportAction({
            from: "2026-03-01",
            to: "2026-03-15",
          });
        } catch (err: unknown) {
          expect((err as ApiError)?.code).not.toBe("rate_limited");
        }
      }

      // 3rd report request throws rate_limited
      await expect(
        getWorkforceReportAction({ from: "2026-03-01", to: "2026-03-15" }),
      ).rejects.toThrow(/Too many report requests/);
    });
  });

  describe("Route Handlers (DELETE /api/v1/portal/auth/session)", () => {
    it("returns HTTP 429 when DELETE portal session exceeds rate limit", async () => {
      const makeRequest = () =>
        new Request("http://localhost:3000/api/v1/portal/auth/session", {
          method: "DELETE",
          headers: {
            host: "localhost:3000",
            origin: "http://localhost:3000",
            "x-forwarded-for": "203.0.113.195",
          },
        });

      // Limit for portalSessionByIp is 20 per 300s
      for (let i = 0; i < 20; i++) {
        const res = await deletePortalSession(makeRequest());
        expect(res.status).not.toBe(429);
      }

      // 21st request receives HTTP 429 with Retry-After and RateLimit headers
      const throttledRes = await deletePortalSession(makeRequest());
      expect(throttledRes.status).toBe(429);
      expect(throttledRes.headers.get("Retry-After")).toBeDefined();
      expect(throttledRes.headers.get("RateLimit-Limit")).toBe("20");
      expect(throttledRes.headers.get("RateLimit-Remaining")).toBe("0");
    });
  });
});
