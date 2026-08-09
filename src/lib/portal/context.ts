/**
 * The tenant a portal request is allowed to read.
 *
 * Every portal page that reads data must obtain its organisation and client
 * from here, and from nowhere else. This exists because
 * `src/app/portal/(portal)/dashboard/page.tsx` did the opposite: it passed the
 * string literals `"mock-org-id"` and `"mock-client-id"` into
 * `PortalServiceLayer.getDashboardView()` whenever demo mode was off, with no
 * session check of any kind. The hardened equivalent already existed — the
 * route handler at `/api/v1/portal/dashboard` resolves the session cookie and
 * scopes the read by it — but it lives in a different file that the page never
 * called, so the page was an unauthenticated entry point sitting beside a
 * correct one.
 *
 * The whole guarantee is that identity is **derived, never supplied**:
 *
 *   · `getPortalContext()` takes no arguments. There is no parameter, query
 *     string, header or body field through which a caller can name the tenant
 *     it wants — replacing the mock literals with request-supplied values would
 *     have moved the vulnerability rather than closed it.
 *   · The organisation and client come from `client_portal_sessions`, a
 *     server-side row keyed by the SHA-256 of an httpOnly cookie. They were
 *     written there by `createPortalSessionForShare()` from the share's own
 *     project, so they cannot be influenced by whoever presents the cookie.
 *   · `resolvePortalSession()` checks `status = 'active'` and
 *     `expires_at > now()` in SQL, so an expired or revoked session resolves to
 *     null here and the caller fails closed.
 *
 * This is deliberately independent of the `/s/[token]` share route, which does
 * not yet resolve its token (Y-05, Sprint 2.5). A portal session established by
 * any means is honoured; no session means no read.
 */

import { cookies } from "next/headers";
import { isDemoMode } from "@/lib/env.server";
import { PORTAL_SESSION_COOKIE, resolvePortalSession } from "./session";

export type PortalContext = {
  readonly organizationId: string;
  readonly clientId: string;
  /** The server-side session row, or null when serving the demo dataset. */
  readonly sessionId: string | null;
};

/**
 * Resolves the caller's portal context, or null when there is no valid session.
 *
 * Null is the fail-closed answer and covers every rejection identically — no
 * cookie, an unknown token, an expired session, a revoked one. Callers must not
 * read tenant data when this returns null, and must not distinguish the cases
 * to the caller: which one applied is not information an external visitor
 * should be able to probe for.
 *
 * Demo mode returns the seeded demo identity without a session, matching the
 * behaviour the portal has always had for walkthroughs. That is not a
 * production bypass: `isDemoMode()` returns false under `NODE_ENV=production`
 * unconditionally and independently of the boot gate
 * (see `src/lib/env.server.ts`), so this branch is unreachable there even if
 * `DEMO_MODE=true` survives into the deployment's environment.
 */
export async function getPortalContext(): Promise<PortalContext | null> {
  if (isDemoMode()) {
    // Imported dynamically so the demo dataset stays out of the bundle for a
    // deployment that never serves it — the same pattern PortalServiceLayer
    // uses for its own demo branch.
    const { DEMO_ORG_ID, DEMO_PORTAL_CLIENT_ID } =
      await import("../demo/store");
    return {
      organizationId: DEMO_ORG_ID,
      clientId: DEMO_PORTAL_CLIENT_ID,
      sessionId: null,
    };
  }

  const token = (await cookies()).get(PORTAL_SESSION_COOKIE)?.value;
  const session = await resolvePortalSession(token);
  if (!session) return null;

  return {
    organizationId: session.organizationId,
    clientId: session.clientId,
    sessionId: session.sessionId,
  };
}
