/**
 * Request-level guards shared by every route handler and server action.
 *
 * Four concerns live here because they are the four things that must happen
 * before a request body is trusted: identify the caller, prove the request came
 * from us, bound its size, and parse it without letting the payload reach into
 * the prototype chain.
 */

import type { z } from "zod";
import { APP_DOMAIN, PORTAL_DOMAIN } from "@/config/app";
import { ApiError } from "./errors";
import {
  consumeRateLimit,
  rateLimitHeaders,
  type RateLimitPolicy,
} from "./rate-limit";
import { logSecurityEvent } from "./logger";

// ─────────────────────────────────────────────────────────────────────────────
// Caller identity
// ─────────────────────────────────────────────────────────────────────────────

/**
 * How many reverse proxies sit in front of this application.
 *
 * `X-Forwarded-For` is a list that each hop appends to, so the leftmost entry
 * is whatever the *original client* claimed — fully attacker-controlled. Only
 * the entries appended by infrastructure we run are trustworthy, and the
 * client's real address is the one appended by the outermost proxy: position
 * `length - trustedHops`.
 *
 * Reading the leftmost entry, which is the common shortcut, means an attacker
 * sets `X-Forwarded-For: 1.2.3.4` and gets a fresh rate-limit budget per
 * request. That is the whole defence, defeated by one header.
 */
function trustedProxyHops(): number {
  const raw = process.env.TRUSTED_PROXY_HOPS;
  const parsed = raw === undefined || raw === "" ? 1 : Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 1;
}

/** Returned when no address can be established. Callers must treat it as one bucket. */
export const UNKNOWN_CLIENT_IP = "unknown";

/**
 * Best available client address.
 *
 * When the count of forwarded entries is smaller than the configured hop count,
 * the header did not come through the expected chain. That is either a
 * misconfiguration or a spoof attempt; either way the safe reading is the
 * rightmost entry — the one our own edge appended.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const chain = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (chain.length > 0) {
      const hops = trustedProxyHops();
      const index = Math.max(0, chain.length - Math.max(1, hops));
      const candidate = chain[index];
      if (candidate) return normaliseIp(candidate);
    }
  }

  // Set by several platforms and, unlike XFF, not a list — but still only as
  // trustworthy as the edge that set it.
  const real = headers.get("x-real-ip");
  if (real) return normaliseIp(real);

  return UNKNOWN_CLIENT_IP;
}

/** Strips the IPv6-mapped IPv4 prefix and any port suffix so keys are stable. */
function normaliseIp(value: string): string {
  const trimmed = value.trim().replace(/^\[|\]$/g, "");
  if (trimmed.startsWith("::ffff:")) return trimmed.slice("::ffff:".length);
  // "1.2.3.4:5678" — a port makes every connection a distinct bucket.
  const ipv4WithPort = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(trimmed);
  return ipv4WithPort ? ipv4WithPort[1] : trimmed;
}

// ─────────────────────────────────────────────────────────────────────────────
// Origin verification (CSRF)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hosts permitted to originate a state-changing request.
 *
 * The configured domains, plus the request's own host: a deployment reached by
 * a preview URL is still the same application, and rejecting it would break
 * every non-production environment.
 */
function allowedOrigins(request: Request): Set<string> {
  const hosts = new Set<string>();
  for (const domain of [APP_DOMAIN, PORTAL_DOMAIN]) {
    if (domain) hosts.add(domain.toLowerCase());
  }
  const host = request.headers.get("host");
  if (host) hosts.add(host.toLowerCase());
  return hosts;
}

/**
 * Rejects cross-site state-changing requests.
 *
 * Next verifies the Origin header for Server Actions itself, but route handlers
 * get no such treatment: a `POST` from any page on the internet reaches them
 * with the user's cookies attached. Since every mutating endpoint here is
 * cookie-authenticated, that is textbook CSRF.
 *
 * A request with neither `Origin` nor `Referer` is refused rather than allowed.
 * Browsers send `Origin` on every cross-origin request and on all same-origin
 * POSTs; a request carrying neither is not a form submission we need to
 * support, and "absent means trusted" is how this check gets bypassed.
 */
