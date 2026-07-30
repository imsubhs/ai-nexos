import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeInternalPath } from "@/features/auth/redirect";

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
 *
 * The portal never requires authentication — share-token validation happens
 * in the portal service layer, not here. This check is convenience routing;
 * the real security boundary is RLS + requireCurrentUser() at render time.
 */

const PORTAL_DOMAIN = process.env.NEXT_PUBLIC_PORTAL_DOMAIN ?? "";

const PUBLIC_INTERNAL_PATHS = [
  "/login",
  "/auth",
  "/unprovisioned",
  "/api/health",
];

function isPortalHost(host: string): boolean {
  if (!host) return false;
  const bare = host.toLowerCase().split(":")[0];
  const portalBare = PORTAL_DOMAIN.toLowerCase().split(":")[0];
  if (portalBare && bare === portalBare) return true;
  return bare.startsWith("portal.");
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const { pathname } = request.nextUrl;

  // --- Client portal domain: rewrite into the /portal route group. ---
  if (isPortalHost(host)) {
    // Health checks must work on every domain, unauthenticated.
    if (pathname === "/api/health") {
      return NextResponse.next();
    }
    if (pathname.startsWith("/portal")) {
      // Never expose the internal path shape on the portal domain.
      return NextResponse.redirect(new URL("/", request.url));
    }
    const url = request.nextUrl.clone();
    url.pathname = `/portal${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  // --- Internal domain: block direct access to portal routes. ---
  if (pathname.startsWith("/portal")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // --- Session refresh (Supabase SSR pattern). ---
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() revalidates the JWT against Supabase Auth on every
  // request — do not replace with getSession(), which trusts the cookie.
  const isDemoSession =
    process.env.DEMO_MODE === "true" &&
    request.cookies.get("demo_session")?.value === "true";
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
    return redirect;
  };

  const isPublicPath = PUBLIC_INTERNAL_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!user && !isPublicPath) {
    // API routes get a machine-readable 401, never a login redirect.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and images.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
