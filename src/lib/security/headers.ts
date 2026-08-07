/**
 * HTTP security headers (Phase 1 repository hardening).
 *
 * Single source of truth for every response header the platform sets. It is
 * consumed by `next.config.ts` at build time, and asserted directly by
 * `tests/unit/security-headers.test.ts`.
 *
 * Deliberate scope limits for this phase:
 *   - The CSP is *enforcing*, but allows `'unsafe-inline'` for scripts and
 *     styles. Next's bootstrap payload and framer-motion's injected styles are
 *     both inline; a nonce would require rewriting `src/proxy.ts` and the root
 *     layout, which is out of scope here. Tightening this to a nonce is the
 *     single highest-value follow-up.
 *   - `'unsafe-eval'` is added in development only (React Refresh needs it).
 *     It is never present in a production response.
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

export function buildContentSecurityPolicy(
  isDev = process.env.NODE_ENV !== "production",
): string {
  const supabase = supabaseOrigins();

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'unsafe-inline' — see the file header. 'unsafe-eval' is dev-only.
    "script-src": ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
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
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(isDev),
    },
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
