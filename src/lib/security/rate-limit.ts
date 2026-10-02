/**
 * Rate limiting and brute-force control.
 *
 * The algorithm is a weighted sliding window approximation (O(1) time and space):
 * each request counts against the current fixed window plus the fraction of the
 * previous window still inside the lookback. Unlike an unbounded sliding log
 * (which requires O(N) memory per request), this two-counter weighted approximation
 * provides a bounded estimation of request frequency across sliding time windows.
 * While it bounds boundary burst potential significantly compared to naive fixed
 * windows, it is documented as a bounded/weighted approximation rather than a strict
 * mathematical guarantee against sub-window boundary bursts.
 *
 * Two stores, explicitly distinguished operational modes:
 *
 *   - NORMAL (Distributed Redis):
 *     When REDIS_URL is configured, enforcement uses an atomic Redis Lua script (EVAL).
 *     This provides a globally shared distributed budget across all server instances.
 *
 *   - DEGRADED (Per-Process MemoryStore):
 *     When Redis is unconfigured or unreachable, the limiter falls back to an in-memory
 *     store. This provides emergency local protection ONLY and does NOT preserve global
 *     distributed rate-limit guarantees across multiple instances.
 *
 * Fail-closed vs Degrade-to-memory:
 *   - orgCreation: enforces fail-closed on Redis failure in production (preventing mass
 *     tenant creation during infrastructure outages).
 *   - authentication / reads / mutations: degrade to local memory with an emergency cap,
 *     ensuring an infrastructure glitch does not cause total service lockout.
 */

import { hasRedis } from "@/lib/env.server";
import { log } from "./logger";

export type DegradedBehavior = "degrade_to_memory" | "fail_closed";

export type RateLimitPolicy = {
  /** Stable name; forms part of the storage key and appears in logs. */
  readonly name: string;
  /** Maximum requests permitted within the window. */
  readonly limit: number;
  /** Window length in seconds. */
  readonly windowSeconds: number;
  /**
   * Behavior when distributed storage (Redis) is unavailable:
   * - "degrade_to_memory": emergency local memory protection per process.
   * - "fail_closed": reject requests when distributed coordination fails.
   */
  readonly degradedBehavior?: DegradedBehavior;
  /** Emergency per-process limit when operating in degraded mode. */
  readonly degradedLimit?: number;
};

export type RateLimitResult = {
  readonly allowed: boolean;
  readonly limit: number;
  /** Requests still permitted in the current window; never negative. */
  readonly remaining: number;
  /** Epoch milliseconds at which the current window ends. */
  readonly resetAt: number;
  /** Seconds a client should wait before retrying. Zero when allowed. */
  readonly retryAfterSeconds: number;
  /**
   * Operational mode:
   * - "normal": backed by globally shared distributed Redis budget
   * - "memory": backed by single-instance in-memory store (standard when REDIS_URL is unconfigured)
   * - "degraded": backed by per-process emergency memory protection (or fail-closed)
   */
  readonly storeMode: "normal" | "memory" | "degraded";
  /** Reason for rejection if allowed is false */
  readonly reason?: "limit_exceeded" | "storage_unavailable_fail_closed";
};

/**
 * Extracts the first 8 hex characters (32 bits) of a 256-bit token SHA-256 hash.
 * This is used solely as a COARSE abuse-correlation bucket for rate-limiting
 * unauthenticated invitation token previews, preventing brute-force token enumeration.
 * It is NOT a unique token identifier — the full 256-bit token entropy is preserved
 * for database lookups and authentication.
 */
export function tokenPrefixBucket(tokenHash: string): string {
  const clean = tokenHash.trim().toLowerCase();
  return clean.slice(0, 8);
}

/**
 * The policies in force.
 *
 * Kept in one table rather than inline at each call site so the whole posture
 * can be reviewed at once, and so a limit can be tuned without hunting through
 * route handlers.
 */
