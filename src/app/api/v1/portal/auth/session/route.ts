import { cookies } from "next/headers";
import { z } from "zod";
import { ShareSecurityMiddleware } from "@/features/shares/utils/security";
import {
  PORTAL_SESSION_COOKIE,
  PORTAL_SESSION_TTL_SECONDS,
  createPortalSessionForShare,
  portalSessionCookieOptions,
  revokePortalSession,
} from "@/lib/portal/session";
import { ApiError, errorResponse, jsonResponse } from "@/lib/security/errors";
import { logSecurityEvent } from "@/lib/security/logger";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import {
  assertSameOrigin,
  assertWithinRateLimit,
  getClientIp,
  readJsonBody,
} from "@/lib/security/request";

/**
 * Exchanges a share-link token for a portal session.
 *
 * What was here before returned `{ success: true, message: "Session
 * authenticated via external store" }` for any request body, without reading
 * the token. Any caller was authenticated, because nothing was checked. The
 * DELETE handler likewise reported a revocation it never performed.
 *
 * The exchange now: validate the share token cryptographically, confirm the
 * share session is published and its policy is satisfied, then mint a
 * server-side session scoped to the organisation and client derived from the
 * share's own project. Nothing about the resulting session comes from the
 * request body.
 */

const exchangeSchema = z.object({
  token: z.string().min(16).max(4096),
  /** Only supplied when the share policy requires a password. */
  password: z.string().min(1).max(512).optional(),
});

/** One message for every rejection, so this is not a share-token oracle. */
const REJECTED = "This link is invalid, expired, or no longer active.";

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);

  try {
    assertSameOrigin(request);
    await assertWithinRateLimit(RATE_LIMITS.portalSessionByIp, ip, {
      route: "portal.session.create",
    });

    const { token, password } = await readJsonBody(request, exchangeSchema);

    const validation = await ShareSecurityMiddleware.validateToken(
      token,
      password,
    );

    if (!validation.valid || !validation.session) {
      // A missing password is the one case the client can act on, so it is
      // distinguished — it reveals only that the link exists and is protected,
      // which the person holding the link already knows.
      if (validation.error === "PASSWORD_REQUIRED") {
        throw new ApiError("unauthorized", "This link requires a password.");
      }
      logSecurityEvent("portal.session_rejected", "denied", { ip });
      throw new ApiError("forbidden", REJECTED);
    }

    const created = await createPortalSessionForShare(validation.session.id);
    if (!created) {
      // The share's project has no client, so there is no tenant to scope the
      // session to. Inventing one would be the isolation hole this exists to
      // prevent.
      logSecurityEvent("portal.session_rejected", "denied", {
        ip,
        reason: "share_has_no_client",
      });
      throw new ApiError("forbidden", REJECTED);
    }

    const store = await cookies();
    store.set(
      PORTAL_SESSION_COOKIE,
      created.token,
      portalSessionCookieOptions(PORTAL_SESSION_TTL_SECONDS),
    );

    logSecurityEvent("portal.session_created", "allowed", {
      ip,
      sessionId: created.session.sessionId,
    });

    // The session token itself is never in the body — it is in an httpOnly
    // cookie, so no portal script can read it or leak it to a third party.
    return jsonResponse({
      success: true,
      expiresAt: created.expiresAt.toISOString(),
    });
  } catch (error) {
    return errorResponse(error, "api.portal.session.create", { ip });
  }
}

export async function DELETE(request: Request) {
  const ip = getClientIp(request.headers);

  try {
    assertSameOrigin(request);

    const store = await cookies();
    const token = store.get(PORTAL_SESSION_COOKIE)?.value;

    // Revoke server-side first: clearing the cookie alone leaves a live row
    // that anyone holding a copy of the token can keep using.
    const revoked = await revokePortalSession(token);
    store.delete(PORTAL_SESSION_COOKIE);

    logSecurityEvent("portal.session_revoked", "allowed", { ip, revoked });

    // Reported as success either way. Whether a session existed is not
    // information this endpoint should confirm, and the caller's state after
    // the call is the same regardless.
    return jsonResponse({ success: true });
  } catch (error) {
    return errorResponse(error, "api.portal.session.revoke", { ip });
  }
}
