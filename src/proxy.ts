import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

const PUBLIC_INTERNAL_PATHS = ["/login", "/auth", "/unprovisioned"];

function isPortalHost(host: string): boolean {
  if (!host) return false;
  const bare = host.toLowerCase().split(":")[0];
  const portalBare = PORTAL_DOMAIN.toLowerCase().split(":")[0];
  if (portalBare && bare === portalBare) return true;
  return bare.startsWith("portal.");
}

/** Only same-site relative paths may be used as post-login destinations. */
function safeInternalPath(path: string | null): string | null {
  if (!path) return null;
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (path.startsWith("/portal") || path.startsWith("/auth")) return null;
  return path;
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const { pathname } = request.nextUrl;

  // --- Client portal domain: rewrite into the /portal route group. ---
  if (isPortalHost(host)) {
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return redirectWithCookies(url);
  }

  if (user && pathname === "/login") {
    const next =
      safeInternalPath(request.nextUrl.searchParams.get("next")) ??
      "/dashboard";
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
