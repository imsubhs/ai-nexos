/**
 * Outbound request guard — SSRF defence.
 *
 * Automation rules let an operator configure a webhook URL, and that URL is
 * then fetched *by the server*, from inside the deployment's network. Without a
 * guard that is a request forgery primitive: `http://169.254.169.254/…` returns
 * cloud instance credentials, `http://10.0.0.5:5432` reaches the database, and
 * `http://localhost:3000/api/…` re-enters this application carrying whatever
 * the platform attaches to loopback traffic.
 *
 * Three properties make the check sound:
 *
 *   1. Scheme and shape are validated before anything is sent.
 *   2. The hostname is *resolved* and every returned address is checked. A
 *      name like `internal.attacker.com` that resolves to 127.0.0.1 — a DNS
 *      rebinding setup — passes a string check and fails this one.
 *   3. Redirects are followed manually, and each hop is validated again. A
 *      permitted public URL that 302s to the metadata service is the standard
 *      bypass for guards that only check the first URL.
 *
 * Point 2 leaves a residual TOCTOU window: the name is resolved here and again
 * by the HTTP stack, and a sufficiently fast attacker-controlled DNS server can
 * change the answer in between. Closing it entirely requires pinning the
 * connection to the resolved address, which the platform `fetch` does not
 * expose. The window is documented in the threat model rather than pretended
 * away; the practical mitigation is an egress allow-list, below.
 */

import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { logSecurityEvent } from "./logger";

export class EgressBlockedError extends Error {
  constructor(reason: string) {
    super(`Outbound request blocked: ${reason}`);
    this.name = "EgressBlockedError";
  }
}

/** Hostnames that are never fetched, regardless of what they resolve to. */
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata",
  "instance-data",
]);

/** Suffixes covering local and container-internal naming schemes. */
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".localdomain"];

/**
 * Decides whether an address is outside the public internet.
 *
 * The ranges are enumerated rather than pulled from a dependency so the list is
 * auditable in place: every entry below is either non-routable, reserved, or a
 * cloud metadata endpoint.
 */
export function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) return isPrivateIpv6(address);
  // Not an address at all — the caller must resolve it first.
  return true;
}

function isPrivateIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (
    octets.length !== 4 ||
    octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)
  ) {
    return true;
  }
  const [a, b] = octets;

  if (a === 0) return true; // "this network"
  if (a === 10) return true; // RFC 1918
  if (a === 127) return true; // loopback
  if (a === 100 && b >= 64 && b <= 127) return true; // RFC 6598 carrier NAT
  if (a === 169 && b === 254) return true; // link-local, incl. 169.254.169.254
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC 1918
  if (a === 192 && b === 0) return true; // IETF protocol assignments
  if (a === 192 && b === 168) return true; // RFC 1918
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; // multicast, reserved, broadcast

  return false;
}

function isPrivateIpv6(address: string): boolean {
  const normalised = address.toLowerCase().split("%")[0];

  if (normalised === "::" || normalised === "::1") return true; // unspecified, loopback

  // IPv4-mapped (::ffff:10.0.0.1) and IPv4-compatible forms carry an embedded
  // v4 address that must be judged by the v4 rules, not treated as global.
  const embedded = /^::(?:ffff:)?(\d{1,3}(?:\.\d{1,3}){3})$/.exec(normalised);
  if (embedded) return isPrivateIpv4(embedded[1]);

  if (normalised.startsWith("fe80")) return true; // link-local
  if (/^f[cd]/.test(normalised)) return true; // unique local (fc00::/7)
  if (normalised.startsWith("ff")) return true; // multicast
  if (normalised.startsWith("64:ff9b")) return true; // NAT64 — reaches v4 space
  if (normalised.startsWith("2002:")) return true; // 6to4 — likewise

  return false;
}

/**
 * Hosts an operator has explicitly permitted, as a comma-separated list.
 *
 * When set, it is the *only* thing that may be reached, and the private-range
 * checks still apply on top. This is the configuration to use in production:
 * the DNS-rebinding window above cannot be exploited against a host that is not
 * on the list in the first place.
 */
