/**
 * Rate limiting and brute-force control.
 *
 * The algorithm is a weighted sliding window: each request counts against the
 * current fixed window plus the fraction of the previous window still inside
 * the lookback. A plain fixed window lets an attacker send `2 × limit` requests
 * across a window boundary in a fraction of a second, which for a login
 * endpoint is the whole attack. A precise sliding log would be exact but stores
 * one entry per request; the weighted approximation costs two counters and is
 * wrong only at the margins, in the conservative direction.
 *
 * Two stores, same semantics:
 *
 *   - Redis, when REDIS_URL is configured. Correct across instances, which is
 *     the only configuration in which a limit means anything behind more than
 *     one server.
 *   - Process memory otherwise. Honest about its weakness: a limit enforced
 *     per-instance is weaker by exactly the instance count, and
 *     `assertProductionConfig()` warns when production runs this way.
 *
 * Failure is *open* for infrastructure faults and *closed* for nothing: if
 * Redis is unreachable the limiter falls back to the in-memory store rather
 * than rejecting traffic. A limiter outage must not become an outage.
 */

import { hasRedis } from "@/lib/env.server";
import { log } from "./logger";

export type RateLimitPolicy = {
  /** Stable name; forms part of the storage key and appears in logs. */
  readonly name: string;
  /** Maximum requests permitted within the window. */
  readonly limit: number;
  /** Window length in seconds. */
  readonly windowSeconds: number;
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
};

/**
 * The policies in force.
 *
 * Kept in one table rather than inline at each call site so the whole posture
 * can be reviewed at once, and so a limit can be tuned without hunting through
 * route handlers.
 */
export const RATE_LIMITS = {
  /** Password sign-in, per client IP. The blunt instrument against spraying. */
  loginByIp: { name: "login:ip", limit: 10, windowSeconds: 300 },
  /**
   * Password sign-in, per account. Stops a distributed attack from getting
   * more attempts against one victim than a single host would.
   */
  loginByAccount: { name: "login:account", limit: 5, windowSeconds: 900 },
  /** Magic-link requests, per account. Also an outbound-email abuse control. */
  magicLinkByAccount: {
    name: "magiclink:account",
    limit: 3,
    windowSeconds: 900,
  },
  /** Magic-link requests, per IP. */
  magicLinkByIp: { name: "magiclink:ip", limit: 10, windowSeconds: 900 },
  /** OAuth/magic-link callback processing, per IP. */
  authCallbackByIp: { name: "authcallback:ip", limit: 30, windowSeconds: 300 },
  /** External approval-token verification — an unauthenticated guessing surface. */
  approvalVerifyByIp: {
    name: "approval:verify:ip",
    limit: 20,
    windowSeconds: 300,
  },
  /** Share-token exchange on the portal, per IP. */
  portalSessionByIp: {
    name: "portal:session:ip",
    limit: 20,
    windowSeconds: 300,
  },
  /** Authenticated portal reads, per session. */
  portalReadBySession: {
    name: "portal:read:session",
    limit: 120,
    windowSeconds: 60,
  },
  /** Share-link password attempts, per session. Brute-force control. */
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
 * Per-process store.
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
 * Redis-backed store.
 *
 * `INCR` + `EXPIRE` in one pipeline is atomic enough for this purpose: the
 * increment cannot be lost, and a lost `EXPIRE` (only possible if the
 * connection dies between the two) leaves a key that the next window's
 * `EXPIRE` re-arms. The TTL is two windows so the previous window is still
 * readable when the current one is weighted against it.
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

    const results = await this.client
      .pipeline()
      .incr(currentKey)
      .expire(currentKey, windowSeconds * 2)
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
  pipeline(): RedisLikePipeline;
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
async function getRedisStore(): Promise<RateLimitStore | undefined> {
  if (redisStore) return redisStore;
  if (redisUnavailable || !hasRedis()) return undefined;

  try {
    const { default: Redis } = await import("ioredis");
    const client = new Redis(process.env.REDIS_URL as string, {
      // A limiter must not queue behind a dead Redis; fall through to memory.
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: false,
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
  try {
    const store = (await getRedisStore()) ?? memoryStore;
    counts = await store.hit(key, windowStart, policy.windowSeconds);
  } catch (error) {
    // Redis fell over mid-request. Degrade to the local counter rather than
    // either rejecting the caller or waving them through uncounted.
    log.warn("ratelimit.store_failed", {
      policy: policy.name,
      error: error instanceof Error ? error.message : String(error),
    });
    counts = await memoryStore.hit(key, windowStart, policy.windowSeconds);
  }

  // Weight the previous window by how much of it is still inside the lookback.
  const elapsedInWindow = now - windowStart;
  const previousWeight = Math.max(0, 1 - elapsedInWindow / windowMs);
  const weighted = counts.current + counts.previous * previousWeight;

  const resetAt = windowStart + windowMs;
  const allowed = weighted <= policy.limit;

  return {
    allowed,
    limit: policy.limit,
    remaining: Math.max(0, Math.floor(policy.limit - weighted)),
    resetAt,
    retryAfterSeconds: allowed
      ? 0
      : Math.max(1, Math.ceil((resetAt - now) / 1000)),
  };
}

/** Response headers describing the caller's remaining budget. */
export function rateLimitHeaders(
  result: RateLimitResult,
): Record<string, string> {
  const headers: Record<string, string> = {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
  };
  if (!result.allowed)
    headers["Retry-After"] = String(result.retryAfterSeconds);
  return headers;
}
