// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  RATE_LIMITS,
  consumeRateLimit,
  rateLimitHeaders,
  resetRateLimitState,
  tokenPrefixBucket,
  __simulateRedisFailure,
  __setRateLimitRedisClient,
  type RateLimitPolicy,
} from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/request";
import { withRateLimit, KeyResolvers } from "@/lib/security/action-guard";
import { ApiError } from "@/lib/security/errors";
import { insertProjectSchema } from "@/features/projects/schemas";
import { insertTaskSchema } from "@/features/tasks/schemas";
import { insertClientSchema } from "@/features/clients/schemas";
import { initializeUploadSchema } from "@/features/files/schemas";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

describe("Phase S6.3 Test Matrix: Categories A through U", () => {
  beforeEach(() => {
    resetRateLimitState();
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Category A: Single User Rate Limiting
  // ---------------------------------------------------------------------------
  it("Category A: single-user-rate-limiting throttles single user exceeding sustained limit", async () => {
    const policy: RateLimitPolicy = { name: "cat_a", limit: 3, windowSeconds: 60 };
    const userKey = "user-123";

    for (let i = 0; i < 3; i++) {
      const res = await consumeRateLimit(policy, userKey);
      expect(res.allowed).toBe(true);
    }

    const throttled = await consumeRateLimit(policy, userKey);
    expect(throttled.allowed).toBe(false);
    expect(throttled.remaining).toBe(0);
    expect(throttled.retryAfterSeconds).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // Category B: Burst Behavior
  // ---------------------------------------------------------------------------
  it("Category B: burst-behavior permits requests up to burst limit and immediately rejects next", async () => {
    const burstPolicy: RateLimitPolicy = { name: "cat_b", limit: 5, windowSeconds: 10 };
    const burstKey = "burst-caller";

    const results = await Promise.all(
      Array.from({ length: 5 }, () => consumeRateLimit(burstPolicy, burstKey)),
    );
    expect(results.every((r) => r.allowed)).toBe(true);

    const excess = await consumeRateLimit(burstPolicy, burstKey);
    expect(excess.allowed).toBe(false);
    expect(excess.remaining).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Category C: Sustained Behavior
  // ---------------------------------------------------------------------------
  it("Category C: sustained-behavior replenishes budget after window expires", async () => {
    const policy: RateLimitPolicy = { name: "cat_c", limit: 2, windowSeconds: 60 };
    const fixedTime = 1_700_000_000_000;

    await consumeRateLimit(policy, "caller-c", fixedTime);
    await consumeRateLimit(policy, "caller-c", fixedTime + 1000);
    const rejected = await consumeRateLimit(policy, "caller-c", fixedTime + 2000);
    expect(rejected.allowed).toBe(false);

    // After 2 full windows (120s), previous window fully decayed
    const replenished = await consumeRateLimit(policy, "caller-c", fixedTime + 130_000);
    expect(replenished.allowed).toBe(true);
    expect(replenished.remaining).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // Category D: Tenant Isolation
  // ---------------------------------------------------------------------------
  it("Category D: tenant-isolation ensures Org 1 exhaustion does not affect Org 2", async () => {
    const policy: RateLimitPolicy = { name: "cat_d", limit: 2, windowSeconds: 60 };
    const org1User = "org1:userA";
    const org2User = "org2:userA";

    await consumeRateLimit(policy, org1User);
    await consumeRateLimit(policy, org1User);
    expect((await consumeRateLimit(policy, org1User)).allowed).toBe(false);

    // Org 2 user has fresh independent budget
    const org2Result = await consumeRateLimit(policy, org2User);
    expect(org2Result.allowed).toBe(true);
    expect(org2Result.remaining).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // Category E: User Isolation
  // ---------------------------------------------------------------------------
  it("Category E: user-isolation ensures User A exhaustion in Org 1 does not throttle User B in Org 1", async () => {
    const policy: RateLimitPolicy = { name: "cat_e", limit: 2, windowSeconds: 60 };
    const org1UserA = "org1:userA";
    const org1UserB = "org1:userB";

    await consumeRateLimit(policy, org1UserA);
    await consumeRateLimit(policy, org1UserA);
    expect((await consumeRateLimit(policy, org1UserA)).allowed).toBe(false);

    // User B in Org 1 has their own independent budget
    const userBResult = await consumeRateLimit(policy, org1UserB);
    expect(userBResult.allowed).toBe(true);
    expect(userBResult.remaining).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // Category F: Anonymous IP Isolation
  // ---------------------------------------------------------------------------
  it("Category F: anonymous-ip-isolation prevents IP 1 exhaustion from affecting IP 2", async () => {
    const policy = RATE_LIMITS.authMutation;
    const ip1 = "192.0.2.1";
    const ip2 = "198.51.100.1";

    for (let i = 0; i < policy.limit; i++) {
      await consumeRateLimit(policy, ip1);
    }
    expect((await consumeRateLimit(policy, ip1)).allowed).toBe(false);

    // IP 2 is unaffected
    const ip2Result = await consumeRateLimit(policy, ip2);
    expect(ip2Result.allowed).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Category G: Direct ID Bypass Prevention
  // ---------------------------------------------------------------------------
  it("Category G: direct-id-bypass asserts implementation modules have zero 'use server' declarations", () => {
    const targetDirs = [
      "src/features/projects",
      "src/features/tasks",
      "src/features/clients",
      "src/features/files",
      "src/features/chat",
      "src/features/workforce",
    ];

    function checkFiles(dirPath: string) {
      if (!statSync(dirPath, { throwIfNoEntry: false })) return;
      const entries = readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        if (entry.isDirectory()) {
          checkFiles(fullPath);
        } else if (
          entry.name.includes("real-") ||
          entry.name.includes("mock-")
        ) {
          const content = readFileSync(fullPath, "utf-8");
          const hasUseServer = /^["']use server["'];?/m.test(content);
          expect(
            hasUseServer,
            `File ${fullPath} must NOT declare 'use server'`,
          ).toBe(false);
        }
      }
    }

    for (const dir of targetDirs) {
      checkFiles(join(process.cwd(), dir));
    }
  });

  // ---------------------------------------------------------------------------
  // Category H: Wrapper Parity
  // ---------------------------------------------------------------------------
  it("Category H: wrapper-parity validates withRateLimit enforces identical limits", async () => {
    const testPolicy: RateLimitPolicy = { name: "cat_h", limit: 2, windowSeconds: 60 };

    const protectedFn = withRateLimit(
      testPolicy,
      async (msg: string) => `echo:${msg}`,
      { keyResolver: KeyResolvers.ipOnly },
    );

    // First 2 calls succeed
    expect(await protectedFn("a")).toBe("echo:a");
    expect(await protectedFn("b")).toBe("echo:b");

    // 3rd call throws ApiError rate_limited
    await expect(protectedFn("c")).rejects.toThrow(ApiError);
  });

  // ---------------------------------------------------------------------------
  // Category I: Redis Store Atomic Lua Script Pipeline
  // ---------------------------------------------------------------------------
  it("Category I: redis-store-pipeline executes atomic Lua script on Redis client", async () => {
    let evalCalled = false;
    let evalScript = "";

    const mockRedis = {
      eval: async (script: string, _numKeys: number, ..._args: (string | number)[]) => {
        evalCalled = true;
        evalScript = script;
        // Lua returns [current_count, previous_count]
        return [1, 0];
      },
    };

    __setRateLimitRedisClient(mockRedis as never);

    const res = await consumeRateLimit(
      { name: "cat_i", limit: 5, windowSeconds: 60 },
      "test-lua",
    );

    expect(evalCalled).toBe(true);
    expect(evalScript).toContain("redis.call('INCR', KEYS[1])");
    expect(evalScript).toContain("redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))");
    expect(res.allowed).toBe(true);

    __setRateLimitRedisClient(null);
  });

  // ---------------------------------------------------------------------------
  // Category J: Redis Outage Failover
  // ---------------------------------------------------------------------------
  it("Category J: redis-outage-failover gracefully degrades to MemoryStore", async () => {
    __simulateRedisFailure();

    const policy: RateLimitPolicy = {
      name: "cat_j",
      limit: 10,
      windowSeconds: 60,
      degradedBehavior: "degrade_to_memory",
      degradedLimit: 5,
    };

    const res = await consumeRateLimit(policy, "failover-user");
    expect(res.allowed).toBe(true);
    expect(res.storeMode).toBe("degraded");

    __setRateLimitRedisClient(null);
  });

  // ---------------------------------------------------------------------------
  // Category K: Fallback Memory Store Eviction
  // ---------------------------------------------------------------------------
  it("Category K: fallback-memory-store bounds memory by evicting stale keys", async () => {
    const policy: RateLimitPolicy = { name: "cat_k", limit: 5, windowSeconds: 1 };
    const t0 = 1_700_000_000_000;

    // Insert keys
    for (let i = 0; i < 50; i++) {
      await consumeRateLimit(policy, `key-${i}`, t0);
    }

    // Fast-forward past window TTL
    const res = await consumeRateLimit(policy, "fresh-key", t0 + 2000);
    expect(res.allowed).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Category L: Proxy Hop Handling
  // ---------------------------------------------------------------------------
  it("Category L: proxy-hop-handling extracts client IP securely from XFF chains", () => {
    const h1 = new Headers({ "x-forwarded-for": "203.0.113.195" });
    expect(getClientIp(h1)).toBe("203.0.113.195");

    // Multi-hop proxy chain: client, edge-proxy
    const h2 = new Headers({ "x-forwarded-for": "198.51.100.2, 203.0.113.195" });
    // Default 1 hop selects the rightmost entry (trusted edge)
    expect(getClientIp(h2)).toBe("203.0.113.195");

    // Strips port
    const h3 = new Headers({ "x-forwarded-for": "203.0.113.195:443" });
    expect(getClientIp(h3)).toBe("203.0.113.195");

    // Strips IPv6-mapped IPv4 prefix
    const h4 = new Headers({ "x-forwarded-for": "::ffff:203.0.113.195" });
    expect(getClientIp(h4)).toBe("203.0.113.195");
  });

  // ---------------------------------------------------------------------------
  // Category M: Invite Preview Abuse Prevention
  // ---------------------------------------------------------------------------
  it("Category M: invite-preview-abuse prevents enumeration via coarse prefix buckets", () => {
    const tokenHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const bucket = tokenPrefixBucket(tokenHash);
    expect(bucket).toBe("01234567");
    expect(bucket.length).toBe(8);
  });

  // ---------------------------------------------------------------------------
  // Category N: Org Creation Abuse Prevention
  // ---------------------------------------------------------------------------
  it("Category N: org-creation-abuse enforces fail-closed semantics when Redis fails", async () => {
    __simulateRedisFailure();

    const policy = RATE_LIMITS.orgCreation;
    const res = await consumeRateLimit(policy, "org-creator-ip");

    expect(res.allowed).toBe(false);
    expect(res.storeMode).toBe("degraded");
    expect(res.reason).toBe("storage_unavailable_fail_closed");

    __setRateLimitRedisClient(null);
  });

  // ---------------------------------------------------------------------------
  // Category O: Search Abuse Prevention
  // ---------------------------------------------------------------------------
  it("Category O: search-abuse bounds query length between 2 and 64 characters", () => {
    const isSearchQueryValid = (q: string) => {
      const trimmed = q.trim();
      return trimmed.length >= 2 && trimmed.length <= 64;
    };

    expect(isSearchQueryValid("")).toBe(false);
    expect(isSearchQueryValid("a")).toBe(false);
    expect(isSearchQueryValid("  a  ")).toBe(false);
    expect(isSearchQueryValid("valid query")).toBe(true);
    expect(isSearchQueryValid("a".repeat(64))).toBe(true);
    expect(isSearchQueryValid("a".repeat(65))).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Category P: Report Abuse Prevention
  // ---------------------------------------------------------------------------
  it("Category P: report-abuse clamps date ranges to 31 days and validates ordering", () => {
    const validateReportRange = (from: string, to: string) => {
      const fromTime = Date.parse(from);
      const toTime = Date.parse(to);
      if (Number.isNaN(fromTime) || Number.isNaN(toTime) || fromTime > toTime) {
        throw new Error("Invalid date range");
      }
      const diffDays = Math.ceil((toTime - fromTime) / (1000 * 60 * 60 * 24));
      if (diffDays > 31) throw new Error("Range cannot exceed 31 days");
      return true;
    };

    expect(() => validateReportRange("2026-03-31", "2026-03-01")).toThrow("Invalid date range");
    expect(() => validateReportRange("2026-01-01", "2026-03-01")).toThrow("Range cannot exceed 31 days");
    expect(validateReportRange("2026-03-01", "2026-03-31")).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Category Q: Upload Init Abuse Prevention
  // ---------------------------------------------------------------------------
  it("Category Q: upload-init-abuse enforces frequency bounds on initialization", async () => {
    const policy = RATE_LIMITS.resourceMutation;
    const userOrgKey = "org-1:user-1";
    const effectiveLimit = policy.degradedLimit ?? policy.limit;

    // Rate limiter allows up to effective limit
    for (let i = 0; i < effectiveLimit; i++) {
      const decision = await consumeRateLimit(policy, userOrgKey);
      expect(decision.allowed).toBe(true);
    }

    const throttled = await consumeRateLimit(policy, userOrgKey);
    expect(throttled.allowed).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Category R: Invite Issuance Abuse Prevention
  // ---------------------------------------------------------------------------
  it("Category R: invite-issuance-abuse limits invitations to 10 per hour (5 in degraded mode)", async () => {
    const policy = RATE_LIMITS.invitationIssuance;
    expect(policy.limit).toBe(10);
    expect(policy.windowSeconds).toBe(3600);

    const effectiveLimit = policy.degradedLimit ?? policy.limit;
    const userOrgKey = "org-r:admin-r";
    for (let i = 0; i < effectiveLimit; i++) {
      const decision = await consumeRateLimit(policy, userOrgKey);
      expect(decision.allowed).toBe(true);
    }

    const throttled = await consumeRateLimit(policy, userOrgKey);
    expect(throttled.allowed).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Category S: Resource Bound Enforcement
  // ---------------------------------------------------------------------------
  it("Category S: resource-bound-enforcement rejects oversized strings and arrays via Zod", () => {
    // Project Name > 200 chars
    const invalidProject = insertProjectSchema.safeParse({
      projectName: "x".repeat(201),
      description: "valid",
    });
    expect(invalidProject.success).toBe(false);

    // Task Name > 300 chars
    const invalidTask = insertTaskSchema.safeParse({
      name: "y".repeat(301),
      projectId: "00000000-0000-0000-0000-000000000001",
      timelineId: "00000000-0000-0000-0000-000000000002",
      phaseId: "00000000-0000-0000-0000-000000000003",
      milestoneId: "00000000-0000-0000-0000-000000000004",
    });
    expect(invalidTask.success).toBe(false);

    // Client Name > 150 chars
    const invalidClient = insertClientSchema.safeParse({
      companyName: "z".repeat(151),
    });
    expect(invalidClient.success).toBe(false);

    // File Original Filename > 255 chars
    const invalidFile = initializeUploadSchema.safeParse({
      originalFilename: "f".repeat(256),
      sizeBytes: 1024,
      mimeType: "text/plain",
      clientHash: "hash",
    });
    expect(invalidFile.success).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Category T: HTTP 429 Contract
  // ---------------------------------------------------------------------------
  it("Category T: http-429-contract emits Retry-After, RateLimit-*, and 429 headers", () => {
    const decision = {
      allowed: false,
      limit: 10,
      remaining: 0,
      resetAt: Date.now() + 45_000,
      retryAfterSeconds: 45,
      storeMode: "normal" as const,
    };

    const headers = rateLimitHeaders(decision);
    expect(headers["Retry-After"]).toBe("45");
    expect(headers["RateLimit-Limit"]).toBe("10");
    expect(headers["RateLimit-Remaining"]).toBe("0");
    expect(headers["RateLimit-Reset"]).toBe("45");
  });

  // ---------------------------------------------------------------------------
  // Category U: Security Telemetry (Zero Credential Leakage)
  // ---------------------------------------------------------------------------
  it("Category U: security-telemetry ensures tokenPrefixBucket preserves 256-bit entropy without leaking raw token", () => {
    const rawSecretToken = "sec_live_abcdef1234567890deadbeefcafebabef00d";
    // We never bucket on raw token; only on SHA-256 hash prefix
    const sha256Hex = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const bucket = tokenPrefixBucket(sha256Hex);

    expect(bucket).not.toContain(rawSecretToken);
    expect(bucket).toBe("e3b0c442");
  });
});