function egressAllowlist(): string[] | undefined {
  const raw = process.env["EGRESS_ALLOWED_HOSTS"];
  if (!raw) return undefined;
  const hosts = raw
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  return hosts.length > 0 ? hosts : undefined;
}

function matchesAllowlist(hostname: string, allowlist: string[]): boolean {
  return allowlist.some(
    (allowed) =>
      hostname === allowed ||
      // A leading dot permits subdomains: ".example.com" matches "a.example.com".
      (allowed.startsWith(".") && hostname.endsWith(allowed)),
  );
}

export type EgressCheckOptions = {
  /** Permit plain http. Off by default; only development targets need it. */
  readonly allowInsecureHttp?: boolean;
};

/**
 * Validates a URL for server-side fetching, resolving its hostname.
 *
 * Throws `EgressBlockedError` with a reason that is safe to log but should not
 * be returned to the caller verbatim — "resolved to 10.0.0.5" confirms an
 * internal address to whoever supplied the URL.
 */
export async function assertSafeOutboundUrl(
  rawUrl: string,
  options: EgressCheckOptions = {},
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new EgressBlockedError("the URL could not be parsed");
  }

  const allowHttp =
    options.allowInsecureHttp ?? process.env.NODE_ENV !== "production";

  if (url.protocol !== "https:" && !(allowHttp && url.protocol === "http:")) {
    throw new EgressBlockedError(`scheme "${url.protocol}" is not permitted`);
  }

  // Credentials in a URL are exfiltrated to whatever the request reaches, and
  // are a common way to smuggle a different host past a naive parser.
  if (url.username || url.password) {
    throw new EgressBlockedError("the URL must not contain credentials");
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!hostname) throw new EgressBlockedError("the URL has no host");

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new EgressBlockedError(`host "${hostname}" is not permitted`);
  }
  if (BLOCKED_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    throw new EgressBlockedError(`host "${hostname}" is not permitted`);
  }

  const allowlist = egressAllowlist();
  if (allowlist && !matchesAllowlist(hostname, allowlist)) {
    throw new EgressBlockedError(
      `host "${hostname}" is not in EGRESS_ALLOWED_HOSTS`,
    );
  }

  for (const address of await resolveAll(hostname)) {
    if (isPrivateAddress(address)) {
      throw new EgressBlockedError(
        `host "${hostname}" resolves to the non-public address ${address}`,
      );
    }
  }

  return url;
}

/** Every address a hostname resolves to; a literal address resolves to itself. */
async function resolveAll(hostname: string): Promise<string[]> {
  if (isIP(hostname)) return [hostname];

  try {
    const results = await lookup(hostname, { all: true, verbatim: true });
    if (results.length === 0) {
      throw new EgressBlockedError(`host "${hostname}" did not resolve`);
    }
    return results.map((result) => result.address);
  } catch (error) {
    if (error instanceof EgressBlockedError) throw error;
    throw new EgressBlockedError(`host "${hostname}" could not be resolved`);
  }
}

/** Redirect hops followed before giving up. */
const MAX_REDIRECTS = 3;

/**
 * `fetch` with every hop validated.
 *
 * Redirects are handled here rather than by the platform because
 * `redirect: "follow"` would send the follow-up request without consulting this
 * module — which is precisely the hole the guard exists to close.
 */
export async function safeFetch(
  rawUrl: string,
  init: RequestInit = {},
  options: EgressCheckOptions & { timeoutMs?: number } = {},
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? 10_000;
  let target = await assertSafeOutboundUrl(rawUrl, options);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const controller = new AbortController();
    // An unbounded outbound request holds a worker open indefinitely, which is
    // a denial of service delivered through an otherwise-permitted URL.
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(target, {
        ...init,
        redirect: "manual",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const isRedirect = response.status >= 300 && response.status < 400;
    const location = response.headers.get("location");
    if (!isRedirect || !location) return response;

    if (hop === MAX_REDIRECTS) {
      throw new EgressBlockedError("too many redirects");
    }

    const next = new URL(location, target).toString();
    logSecurityEvent("egress.redirect", "allowed", { from: target.host });
    target = await assertSafeOutboundUrl(next, options);
  }

  // Unreachable: the loop either returns or throws.
  throw new EgressBlockedError("too many redirects");
}