export const RATE_LIMITS = {
  // ── S6.2 Canonical Policy Taxonomy ──
  authMutation: {
    name: "auth:mutation",
    limit: 5,
    windowSeconds: 900, // 5 / 15m
    degradedBehavior: "degrade_to_memory",
    degradedLimit: 3,
  },
  authRead: {
    name: "auth:read",
    limit: 30,
    windowSeconds: 300, // 30 / 5m
    degradedBehavior: "degrade_to_memory",
    degradedLimit: 15,
  },
  orgCreation: {
    name: "org:creation",
    limit: 3,
    windowSeconds: 86400, // 3 / 24h
    degradedBehavior: "fail_closed",
    degradedLimit: 1,
  },
  invitationIssuance: {
    name: "invitation:issuance",
    limit: 10,
    windowSeconds: 3600, // 10 / 1h
    degradedBehavior: "degrade_to_memory",
    degradedLimit: 5,
  },
  invitationPreview: {
    name: "invitation:preview",
    limit: 20,
    windowSeconds: 300, // 20 / 5m
    degradedBehavior: "degrade_to_memory",
    degradedLimit: 10,
  },
  resourceMutation: {
    name: "resource:mutation",
    limit: 60,
    windowSeconds: 60, // 60 / 1m
    degradedBehavior: "degrade_to_memory",
    degradedLimit: 30,
  },
  resourceRead: {
    name: "resource:read",
    limit: 120,
    windowSeconds: 60, // 120 / 1m
    degradedBehavior: "degrade_to_memory",
    degradedLimit: 60,
  },
  searchExpensive: {
    name: "search:expensive",
    limit: 20,
    windowSeconds: 60, // 20 / 1m
    degradedBehavior: "degrade_to_memory",
    degradedLimit: 10,
  },
  reportExpensive: {
    name: "report:expensive",
    limit: 5,
    windowSeconds: 300, // 5 / 5m
    degradedBehavior: "degrade_to_memory",
    degradedLimit: 2,
  },

  // ── Route & Legacy Policies (Preserved for compatibility) ──
  loginByIp: { name: "login:ip", limit: 10, windowSeconds: 300 },
  loginByAccount: { name: "login:account", limit: 5, windowSeconds: 900 },
  magicLinkByAccount: {
    name: "magiclink:account",
    limit: 3,
    windowSeconds: 900,
  },
  magicLinkByIp: { name: "magiclink:ip", limit: 10, windowSeconds: 900 },
  authCallbackByIp: { name: "authcallback:ip", limit: 30, windowSeconds: 300 },
  approvalVerifyByIp: {
    name: "approval:verify:ip",
    limit: 20,
    windowSeconds: 300,
  },
  portalSessionByIp: {
    name: "portal:session:ip",
    limit: 20,
    windowSeconds: 300,
  },
  portalReadBySession: {
    name: "portal:read:session",
    limit: 120,
    windowSeconds: 60,
  },
  sharePasswordBySession: {
    name: "share:password:session",
    limit: 5,
    windowSeconds: 900,
  },
} as const satisfies Record<string, RateLimitPolicy>;

// ─────────────────────────────────────────────────────────────────────────────
// Stores
// ─────────────────────────────────────────────────────────────────────────────

type WindowCounts = { current: number; previous: number };

interface RateLimitStore {
  /**
   * Increments the counter for `key` in the window starting at `windowStart`
   * and returns the count for that window and the one before it.
   */
  hit(
    key: string,
    windowStart: number,
    windowSeconds: number,
  ): Promise<WindowCounts>;
}

/**
 * Per-process store (DEGRADED mode).
 *
 * Bounded: an attacker rotating the identifier (a spoofed IP, a generated
 * email) would otherwise grow this map without limit, turning the defence into
 * the denial of service. When the cap is reached the oldest windows are dropped
 * first — they are the entries closest to expiring anyway.
 */
class MemoryStore implements RateLimitStore {
  private readonly buckets = new Map<
    string,
    { windowStart: number; count: number }
  >();
  private static readonly MAX_ENTRIES = 20_000;

  async hit(
    key: string,
    windowStart: number,
    windowSeconds: number,
  ): Promise<WindowCounts> {
    const windowMs = windowSeconds * 1000;
    const previousStart = windowStart - windowMs;

    this.evictBefore(previousStart);

    const currentKey = `${key}:${windowStart}`;
    const previousKey = `${key}:${previousStart}`;

    const existing = this.buckets.get(currentKey);
    const count = (existing?.count ?? 0) + 1;
    this.buckets.set(currentKey, { windowStart, count });

    if (this.buckets.size > MemoryStore.MAX_ENTRIES) this.evictOldest();

    return {
      current: count,
      previous: this.buckets.get(previousKey)?.count ?? 0,
    };
  }

