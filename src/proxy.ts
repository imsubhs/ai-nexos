import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeInternalPath } from "@/features/auth/redirect";
// Shared with the rest of the app rather than re-defaulted here. This used to
// fall back to "" while src/config/app.ts fell back to "portal.localhost:3000",
// so the same variable had two different unset behaviours: host matching here
// silently never matched, and local portal testing did not route.
import { PORTAL_DOMAIN } from "@/config/app";
import { requirePublicEnv } from "@/lib/env";
import { isDemoMode } from "@/lib/env.server";
import {
  buildContentSecurityPolicy,
  generateCspNonce,
} from "@/lib/security/headers";
import {
  DEMO_SESSION_COOKIE,
  DEMO_SESSION_VALUE,
} from "@/features/auth/demo-session";

/**
 * Request proxy (Next 16 file convention, successor to middleware).
 * Responsibilities:
 *
 * 1. Domain routing (dual-domain architecture):
 *    - app.<domain>    → internal dashboard (authenticated)
 *    - portal.<domain> → client portal, rewritten to /portal/*;
 *      share links live at portal.<domain>/s/{secure_token}
 * 2. Supabase session refresh for internal users.
 * 3. Auth gating: unauthenticated internal traffic → /login.
 * 4. Per-request Content-Security-Policy, carrying a fresh nonce.
 *
 * The portal never requires authentication — share-token validation happens
 * in the portal service layer, not here. This check is convenience routing;
 * the real security boundary is RLS + requireCurrentUser() at render time.
 */

const PUBLIC_INTERNAL_PATHS = [
  "/login",
  "/auth",
  "/unprovisioned",
  "/onboarding",
  "/invite",
  "/api/health",
];

/** Header the root layout reads to nonce its inline scripts. */
const NONCE_HEADER = "x-nonce";

function isPortalHost(host: string): boolean {
  if (!host) return false;
  const bare = host.toLowerCase().split(":")[0];
  const portalBare = PORTAL_DOMAIN.toLowerCase().split(":")[0];
  if (portalBare && bare === portalBare) return true;
  return bare.startsWith("portal.");
}

/**
 * Builds the request headers forwarded downstream, with the nonce attached.
 *
 * The inbound `x-nonce` is deleted first. Without that, a caller can set the
 * header themselves, have the layout stamp their chosen value onto every
 * inline script, and then satisfy the policy from injected markup — the nonce
 * has to be unguessable *to the attacker*, and one they supplied is not.
 */
function requestHeadersWithNonce(request: NextRequest, nonce: string): Headers {
  const headers = new Headers(request.headers);
  headers.delete(NONCE_HEADER);
  headers.set(NONCE_HEADER, nonce);
  return headers;
}

/**
 * Attaches the per-request CSP.
 *
 * Every exit from this function goes through here, including redirects and the
 * 401 JSON: a response without a policy is a response where an injection has
 * no constraint at all, and the login redirect is exactly where an open-redirect
 * or injected-form attack would land.
 */
function withCsp(response: NextResponse, nonce: string): NextResponse {
  response.headers.set(
    "Content-Security-Policy",
    buildContentSecurityPolicy({ nonce }),
  );
  return response;
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const { pathname } = request.nextUrl;

  const nonce = generateCspNonce();
  const headers = requestHeadersWithNonce(request, nonce);

  // --- Client portal domain: rewrite into the /portal route group. ---
  if (isPortalHost(host)) {
    // Health checks must work on every domain, unauthenticated.
    if (pathname === "/api/health") {
      return withCsp(NextResponse.next({ request: { headers } }), nonce);
    }
    if (pathname.startsWith("/portal")) {
      // Never expose the internal path shape on the portal domain.
      return withCsp(NextResponse.redirect(new URL("/", request.url)), nonce);
    }
    const url = request.nextUrl.clone();
    url.pathname = `/portal${pathname === "/" ? "" : pathname}`;
    return withCsp(NextResponse.rewrite(url, { request: { headers } }), nonce);
  }

  // --- Internal domain: block direct access to portal routes. ---
  if (pathname.startsWith("/portal")) {
    return withCsp(NextResponse.redirect(new URL("/", request.url)), nonce);
  }

  // --- Session refresh (Supabase SSR pattern). ---
  let response = NextResponse.next({ request: { headers } });

  const supabase = createServerClient(
    requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requirePublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request: { headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() revalidates the JWT against Supabase Auth on every
  // request — do not replace with getSession(), which trusts the cookie.
  //
  // isDemoMode() is false in production regardless of how DEMO_MODE is set
  // (see src/lib/env.server.ts), so this branch cannot be reached there even
  // if the variable survives into the deployment's environment.
  const isDemoSession =
    isDemoMode() &&
    request.cookies.get(DEMO_SESSION_COOKIE)?.value === DEMO_SESSION_VALUE;
  let user = null;

  if (isDemoSession) {
    user = { id: "demo-admin-001" }; // Mock user object just to pass the proxy check
  } else {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  // Any redirect must carry the auth cookies that getUser() may have just
  // refreshed, or the rotated refresh token is lost and the session dies.
  const redirectWithCookies = (url: URL) => {
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie);
    });
    return withCsp(redirect, nonce);
  };

  const isPublicPath = PUBLIC_INTERNAL_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!user && !isPublicPath) {
    // API routes get a machine-readable 401, never a login redirect.
    if (pathname.startsWith("/api/")) {
      return withCsp(
        NextResponse.json(
          { error: "Unauthorized" },
          { status: 401, headers: { "Cache-Control": "no-store" } },
        ),
        nonce,
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return redirectWithCookies(url);
  }

  if (user && pathname === "/login") {
    const next = safeInternalPath(request.nextUrl.searchParams.get("next"));
    return redirectWithCookies(new URL(next, request.url));
  }

  // Authenticated documents are tenant-specific. Without this, a shared cache
  // keyed on URL alone can serve one organisation's rendered page to another,
  // and a browser "back" after sign-out can redisplay it from disk.
  if (user) {
    response.headers.set(
      "Cache-Control",
      "private, no-store, no-cache, must-revalidate",
    );
  }

  return withCsp(response, nonce);
}

export const config = {
  matcher: [
    // Everything except static assets and images.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
