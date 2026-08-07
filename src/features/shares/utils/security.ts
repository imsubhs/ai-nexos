import { SignJWT, jwtVerify } from "jose";
import {
  shareSessions,
  sharePolicies,
  sharePasswords,
  shareExpiration,
  shareAccessLogs,
  externalIdentities,
  shareTokenNonces,
} from "@/db/schema/shares";
import { db } from "@/db";
import { eq, and, isNull } from "drizzle-orm";
import { getSigningSecret } from "@/lib/env.server";
import { verifySharePassword } from "@/lib/security/password";
import { ipMatchesAnyRule } from "@/lib/security/ip-match";
import { consumeRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { logSecurityEvent } from "@/lib/security/logger";

/**
 * Resolved per call rather than captured at import time: a missing secret must
 * fail loudly in production instead of falling back to a constant living in
 * this file. Share tokens gate unauthenticated portal access, so a predictable
 * signing key would let anyone mint a valid share session.
 */
const jwtSecret = () => getSigningSecret("SHARE_JWT_SECRET");

export interface ShareTokenPayload {
  sessionId: string;
  identityId?: string;
  exp: number;
  nonce: string; // Replay protection
}

export class ShareSecurityMiddleware {
  /**
   * Generates a signed URL token for external clients.
   * Enforces immutability: New sessions get new tokens.
   */
  static async generateShareToken(
    sessionId: string,
    identityId?: string,
    expiresInDays: number = 7,
  ): Promise<string> {
    const alg = "HS256";
    const expirationTime =
      Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60;
    const nonce = crypto.randomUUID();

    // Register nonce for single-use validation (Hardening Sprint 13.1)
    await db.insert(shareTokenNonces).values({
      nonce,
      sessionId,
      identityId,
      expiresAt: new Date(expirationTime * 1000),
    });

    return new SignJWT({
      sessionId,
      identityId,
      nonce,
    })
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setExpirationTime(expirationTime)
      .sign(jwtSecret());
  }

  /**
   * Consumes a nonce atomically. Returns true if consumption was successful (meaning it was unused).
   * Ref: Hardening Sprint 13.1 Rule #1 "Nonce consumption must be atomic."
   */
  static async consumeNonce(nonce: string): Promise<boolean> {
    const result = await db
      .update(shareTokenNonces)
      .set({ usedAt: new Date() })
      .where(
        and(eq(shareTokenNonces.nonce, nonce), isNull(shareTokenNonces.usedAt)),
      )
      .returning();

    return result.length > 0;
  }

  /**
   * Validates a share token: signature, expiry, session state, lifecycle
   * bounds and password.
   *
   * The password branch used to read:
   *
   *     if (policy?.requirePassword) {
   *       if (!passwordProvided) throw new Error("PASSWORD_REQUIRED");
   *       // In a real implementation, we would hash and compare against
   *       // sharePasswords table here
   *     }
   *
   * — so *any* non-empty string satisfied a password-protected share. The
   * protection an agency believed it had applied to a confidential deliverable
   * amounted to the presence of a form field. It is now checked against the
   * scrypt hash in `share_passwords`, with attempts rate-limited per session so
   * the check cannot simply be brute-forced instead.
   *
   * `share_expiration` is also consulted now. Its `expiresAt`, `isRevoked` and
   * `maxViews` columns existed and were never read, which meant revoking a
   * share did nothing until someone changed its status by hand.
   */
  static async validateToken(token: string, passwordProvided?: string) {
    try {
      const { payload } = await jwtVerify(token, jwtSecret());
      const { sessionId } = payload as unknown as ShareTokenPayload;

      // Ensure session is PUBLISHED and not EXPIRED/CLOSED
      const session = await db.query.shareSessions.findFirst({
        where: eq(shareSessions.id, sessionId),
        with: {
          policy: true,
        },
      });

      if (!session) throw new Error("Session not found");
      if (session.status !== "published")
        throw new Error(`Session is ${session.status}`);

      // Revocation and expiry live in share_expiration, not on the session.
      // Checking status alone left a revoked share fully usable.
      const lifecycle = await this.checkLifecycle(sessionId);
      if (!lifecycle.ok) throw new Error(lifecycle.reason);

      // Password enforcement (Hardening Sprint 13.1), now actually enforcing.
      if (session.policyId) {
        const policy = await db.query.sharePolicies.findFirst({
          where: eq(sharePolicies.id, session.policyId),
        });

        if (policy?.requirePassword) {
          if (!passwordProvided) {
            throw new Error("PASSWORD_REQUIRED");
          }

          // Bound the guessing before doing the work, not after: scrypt is
          // deliberately slow, so an unthrottled attempt is also a cheap way to
          // burn this server's CPU.
          const attempts = await consumeRateLimit(
            RATE_LIMITS.sharePasswordBySession,
            sessionId,
          );
          if (!attempts.allowed) {
            logSecurityEvent("share.password_throttled", "throttled", {
              sessionId,
            });
            throw new Error("Too many attempts");
          }

          const stored = await db.query.sharePasswords.findFirst({
            where: eq(sharePasswords.sessionId, sessionId),
          });

          // A share marked password-protected with no stored password is a
          // broken record. It is refused, not waved through: "no password on
          // file" must never mean "any password will do".
          if (!stored) {
            logSecurityEvent("share.password_missing_record", "denied", {
              sessionId,
            });
            throw new Error("Password not configured");
          }

          const matches = await verifySharePassword(passwordProvided, {
            hash: stored.hashedPassword,
            salt: stored.salt,
          });

          if (!matches) {
            logSecurityEvent("share.password_rejected", "denied", {
              sessionId,
            });
            throw new Error("Invalid password");
          }
        }
      }

      // We do NOT consume the nonce here, because validation can happen purely to read.
      // Nonces are consumed during sensitive mutating operations (approvals, annotations).

      return { valid: true, payload, session };
    } catch (error) {
      return { valid: false, error: (error as Error).message };
    }
  }

  /** Revocation, expiry and the view cap, from `share_expiration`. */
  private static async checkLifecycle(
    sessionId: string,
  ): Promise<{ ok: true; reason?: never } | { ok: false; reason: string }> {
    const expiry = await db.query.shareExpiration.findFirst({
      where: eq(shareExpiration.sessionId, sessionId),
    });

    // No row means no extra constraint was configured; the session's own
    // published status still governs.
    if (!expiry) return { ok: true };

    if (expiry.isRevoked) return { ok: false, reason: "Session is revoked" };

    if (expiry.expiresAt && expiry.expiresAt.getTime() <= Date.now()) {
      return { ok: false, reason: "Session has expired" };
    }

    if (expiry.maxViews !== null && expiry.currentViews >= expiry.maxViews) {
      return { ok: false, reason: "View limit reached" };
    }

    return { ok: true };
  }

  /**
   * Evaluates if the current request satisfies the Share Policy.
   * Handles IP Allow/Deny and Country Restrictions.
   *
   * IP rules now understand CIDR. Exact string equality meant an operator who
   * wrote `203.0.113.0/24` — the natural way to express "the client's office"
   * — got a policy that matched nobody, and one who wrote single addresses got
   * a policy that broke on the next DHCP lease. Either way the restriction was
   * abandoned, and an abandoned control protects nothing.
   */
  static async evaluatePolicyConstraints(
    policy: {
      allowedIps?: string[] | null;
      allowedCountries?: string[] | null;
    } | null,
    reqIp: string,
    reqCountry: string,
  ): Promise<boolean> {
    if (!policy) return true;

    // IP Restrictions
    if (policy.allowedIps && policy.allowedIps.length > 0) {
      if (!ipMatchesAnyRule(reqIp, policy.allowedIps)) return false;
    }

    // Country Restrictions. Compared case-insensitively: ISO codes arrive as
    // "gb" from one edge provider and "GB" from another, and a case mismatch
    // silently denies every legitimate visitor.
    if (policy.allowedCountries && policy.allowedCountries.length > 0) {
      const country = reqCountry.trim().toUpperCase();
      const allowed = policy.allowedCountries.map((c) =>
        c.trim().toUpperCase(),
      );
      if (!country || !allowed.includes(country)) return false;
    }

    return true;
  }

  /**
   * Checks device fingerprint. If it changes, we force re-authentication (never permanent block).
   * Architecture Decision #11: "Device fingerprint changes -> Re-authentication. Never permanent blocking."
   */
  static async checkDeviceFingerprint(
    identityId: string,
    currentFingerprint: string,
  ): Promise<{ allowed: boolean; requireReauth: boolean }> {
    const identity = await db.query.externalIdentities.findFirst({
      where: eq(externalIdentities.id, identityId),
    });

    if (!identity) return { allowed: false, requireReauth: true };

    // The last successful access is the reference point; a change against it
    // means the session moved to a different device.
    const lastLog = await db.query.shareAccessLogs.findFirst({
      where: and(
        eq(shareAccessLogs.identityId, identityId),
        eq(shareAccessLogs.isSuccess, true),
      ),
      orderBy: (logs, { desc }) => [desc(logs.createdAt)],
    });

    if (
      lastLog &&
      lastLog.deviceFingerprint &&
      lastLog.deviceFingerprint !== currentFingerprint
    ) {
      // Fingerprint changed -> Re-authenticate
      return { allowed: false, requireReauth: true };
    }

    return { allowed: true, requireReauth: false };
  }
}
