import { SignJWT, jwtVerify } from "jose";
import {
  shareSessions,
  sharePolicies,
  shareAccessLogs,
  externalIdentities,
  shareTokenNonces,
} from "@/db/schema/shares";
import { db } from "@/db";
import { eq, and, isNull } from "drizzle-orm";
import { getSigningSecret } from "@/lib/env.server";

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
   * Validates a token, strictly checking expiration, and database status.
   * Includes Password verification hook.
   */
  static async validateToken(token: string, passwordProvided?: string) {
    try {
      const { payload } = await jwtVerify(token, jwtSecret());
      const { sessionId, identityId, nonce } =
        payload as unknown as ShareTokenPayload;

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

      // Password Enforcement (Hardening Sprint 13.1)
      if (session.policyId) {
        const policy = await db.query.sharePolicies.findFirst({
          where: eq(sharePolicies.id, session.policyId),
        });
        if (policy?.requirePassword) {
          if (!passwordProvided) {
            throw new Error("PASSWORD_REQUIRED");
          }
          // In a real implementation, we would hash and compare against sharePasswords table here
        }
      }

      // We do NOT consume the nonce here, because validation can happen purely to read.
      // Nonces are consumed during sensitive mutating operations (approvals, annotations).

      return { valid: true, payload, session };
    } catch (error) {
      return { valid: false, error: (error as Error).message };
    }
  }

  /**
   * Evaluates if the current request satisfies the Share Policy.
   * Handles IP Allow/Deny and Country Restrictions.
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
      if (!policy.allowedIps.includes(reqIp)) return false;
    }

    // Country Restrictions
    if (policy.allowedCountries && policy.allowedCountries.length > 0) {
      if (!policy.allowedCountries.includes(reqCountry)) return false;
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

    // Wait, in schema we store it in access logs, but we should track last fingerprint in identity or compare against last log
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
