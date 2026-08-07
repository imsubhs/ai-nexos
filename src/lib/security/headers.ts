/**
 * HTTP security headers.
 *
 * Single source of truth for every response header the platform sets, split
 * across two consumers because they answer different questions:
 *
 *   - `buildSecurityHeaders()` is static and applies to every path. It is read
 *     by `next.config.ts` at build time.
 *   - `buildContentSecurityPolicy()` is per-request, because the policy carries
 *     a nonce that changes on every response. It is emitted by `src/proxy.ts`
 *     and deliberately *not* included in the static set — two Content-Security-
 *     Policy headers are enforced as an intersection, which is confusing to
 *     reason about and easy to weaken by accident.
 *
 * Sprint 2.2 removed `'unsafe-inline'` from `script-src`. Phase 1 documented
 * that as "the single highest-value follow-up", and it was: with it present,
 * any injection that reaches the DOM executes, and the rest of the policy is
 * decoration. The cost is that inline scripts now need a nonce, which means the
 * root layout reads a per-request header and every route renders dynamically.
 * For an authenticated multi-tenant dashboard that was nearly true already —
 * nine trivial shells lost prerendering, and nothing else changed.
 *
 * `style-src` keeps `'unsafe-inline'`. Framer Motion writes inline styles
 * during animation and React writes `style` attributes from props; nonces do
 * not apply to attributes, so removing it would break rendering without
 * closing a comparable hole — style injection cannot execute script under this
 * policy because `script-src` no longer allows inline.
 */

type Header = { key: string; value: string };

/**
 * Origins the browser is allowed to talk to, derived from configuration rather
 * than hardcoded. Supabase serves REST/Auth/Storage over https and Realtime
 * over wss on the same host, so fetch and subresource directives need
 * different schemes of it.
 */
function supabaseOrigins(): { https: string[]; ws: string[] } {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return { https: [], ws: [] };
  try {
    const { host } = new URL(raw);
    return { https: [`https://${host}`], ws: [`wss://${host}`] };
  } catch {
    // A malformed URL is an env problem, not a header problem — src/lib/env.ts
    // reports it. Degrade to "no extra origins" rather than breaking the build.
    return { https: [], ws: [] };
  }
}

export type CspOptions = {
  readonly isDev?: boolean;
  /**
   * Per-request nonce. When present, inline scripts must carry it and
   * `'unsafe-inline'` is omitted entirely.
   *
   * When absent the policy falls back to `'unsafe-inline'`, because a document
   * served without a nonce would otherwise have every inline script blocked —
   * a blank page is a worse outcome than the weaker policy. In practice the
   * proxy supplies a nonce for every document it handles; the fallback exists
   * for responses that bypass it.
   */
  readonly nonce?: string;
};

export function buildContentSecurityPolicy(options: CspOptions = {}): string {
  const isDev = options.isDev ?? process.env.NODE_ENV !== "production";
  const nonce = options.nonce;
  const supabase = supabaseOrigins();

  const scriptSrc = ["'self'"];
  if (nonce) {
    scriptSrc.push(`'nonce-${nonce}'`);
  } else {
    scriptSrc.push("'unsafe-inline'");
  }
  // React Refresh compiles modules at runtime. Never present in production.
  if (isDev) scriptSrc.push("'unsafe-eval'");

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": scriptSrc,
    // See the file header: inline styles are structural here, and cannot
    // execute script under this policy.
    "style-src": ["'self'", "'unsafe-inline'"],
    // next/font/google self-hosts at build time, so no external font origin.
    "font-src": ["'self'", "data:"],
    // blob: covers client-side previews of uploads before they are stored.
    // Storage objects are fetched over https only — a websocket is not a
    // subresource, so wss belongs in connect-src alone.
    "img-src": ["'self'", "data:", "blob:", ...supabase.https],
    "media-src": ["'self'", "blob:", ...supabase.https],
    "connect-src": [
      "'self'",
      ...supabase.https,
      // Supabase Realtime.
      ...supabase.ws,
      // Dev server HMR websocket.
      ...(isDev ? ["ws://localhost:*", "http://localhost:*"] : []),
    ],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    // Restricts where a form may post. Without it, an injected <form> can
    // exfiltrate a submitted password to any origin.
    "form-action": ["'self'"],
    // Clickjacking defence for browsers that honour CSP over X-Frame-Options.
    "frame-ancestors": ["'none'"],
    "frame-src": ["'none'"],
  };

  const policy = Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");

  // Only meaningful over TLS; adding it in dev breaks plain-http localhost.
  return isDev ? policy : `${policy}; upgrade-insecure-requests`;
}

export function buildSecurityHeaders(
  isDev = process.env.NODE_ENV !== "production",
): Header[] {
  const headers: Header[] = [
    // Defence in depth alongside frame-ancestors, for older browsers.
    { key: "X-Frame-Options", value: "DENY" },
    // Stop MIME sniffing turning an upload into an executable script.
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Send the full URL to ourselves, origin-only cross-site. Share-link paths
    // (portal.<domain>/s/{token}) must never leak in a Referer header.
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: [
        "camera=()",
        "microphone=()",
        "geolocation=()",
        "payment=()",
        "usb=()",
        "interest-cohort=()",
      ].join(", "),
    },
    { key: "X-DNS-Prefetch-Control", value: "off" },
    // Isolate this origin from cross-origin popup/window references.
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    // Legacy Adobe cross-domain policy files. Nothing here serves one, and an
    // attacker who can upload to a bucket mapped onto this origin should not be
    // able to introduce one either.
    { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  ];

  // HSTS is only correct over TLS. Preload is intentionally omitted: it is
  // effectively irreversible and must be an explicit operational decision.
  if (!isDev) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    });
  }

  return headers;
}

/**
 * A fresh CSP nonce.
 *
 * 128 bits of randomness, base64 encoded. The spec's requirement is that a
 * nonce be unguessable to an attacker who can inject markup but not read the
 * response; anything derived from the request (a hash of the path, a counter)
 * fails that and silently converts the policy back into `'unsafe-inline'`.
 *
 * `crypto.getRandomValues` rather than `node:crypto`, because this runs in the
 * proxy, which may execute on the Edge runtime.
 */
export function generateCspNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
