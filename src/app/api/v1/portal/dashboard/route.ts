import { cookies } from "next/headers";
import { PortalServiceLayer } from "@/lib/portal/services/PortalServiceLayer";
import {
  PORTAL_SESSION_COOKIE,
  resolvePortalSession,
} from "@/lib/portal/session";
import { ApiError, errorResponse, jsonResponse } from "@/lib/security/errors";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { assertWithinRateLimit, getClientIp } from "@/lib/security/request";

export const dynamic = "force-dynamic";

/**
 * The client portal's dashboard read.
 *
 * This handler used to authenticate nothing and pass hardcoded
 * `"mock-org-id"` / `"mock-client-id"` values into the service layer, behind a
 * commented-out session check. It also returned `error.message` to the caller
 * on failure, which for a Drizzle or Postgres fault names tables and columns.
 *
 * The organisation and client now come from the server-side session row and
 * from nowhere else. There is no request parameter that can change which
 * tenant's data is read — that is the whole of the isolation guarantee on this
 * route, and accepting either value from the caller would give it away.
 */
export async function GET(request: Request) {
  const ip = getClientIp(request.headers);

  try {
    const token = (await cookies()).get(PORTAL_SESSION_COOKIE)?.value;
    const session = await resolvePortalSession(token);

    if (!session) {
      throw new ApiError("unauthorized", "No active portal session.");
    }

    // Keyed by session rather than IP: several people at one client office
    // share an address, and throttling them as one is a support ticket, not a
    // defence. The session is the thing being spent.
    await assertWithinRateLimit(
      RATE_LIMITS.portalReadBySession,
      session.sessionId,
      { route: "portal.dashboard" },
    );

    const cursor = new URL(request.url).searchParams.get("cursor") ?? undefined;

    const dashboardData = await PortalServiceLayer.getDashboardView(
      session.organizationId,
      session.clientId,
      cursor,
    );

    return jsonResponse({ success: true, data: dashboardData });
  } catch (error) {
    return errorResponse(error, "api.portal.dashboard", { ip });
  }
}