export function assertSameOrigin(request: Request): void {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;

  const stated =
    request.headers.get("origin") ?? request.headers.get("referer");
  if (!stated) {
    throw new ApiError("forbidden", "Request origin could not be verified.");
  }

  let host: string;
  try {
    host = new URL(stated).host.toLowerCase();
  } catch {
    throw new ApiError("forbidden", "Request origin could not be verified.");
  }

  if (!allowedOrigins(request).has(host)) {
    logSecurityEvent("csrf.origin_rejected", "denied", {
      statedHost: host,
      path: new URL(request.url).pathname,
    });
    throw new ApiError("forbidden", "Request origin could not be verified.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Body handling
// ─────────────────────────────────────────────────────────────────────────────

/** Default cap for a JSON request body. Every endpoint here sends small objects. */
export const DEFAULT_MAX_BODY_BYTES = 64 * 1024;

/**
 * Keys that must never survive into a parsed object.
 *
 * `JSON.parse` itself is safe, but the objects it produces are routinely spread
 * into other objects, passed to ORM helpers, or merged into option bags — and
 * any of those operations will happily copy a `__proto__` key onto a real
 * prototype. Removing them at the parse boundary means no downstream consumer
 * has to remember.
 */
const POLLUTING_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * A `JSON.parse` reviver that drops prototype-polluting keys.
 *
 * Returning `undefined` from a reviver deletes the property, which is exactly
 * the behaviour wanted: the rest of the payload parses normally.
 */
function safeReviver(this: unknown, key: string, value: unknown): unknown {
  return POLLUTING_KEYS.has(key) ? undefined : value;
}

/** Parses JSON text with prototype-polluting keys stripped. */
export function parseJsonSafely(text: string): unknown {
  return JSON.parse(text, safeReviver);
}

/**
 * Reads, size-limits, parses and validates a JSON request body.
 *
 * The size check is done twice on purpose. `Content-Length` is a claim, so it
 * is used only to reject early and cheaply; the authoritative check is on the
 * bytes actually read, because a chunked request can declare nothing at all and
 * stream until the process runs out of memory.
 */
export async function readJsonBody<T extends z.ZodType>(
  request: Request,
  schema: T,
  options: { maxBytes?: number } = {},
): Promise<z.infer<T>> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BODY_BYTES;

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ApiError(
      "unsupported_media_type",
      "Expected a JSON request body.",
    );
  }

  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > maxBytes) {
    throw new ApiError("payload_too_large", "Request body is too large.");
  }

  const text = await readTextWithLimit(request, maxBytes);

  let raw: unknown;
  try {
    raw = parseJsonSafely(text);
  } catch {
    throw new ApiError("bad_request", "Request body is not valid JSON.");
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    // Field paths are the caller's own input shape, not internal schema — safe
    // to return, and without them a 400 is unactionable.
    const fields = parsed.error.issues
      .map((issue) => issue.path.join(".") || "(root)")
      .join(", ");
    throw new ApiError("bad_request", `Invalid request body: ${fields}.`);
  }

  return parsed.data;
}

/** Streams the body, aborting as soon as the cap is exceeded. */
async function readTextWithLimit(
  request: Request,
  maxBytes: number,
): Promise<string> {
  const body = request.body;
  if (!body) return "";

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        // Stop pulling bytes we have already decided to reject.
        await reader.cancel();
        throw new ApiError("payload_too_large", "Request body is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(joined);
}

// ─────────────────────────────────────────────────────────────────────────────
// Throttling
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Consumes one unit of `policy` and throws a 429 when the budget is spent.
 *
 * Returns the result so a caller that wants to attach `RateLimit-*` headers to
 * a successful response can.
 */
export async function assertWithinRateLimit(
  policy: RateLimitPolicy,
  identifier: string,
  context: Record<string, unknown> = {},
) {
  const result = await consumeRateLimit(policy, identifier);
  if (!result.allowed) {
    logSecurityEvent("ratelimit.exceeded", "throttled", {
      policy: policy.name,
      ...context,
    });
    throw new ApiError(
      "rate_limited",
      "Too many requests. Please try again shortly.",
      { headers: rateLimitHeaders(result) },
    );
  }
  return result;
}
