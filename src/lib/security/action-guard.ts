/**
 * Action-level rate limiting and resource control guards (Phase S6.3).
 *
 * Provides decorators and guard wrappers for Next.js Server Actions and RPC endpoints.
 * Handles IP extraction via headers(), current identity resolution, rate-limit consumption,
 * and standard application contract responses (ApiError for RPCs, ActionResponse for forms).
 */

import { headers } from "next/headers";
import { getClientIp, UNKNOWN_CLIENT_IP } from "./request";
import { getCurrentUser } from "@/features/auth/current-user";
import {
  consumeRateLimit,
  rateLimitHeaders,
  type RateLimitPolicy,
  type RateLimitResult,
  tokenPrefixBucket,
} from "./rate-limit";
import { ApiError } from "./errors";
import { logSecurityEvent } from "./logger";

export interface GuardContext {
  readonly ip: string;
  readonly userId?: string;
  readonly organizationId?: string;
}

export type KeyResolver<TArgs extends unknown[]> = (
  args: TArgs,
  context: GuardContext,
) => string | Promise<string>;

export interface ActionGuardOptions<TArgs extends unknown[]> {
  /** Custom key resolver. Defaults to user_and_org (or IP if unauthenticated). */
  readonly keyResolver?: KeyResolver<TArgs>;
  /** Descriptive name of action for security logs. */
  readonly actionName?: string;
  /**
   * If true, rate limit rejection returns `{ success: false, error: string }`
   * instead of throwing ApiError("rate_limited").
   */
  readonly returnsActionResponse?: boolean;
}

/**
 * Safely resolves current request guard context (IP and optional authenticated user).
 * Gracefully handles non-HTTP or test execution environments where headers() is unavailable.
 */
export async function resolveGuardContext(): Promise<GuardContext> {
  let ip = UNKNOWN_CLIENT_IP;
  try {
    const h = await headers();
    ip = getClientIp(h);
  } catch {
    // Non-request context, unit test, or edge case: use fallback
    ip = "127.0.0.1";
  }

  let userId: string | undefined;
  let organizationId: string | undefined;

  try {
    const user = await getCurrentUser();
    if (user) {
      userId = user.userId;
      organizationId = user.organizationId;
    }
  } catch {
    // Current user resolution failure or unauthenticated caller
  }

  return { ip, userId, organizationId };
}

/** Standard Key Resolvers */
export const KeyResolvers = {
  /** Budget per authenticated user within organization, or per IP if unauthenticated. */
  userAndOrg: (_args: unknown[], ctx: GuardContext): string => {
    return ctx.userId
      ? `${ctx.organizationId ?? "no-org"}:${ctx.userId}`
      : ctx.ip;
  },

  /** Budget per user ID, or per IP if unauthenticated. */
  userOrIp: (_args: unknown[], ctx: GuardContext): string => {
    return ctx.userId ?? ctx.ip;
  },

  /** Budget per client IP only. */
  ipOnly: (_args: unknown[], ctx: GuardContext): string => {
    return ctx.ip;
  },

  /**
   * Coarse token prefix bucket resolver:
   * Combines client IP with the first 8 hex characters of the SHA-256 token hash.
   */
  invitationTokenPrefixBucket: (
    tokenHash: string,
    ctx: GuardContext,
  ): string => {
    const prefix = tokenPrefixBucket(tokenHash);
    return `${ctx.ip}:${prefix}`;
  },
};

/**
 * Higher-order function wrapping a server action with policy-driven rate limiting.
 */
export function withRateLimit<TArgs extends unknown[], TReturn>(
  policy: RateLimitPolicy,
  actionFn: (...args: TArgs) => Promise<TReturn>,
  options?: ActionGuardOptions<TArgs>,
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    const context = await resolveGuardContext();
    const identifier = options?.keyResolver
      ? await options.keyResolver(args, context)
      : KeyResolvers.userAndOrg(args, context);

    const result: RateLimitResult = await consumeRateLimit(policy, identifier);

    if (!result.allowed) {
      logSecurityEvent("ratelimit.action_throttled", "throttled", {
        action: options?.actionName ?? actionFn.name ?? "anonymous_action",
        policy: policy.name,
        identifier,
        ip: context.ip,
        userId: context.userId,
        retryAfter: result.retryAfterSeconds,
        storeMode: result.storeMode,
      });

      const message = `Too many requests. Please try again in ${result.retryAfterSeconds}s.`;

      if (options?.returnsActionResponse) {
        return {
          success: false,
          error: message,
        } as unknown as TReturn;
      }

      throw new ApiError("rate_limited", message, {
        headers: rateLimitHeaders(result),
      });
    }

    return actionFn(...args);
  };
}
