import { beforeEach, describe, expect, it } from "vitest";
import {
  RATE_LIMITS,
  consumeRateLimit,
  rateLimitHeaders,
  resetRateLimitState,
  type RateLimitPolicy,
} from "@/lib/security/rate-limit";

const policy: RateLimitPolicy = {
  name: "test",
  limit: 3,
  windowSeconds: 60,
};

/** A fixed instant on a window boundary, so window maths is exact in tests. */
const WINDOW_START = 1_800_000_000_000 - (1_800_000_000_000 % 60_000);

describe("rate limiter", () => {
  beforeEach(() => {
    resetRateLimitState();
  });

  it("permits requests up to the limit and refuses the one after", async () => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const result = await consumeRateLimit(policy, "caller", WINDOW_START);
      expect(result.allowed, `attempt ${attempt}`).toBe(true);
      expect(result.remaining).toBe(3 - attempt);
    }

    const refused = await consumeRateLimit(policy, "caller", WINDOW_START);
    expect(refused.allowed).toBe(false);
    expect(refused.remaining).toBe(0);
    expect(refused.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("keeps a separate budget per identifier", async () => {
    for (let i = 0; i < 3; i++) {
      await consumeRateLimit(policy, "first", WINDOW_START);
    }

    const other = await consumeRateLimit(policy, "second", WINDOW_START);
    expect(other.allowed).toBe(true);
    expect(other.remaining).toBe(2);
  });

  it("keeps a separate budget per policy for the same identifier", async () => {
    const other: RateLimitPolicy = {
      name: "other",
      limit: 3,
      windowSeconds: 60,
    };

    for (let i = 0; i < 3; i++) {
      await consumeRateLimit(policy, "caller", WINDOW_START);
    }

    expect(
      (await consumeRateLimit(other, "caller", WINDOW_START)).allowed,
    ).toBe(true);
  });

  it("does not allow a burst of 2x the limit across a window boundary", async () => {
    // Spend the whole budget at the very end of one window …
    const nearEnd = WINDOW_START + 59_000;
    for (let i = 0; i < 3; i++) {
      await consumeRateLimit(policy, "burst", nearEnd);
    }

    // … then try again immediately after the boundary. A fixed-window limiter
    // would hand out a fresh budget here; the weighted window must not.
    const justAfter = WINDOW_START + 60_000 + 1_000;
    const result = await consumeRateLimit(policy, "burst", justAfter);
    expect(result.allowed).toBe(false);
  });

  it("restores the budget once the previous window has fully aged out", async () => {
    for (let i = 0; i < 3; i++) {
      await consumeRateLimit(policy, "aged", WINDOW_START);
    }

    // Two windows later nothing from the original window is in the lookback.
    const later = WINDOW_START + 2 * 60_000;
    const result = await consumeRateLimit(policy, "aged", later);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("reports Retry-After only when the request was refused", async () => {
    const allowed = await consumeRateLimit(policy, "headers", WINDOW_START);
    expect(rateLimitHeaders(allowed)["Retry-After"]).toBeUndefined();
    expect(rateLimitHeaders(allowed)["RateLimit-Limit"]).toBe("3");

    for (let i = 0; i < 3; i++) {
      await consumeRateLimit(policy, "headers", WINDOW_START);
    }
    const refused = await consumeRateLimit(policy, "headers", WINDOW_START);
    expect(rateLimitHeaders(refused)["Retry-After"]).toBeDefined();
  });

  it("configures a stricter per-account budget than per-IP for sign-in", () => {
    // A per-IP limit alone lets a botnet spray one account freely; the
    // per-account budget is the one that has to be tight.
    expect(RATE_LIMITS.loginByAccount.limit).toBeLessThan(
      RATE_LIMITS.loginByIp.limit,
    );
    expect(RATE_LIMITS.loginByAccount.windowSeconds).toBeGreaterThanOrEqual(
      RATE_LIMITS.loginByIp.windowSeconds,
    );
  });

  it("uses the Redis store when one is configured", async () => {
    const { __setRateLimitRedisClient } =
      await import("@/lib/security/rate-limit");

    const counters = new Map<string, number>();
    const client = {
      pipeline() {
        const ops: Array<() => [Error | null, unknown]> = [];
        const chain = {
          incr(key: string) {
            ops.push(() => {
              const next = (counters.get(key) ?? 0) + 1;
              counters.set(key, next);
              return [null, next];
            });
            return chain;
          },
          expire() {
            ops.push(() => [null, 1]);
            return chain;
          },
          get(key: string) {
            ops.push(() => [null, counters.get(key) ?? null]);
            return chain;
          },
          async exec() {
            return ops.map((op) => op());
          },
        };
        return chain;
      },
    };

    __setRateLimitRedisClient(client as never);

    for (let attempt = 1; attempt <= 3; attempt++) {
      expect(
        (await consumeRateLimit(policy, "redis", WINDOW_START)).allowed,
      ).toBe(true);
    }
    expect(
      (await consumeRateLimit(policy, "redis", WINDOW_START)).allowed,
    ).toBe(false);

    __setRateLimitRedisClient(null);
  });

  it("falls back to the in-process store when Redis throws", async () => {
    const { __setRateLimitRedisClient } =
      await import("@/lib/security/rate-limit");

    __setRateLimitRedisClient({
      pipeline() {
        const chain = {
          incr: () => chain,
          expire: () => chain,
          get: () => chain,
          exec: async () => {
            throw new Error("connection refused");
          },
        };
        return chain;
      },
    } as never);

    // A limiter outage must degrade, not reject: the request is still counted,
    // locally, and still allowed.
    const result = await consumeRateLimit(policy, "degraded", WINDOW_START);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);

    __setRateLimitRedisClient(null);
  });

  it("exports explicit REDIS_CLIENT_OPTIONS matching SLA requirements", async () => {
    const { REDIS_CLIENT_OPTIONS } = await import("@/lib/security/rate-limit");
    expect(REDIS_CLIENT_OPTIONS.connectTimeout).toBe(1500);
    expect(REDIS_CLIENT_OPTIONS.commandTimeout).toBe(500);
    expect(REDIS_CLIENT_OPTIONS.maxRetriesPerRequest).toBe(1);
    expect(REDIS_CLIENT_OPTIONS.enableOfflineQueue).toBe(false);
    expect(REDIS_CLIENT_OPTIONS.lazyConnect).toBe(false);
  });

  it("handles Redis command timeout by degrading to MemoryStore for standard policies", async () => {
    const { __setRateLimitRedisClient } = await import("@/lib/security/rate-limit");

    __setRateLimitRedisClient({
      async eval() {
        throw new Error("Command timed out after 500ms");
      },
    });

    const result = await consumeRateLimit(policy, "timed-out-caller", WINDOW_START);
    expect(result.storeMode).toBe("degraded");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);

    __setRateLimitRedisClient(null);
  });

  it("handles Redis command timeout by failing closed for orgCreation", async () => {
    const { __setRateLimitRedisClient, RATE_LIMITS } = await import("@/lib/security/rate-limit");

    __setRateLimitRedisClient({
      async eval() {
        throw new Error("Command timed out after 500ms");
      },
    });

    const result = await consumeRateLimit(RATE_LIMITS.orgCreation, "timed-out-org", WINDOW_START);
    expect(result.storeMode).toBe("degraded");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("storage_unavailable_fail_closed");

    __setRateLimitRedisClient(null);
  });

  it("operates in clean memory storeMode when REDIS_URL is unconfigured", async () => {
    const result = await consumeRateLimit(policy, "clean-memory-user", WINDOW_START);
    expect(result.allowed).toBe(true);
    expect(result.storeMode).toBe("memory");
  });
});