  /** Drops windows that can no longer contribute to any decision. */
  private evictBefore(cutoff: number): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.windowStart < cutoff) this.buckets.delete(key);
    }
  }

  private evictOldest(): void {
    const excess = this.buckets.size - MemoryStore.MAX_ENTRIES;
    const oldest = [...this.buckets.entries()]
      .sort((a, b) => a[1].windowStart - b[1].windowStart)
      .slice(0, excess);
    for (const [key] of oldest) this.buckets.delete(key);
  }

  clear(): void {
    this.buckets.clear();
  }
}

const memoryStore = new MemoryStore();

/**
 * Atomic Lua script for Redis sliding-window hit:
 * KEYS[1]: currentKey (rl:${key}:${windowStart})
 * KEYS[2]: previousKey (rl:${key}:${windowStart - windowMs})
 * ARGV[1]: expireSeconds (windowSeconds * 2)
 *
 * Atomicity guarantee:
 * Executing as a single Lua script guarantees that INCR, the conditional EXPIRE on creation,
 * and GET of the previous window execute atomically on the Redis server without interleaving
 * commands from concurrent clients, preventing lost TTLs or race conditions.
 */
export const REDIS_HIT_LUA_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
end
local previous = redis.call('GET', KEYS[2])
return { current, previous }
`;

/**
 * Redis-backed store (NORMAL mode).
 *
 * Employs atomic Lua script execution to prevent race conditions across concurrent clients.
 */
class RedisStore implements RateLimitStore {
  constructor(private readonly client: RedisLikeClient) {}

  async hit(
    key: string,
    windowStart: number,
    windowSeconds: number,
  ): Promise<WindowCounts> {
    const windowMs = windowSeconds * 1000;
    const currentKey = `rl:${key}:${windowStart}`;
    const previousKey = `rl:${key}:${windowStart - windowMs}`;
    const ttlSeconds = windowSeconds * 2;

    if (typeof this.client.eval === "function") {
      const result = await this.client.eval(
        REDIS_HIT_LUA_SCRIPT,
        2,
        currentKey,
        previousKey,
        ttlSeconds,
      );
      if (!result || !Array.isArray(result)) {
        throw new Error("Redis Lua script returned unexpected result shape");
      }
      return {
        current: Number(result[0] ?? 0),
        previous: Number(result[1] ?? 0) || 0,
      };
    }

    if (typeof this.client.pipeline === "function") {
      const results = await this.client
        .pipeline()
        .incr(currentKey)
        .expire(currentKey, ttlSeconds)
        .get(previousKey)
        .exec();

      if (!results) throw new Error("Redis pipeline returned no result");

      const [incr, , previous] = results;
      if (incr?.[0]) throw incr[0];

      return {
        current: Number(incr?.[1] ?? 0),
        previous: Number(previous?.[1] ?? 0) || 0,
      };
    }

    throw new Error("Redis client must support eval() or pipeline()");
  }
}

/** The chainable subset of an ioredis pipeline this module builds. */
export interface RedisLikePipeline {
  incr(key: string): RedisLikePipeline;
  expire(key: string, seconds: number): RedisLikePipeline;
  get(key: string): RedisLikePipeline;
  exec(): Promise<Array<[Error | null, unknown]> | null>;
}

/** The slice of ioredis this module uses. Declared so tests can substitute it. */
export interface RedisLikeClient {
  eval?(
    script: string,
    numkeys: number,
    ...args: (string | number)[]
  ): Promise<unknown>;
  pipeline?(): RedisLikePipeline;
}

let redisStore: RedisStore | undefined;
let redisUnavailable = false;

/**
 * Resolves the Redis store, once.
 *
 * The import is dynamic so `ioredis` — and the TCP connection it opens on
 * construction — never loads in a build, a test, or a deployment that has no
 * REDIS_URL.
 */
export const REDIS_CLIENT_OPTIONS = {
  connectTimeout: 1500,
  commandTimeout: 500,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  lazyConnect: false,
} as const;

async function getRedisStore(): Promise<RateLimitStore | undefined> {
  if (redisStore) return redisStore;
  if (redisUnavailable || !hasRedis()) return undefined;

  try {
    const { default: Redis } = await import("ioredis");
    const client = new Redis(process.env.REDIS_URL as string, {
      ...REDIS_CLIENT_OPTIONS,
    });
    client.on("error", (error: Error) => {
      log.warn("ratelimit.redis_error", { error: error.message });
    });
    redisStore = new RedisStore(client as unknown as RedisLikeClient);
    return redisStore;
  } catch (error) {
    redisUnavailable = true;
    log.warn("ratelimit.redis_unavailable", {
      error: error instanceof Error ? error.message : String(error),
      note: "falling back to the per-process limiter",
    });
    return undefined;
  }
}

/** Test-only override, so the Redis path can be exercised without a server. */
export function __setRateLimitRedisClient(
  client: RedisLikeClient | null,
): void {
  redisStore = client ? new RedisStore(client) : undefined;
  redisUnavailable = false;
}

/** Test-only: simulate Redis failure. */
export function __simulateRedisFailure(): void {
  redisStore = undefined;
  redisUnavailable = true;
}

/** Test-only: forgets every counter. */
export function resetRateLimitState(): void {
  memoryStore.clear();
  redisStore = undefined;
  redisUnavailable = false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Records one request against `policy` for `identifier` and reports whether it
 * is permitted.
 *
 * The identifier is namespaced by the policy name, so the same IP hitting two
 * endpoints consumes two independent budgets.
 */
export async function consumeRateLimit(
  policy: RateLimitPolicy,
  identifier: string,
  now: number = Date.now(),
): Promise<RateLimitResult> {
  const windowMs = policy.windowSeconds * 1000;
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const key = `${policy.name}:${identifier}`;

  let counts: WindowCounts;
  let storeMode: "normal" | "memory" | "degraded" = "normal";

  const store = await getRedisStore();
  if (store) {
    try {
      counts = await store.hit(key, windowStart, policy.windowSeconds);
      storeMode = "normal";
    } catch (error) {
      log.warn("ratelimit.store_failed", {
        policy: policy.name,
        error: error instanceof Error ? error.message : String(error),
      });
      storeMode = "degraded";
      if (policy.degradedBehavior === "fail_closed") {
        return {
          allowed: false,
          limit: policy.limit,
          remaining: 0,
          resetAt: windowStart + windowMs,
          retryAfterSeconds: Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000)),
          storeMode: "degraded",
          reason: "storage_unavailable_fail_closed",
        };
      }
      counts = await memoryStore.hit(key, windowStart, policy.windowSeconds);
    }
  } else {
    if (redisUnavailable) {
      storeMode = "degraded";
      if (policy.degradedBehavior === "fail_closed") {
        return {
          allowed: false,
          limit: policy.limit,
          remaining: 0,
          resetAt: windowStart + windowMs,
          retryAfterSeconds: Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000)),
          storeMode: "degraded",
          reason: "storage_unavailable_fail_closed",
        };
      }
    } else {
      storeMode = "memory";
    }
    counts = await memoryStore.hit(key, windowStart, policy.windowSeconds);
  }

  // Weight the previous window by how much of it is still inside the lookback.
  // Note: bounded weighted approximation, not an exact sliding log guarantee.
  const elapsedInWindow = now - windowStart;
  const previousWeight = Math.max(0, 1 - elapsedInWindow / windowMs);
  const weighted = counts.current + counts.previous * previousWeight;

  const resetAt = windowStart + windowMs;
  const effectiveLimit =
    (storeMode === "degraded" || storeMode === "memory") &&
    policy.degradedLimit !== undefined
      ? policy.degradedLimit
      : policy.limit;
  const allowed = weighted <= effectiveLimit;

  return {
    allowed,
    limit: effectiveLimit,
    remaining: Math.max(0, Math.floor(effectiveLimit - weighted)),
    resetAt,
    retryAfterSeconds: allowed
      ? 0
      : Math.max(1, Math.ceil((resetAt - now) / 1000)),
    storeMode,
    reason: allowed ? undefined : "limit_exceeded",
  };
}

/** Response headers describing the caller's remaining budget. */
export function rateLimitHeaders(
  result: RateLimitResult,
): Record<string, string> {
  const resetSeconds =
    typeof result.resetAt === "number"
      ? Math.max(0, Math.ceil((result.resetAt - Date.now()) / 1000))
      : (result.retryAfterSeconds ?? 0);

  const headers: Record<string, string> = {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(resetSeconds),
  };
  if (!result.allowed)
    headers["Retry-After"] = String(result.retryAfterSeconds);
  return headers;
}
