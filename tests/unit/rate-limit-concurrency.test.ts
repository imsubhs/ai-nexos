import { beforeEach, describe, expect, it } from "vitest";
import {
  consumeRateLimit,
  resetRateLimitState,
  __setRateLimitRedisClient,
  __simulateRedisFailure,
  type RateLimitPolicy,
  type RedisLikeClient,
  REDIS_HIT_LUA_SCRIPT,
} from "@/lib/security/rate-limit";

const testPolicy: RateLimitPolicy = {
  name: "test-concurrency",
  limit: 10,
  windowSeconds: 60,
};

const failClosedPolicy: RateLimitPolicy = {
  name: "test-fail-closed",
  limit: 3,
  windowSeconds: 60,
  degradedBehavior: "fail_closed",
};

const WINDOW_START = 1_800_000_000_000 - (1_800_000_000_000 % 60_000);

describe("Rate Limiting Concurrency & Failure Semantics", () => {
  beforeEach(() => {
    resetRateLimitState();
  });

  describe("Redis Atomic Lua Script", () => {
    it("executes atomic Lua script when eval() is supported by client", async () => {
      let evalCalled = false;
      let evaluatedScript = "";
      const redisStore = new Map<string, number>();

      const mockRedisClient: RedisLikeClient = {
        async eval(script, numkeys, ...args) {
          evalCalled = true;
          evaluatedScript = script;
          const currentKey = String(args[0]);
          const previousKey = String(args[1]);

          const current = (redisStore.get(currentKey) ?? 0) + 1;
          redisStore.set(currentKey, current);
          const previous = redisStore.get(previousKey) ?? 0;

          return [current, previous];
        },
      };

      __setRateLimitRedisClient(mockRedisClient);

      const result = await consumeRateLimit(testPolicy, "user-lua", WINDOW_START);

      expect(evalCalled).toBe(true);
      expect(evaluatedScript).toBe(REDIS_HIT_LUA_SCRIPT);
      expect(result.allowed).toBe(true);
      expect(result.storeMode).toBe("normal");
      expect(result.remaining).toBe(9);

      __setRateLimitRedisClient(null);
    });

    it("safely handles 50 concurrent hits to the same key using atomic Lua", async () => {
      const redisStore = new Map<string, number>();

      const mockRedisClient: RedisLikeClient = {
        async eval(_script, _numkeys, ...args) {
          const currentKey = String(args[0]);
          const previousKey = String(args[1]);

          // Atomic execution simulation
          const current = (redisStore.get(currentKey) ?? 0) + 1;
          redisStore.set(currentKey, current);
          const previous = redisStore.get(previousKey) ?? 0;

          return [current, previous];
        },
      };

      __setRateLimitRedisClient(mockRedisClient);

      // Launch 50 concurrent requests simultaneously
      const promises = Array.from({ length: 50 }, () =>
        consumeRateLimit(testPolicy, "concurrent-key", WINDOW_START),
      );

      const results = await Promise.all(promises);

      const allowedCount = results.filter((r) => r.allowed).length;
      const rejectedCount = results.filter((r) => !r.allowed).length;

      // With limit = 10, exactly 10 requests must be allowed and 40 rejected
      expect(allowedCount).toBe(10);
      expect(rejectedCount).toBe(40);

      // Final count in redis must be exactly 50
      const currentKey = `rl:${testPolicy.name}:concurrent-key:${WINDOW_START}`;
      expect(redisStore.get(currentKey)).toBe(50);

      __setRateLimitRedisClient(null);
    });
  });

  describe("Weighted Sliding Window Approximation & Boundary Traffic", () => {
    it("bounds boundary bursts as a weighted approximation across adjacent windows", async () => {
      // Send 8 requests at the tail end of window 1 (limit is 10)
      const nearEnd = WINDOW_START + 59_000;
      for (let i = 0; i < 8; i++) {
        const res = await consumeRateLimit(testPolicy, "boundary-tester", nearEnd);
        expect(res.allowed).toBe(true);
      }

      // At 10 seconds into window 2:
      // Elapsed = 10s, previous window weight = 1 - (10/60) = 5/6 = ~0.833
      // Contribution from window 1 = 8 * 0.833 = ~6.67 requests.
      const earlyWindow2 = WINDOW_START + 60_000 + 10_000;

      // First request in window 2: current = 1, weighted = 1 + 6.67 = 7.67 <= 10 (allowed)
      const r1 = await consumeRateLimit(testPolicy, "boundary-tester", earlyWindow2);
      expect(r1.allowed).toBe(true);

      // Second request in window 2: current = 2, weighted = 2 + 6.67 = 8.67 <= 10 (allowed)
      const r2 = await consumeRateLimit(testPolicy, "boundary-tester", earlyWindow2);
      expect(r2.allowed).toBe(true);

      // Third request in window 2: current = 3, weighted = 3 + 6.67 = 9.67 <= 10 (allowed)
      const r3 = await consumeRateLimit(testPolicy, "boundary-tester", earlyWindow2);
      expect(r3.allowed).toBe(true);

      // Fourth request: current = 4, weighted = 4 + 6.67 = 10.67 > 10 (rejected!)
      const r4 = await consumeRateLimit(testPolicy, "boundary-tester", earlyWindow2);
      expect(r4.allowed).toBe(false);
      expect(r4.remaining).toBe(0);
    });

    it("permits fresh traffic after previous window has completely aged out", async () => {
      // Spend entire budget in window 1
      for (let i = 0; i < 10; i++) {
        await consumeRateLimit(testPolicy, "aged-tester", WINDOW_START);
      }

      // Check immediate rejection
      const rejected = await consumeRateLimit(testPolicy, "aged-tester", WINDOW_START + 1000);
      expect(rejected.allowed).toBe(false);

      // Advance by 2 full windows: previous window weight is 0
      const futureTime = WINDOW_START + 2 * 60_000 + 5000;
      const allowedAgain = await consumeRateLimit(testPolicy, "aged-tester", futureTime);
      expect(allowedAgain.allowed).toBe(true);
      expect(allowedAgain.remaining).toBe(9);
    });
  });

  describe("Redis Failure & Degradation Semantics", () => {
    it("distinguishes NORMAL distributed mode from DEGRADED local mode", async () => {
      // Normal mode with Redis
      const mockClient: RedisLikeClient = {
        async eval() {
          return [1, 0];
        },
      };
      __setRateLimitRedisClient(mockClient);

      const normalResult = await consumeRateLimit(testPolicy, "mode-test", WINDOW_START);
      expect(normalResult.storeMode).toBe("normal");

      // Degraded mode (Redis disconnected)
      __simulateRedisFailure();
      const degradedResult = await consumeRateLimit(testPolicy, "mode-test", WINDOW_START);
      expect(degradedResult.storeMode).toBe("degraded");

      __setRateLimitRedisClient(null);
    });

    it("enforces FAIL-CLOSED for critical policies like orgCreation on Redis failure", async () => {
      __simulateRedisFailure();

      const result = await consumeRateLimit(failClosedPolicy, "attacker", WINDOW_START);

      expect(result.allowed).toBe(false);
      expect(result.storeMode).toBe("degraded");
      expect(result.reason).toBe("storage_unavailable_fail_closed");
      expect(result.retryAfterSeconds).toBeGreaterThan(0);

      __setRateLimitRedisClient(null);
    });

    it("degrades gracefully to memory with emergency local cap for non-fail-closed policies", async () => {
      __simulateRedisFailure();

      const degradePolicy: RateLimitPolicy = {
        name: "test-degrade",
        limit: 10,
        windowSeconds: 60,
        degradedBehavior: "degrade_to_memory",
        degradedLimit: 2,
      };

      // 1st request allowed under degradedLimit = 2
      const r1 = await consumeRateLimit(degradePolicy, "local-user", WINDOW_START);
      expect(r1.allowed).toBe(true);
      expect(r1.storeMode).toBe("degraded");
      expect(r1.remaining).toBe(1);

      // 2nd request allowed
      const r2 = await consumeRateLimit(degradePolicy, "local-user", WINDOW_START);
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(0);

      // 3rd request rejected under degradedLimit = 2
      const r3 = await consumeRateLimit(degradePolicy, "local-user", WINDOW_START);
      expect(r3.allowed).toBe(false);
      expect(r3.storeMode).toBe("degraded");

      __setRateLimitRedisClient(null);
    });
  });

  describe("Multi-User and Multi-Tenant Concurrency", () => {
    it("concurrently tracks independent budgets for multiple tenants", async () => {
      const tenants = ["tenant-alpha", "tenant-beta", "tenant-gamma"];

      // Fire 10 concurrent requests for each tenant simultaneously (30 total)
      const allRequests = tenants.flatMap((tenantId) =>
        Array.from({ length: 10 }, () =>
          consumeRateLimit(testPolicy, tenantId, WINDOW_START),
        ),
      );

      const results = await Promise.all(allRequests);

      // All 30 requests should be allowed because each tenant gets 10 requests
      expect(results.every((r) => r.allowed)).toBe(true);

      // Attempting 11th request for tenant-alpha must be rejected
      const overAlpha = await consumeRateLimit(testPolicy, "tenant-alpha", WINDOW_START);
      expect(overAlpha.allowed).toBe(false);

      // But a request for a new tenant-delta must be allowed
      const newDelta = await consumeRateLimit(testPolicy, "tenant-delta", WINDOW_START);
      expect(newDelta.allowed).toBe(true);
    });
  });
});
