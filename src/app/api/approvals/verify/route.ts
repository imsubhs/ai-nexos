import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { reviews } from "@/db/schema/approvals";
import { verifyExternalReviewToken } from "@/features/approvals/tokens";
import { ApiError, errorResponse, jsonResponse } from "@/lib/security/errors";
import { logSecurityEvent } from "@/lib/security/logger";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import {
  assertWithinRateLimit,
  getClientIp,
  readJsonBody,
} from "@/lib/security/request";
import { timingSafeCompare } from "@/lib/security/password";

/**
 * Verifies an external reviewer's approval token.
 *
 * This endpoint is unauthenticated by design — the token *is* the credential,
 * held by someone outside the organisation. What it previously did was look the
 * supplied string up in `reviews.external_token` and, on a hit, return the
 * reviewer's email address. Four things were wrong with that:
 *
 *   1. The signature was never checked, even though
 *      `features/approvals/tokens.ts` signs these as JWTs. Any value that
 *      matched a row was accepted, so the signing key was doing nothing.
 *   2. Nothing expired. A token issued with a 7-day lifetime stayed valid for
 *      as long as the row existed.
 *   3. The review's status was ignored — an already-submitted review could be
 *      verified again.
 *   4. There was no rate limit on an endpoint whose entire purpose is checking
 *      a guessable-length secret, and a hit disclosed an email address.
 *
 * The order below is deliberate: signature and expiry are checked
 * cryptographically *before* the database is touched, so an unauthenticated
 * caller cannot use this route to probe for row existence at all.
 */

const verifySchema = z.object({
  reviewId: z.uuid("reviewId must be a UUID"),
  // Bounded: a JWT this application issues is well under a kilobyte, and an
  // unbounded string is free CPU for whoever sends it.
  token: z.string().min(16).max(4096),
});

/** One message for every failure mode, so the response is not an oracle. */
const REJECTED = "Invalid or expired token.";

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);

  try {
    await assertWithinRateLimit(RATE_LIMITS.approvalVerifyByIp, ip, {
      route: "approvals.verify",
    });

    const { reviewId, token } = await readJsonBody(request, verifySchema);

    // Cryptographic checks first: signature, expiry, and that the token was
    // minted for the review the caller named. A token valid for review A must
    // not authorise review B.
    let claims: { reviewId: string; externalEmail: string };
    try {
      claims = await verifyExternalReviewToken(token);
    } catch {
      logSecurityEvent("approval.token_rejected", "denied", {
        reason: "signature_or_expiry",
        ip,
      });
      throw new ApiError("forbidden", REJECTED);
    }

    if (claims.reviewId !== reviewId) {
      logSecurityEvent("approval.token_rejected", "denied", {
        reason: "review_mismatch",
        ip,
      });
      throw new ApiError("forbidden", REJECTED);
    }

    const review = await db.query.reviews.findFirst({
      where: and(eq(reviews.reviewId, reviewId), eq(reviews.status, "pending")),
      columns: {
        reviewId: true,
        externalEmail: true,
        externalToken: true,
        status: true,
      },
    });

    // A review that is missing, already decided, or was never delegated
    // externally is refused with the same message as a bad signature.
    if (!review || !review.externalToken || !review.externalEmail) {
      logSecurityEvent("approval.token_rejected", "denied", {
        reason: "no_pending_review",
        ip,
      });
      throw new ApiError("forbidden", REJECTED);
    }

    // The stored token is the revocation record: reissuing supersedes the old
    // one, so a still-unexpired token that no longer matches must be refused.
    // Compared in constant time — a byte-by-byte early exit leaks the prefix.
    if (!timingSafeCompare(review.externalToken, token)) {
      logSecurityEvent("approval.token_rejected", "denied", {
        reason: "superseded",
        ip,
      });
      throw new ApiError("forbidden", REJECTED);
    }

    logSecurityEvent("approval.token_accepted", "allowed", { reviewId, ip });

    // The email is echoed back so the portal can show who it believes is
    // reviewing. It is the address the token was issued to, and the holder of
    // the token already knows it — but it is only ever returned after the
    // token has been proven valid, never as a side effect of a lookup.
    return jsonResponse({
      success: true,
      reviewId: review.reviewId,
      externalEmail: review.externalEmail,
    });
  } catch (error) {
    return errorResponse(error, "api.approvals.verify", { ip });
  }
}
