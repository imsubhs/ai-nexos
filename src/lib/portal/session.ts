/**
 * Client-portal sessions.
 *
 * The portal is reached by external clients who have no account in this system.
 * Their credential is a share link; this module is what turns that one-time
 * credential into a session, and what every portal read consults afterwards.
 *
 * The routes this replaces were scaffolding: `/api/v1/portal/auth/session`
 * returned `{ success: true }` for any input without looking at the token at
 * all, and `/api/v1/portal/dashboard` served data for a hardcoded
 * `"mock-org-id"` / `"mock-client-id"`. Neither authenticated anything.
 *
 * Design decisions, and why:
 *
 *   - The session token is opaque and random, not a JWT. The database row is
 *     the authority, so revoking a session is a single UPDATE and takes effect
 *     on the next request. A self-contained signed token cannot be withdrawn
 *     before it expires without a revocation list, which is the same database
 *     round trip with extra steps.
 *   - Only a SHA-256 of the token is stored. `client_portal_sessions` is an
 *     ordinary table that will appear in backups, replicas and any future
 *     read-only analytics connection; storing the bearer credential in the
 *     clear there means one leaked dump is one takeover of every live portal
 *     session. A plain hash (not a slow KDF) is correct here because the token
 *     is 256 bits of machine-generated randomness — there is no dictionary to
 *     run against it.
 *   - The client and organisation are read from the *share session's project*
 *     and written onto the row at creation, never taken from the request.
 *     Everything downstream scopes its queries by those two values, so a
 *     caller-supplied organisation id is the entire tenant-isolation boundary
 *     handed to the attacker.
 */

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { clientPortalSessions } from "@/db/schema/client-portal";
import { projects } from "@/db/schema/projects";
import { shareSessions } from "@/db/schema/shares";

/** Name of the cookie carrying the portal session token. */
export const PORTAL_SESSION_COOKIE = "nexos_portal_session";

/**
 * Eight hours.
 *
 * A client reviews a deliverable in one sitting; a session that outlives the
 * working day is a credential sitting in a browser on an unmanaged device for
 * no benefit. The share link itself is the long-lived artefact, and it can be
 * exchanged for a fresh session whenever it is opened.
 */
export const PORTAL_SESSION_TTL_SECONDS = 8 * 60 * 60;

export type PortalSession = {
  readonly sessionId: string;
  readonly organizationId: string;
  readonly clientId: string;
};

/** Cookie attributes for the portal session. */
export function portalSessionCookieOptions(maxAgeSeconds: number) {
  return {
    path: "/",
    // No portal script reads this value, so no script may.
    httpOnly: true,
    // The portal is reached by following a link from an email, which is a
    // top-level navigation; "strict" would drop the cookie on that first hop.
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV !== "development",
    maxAge: maxAgeSeconds,
  };
}

/** 256 bits of randomness, URL-safe. */
function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Hashes a session token for storage and lookup.
 *
 * Both sides go through this, so a raw token never appears in a query
 * parameter, a slow-query log, or a database error message.
 */
function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Exchanges a validated share session for a portal session.
 *
 * The caller must already have proven the share token — this function trusts
 * `shareSessionId` and derives everything else from the database.
 *
 * Returns the raw token exactly once; only its hash is retained.
 */
export async function createPortalSessionForShare(
  shareSessionId: string,
): Promise<{ token: string; session: PortalSession; expiresAt: Date } | null> {
  // Join to the project rather than trusting anything from the request: the
  // organisation and client that will scope every subsequent read come from
  // the share session's own project row.
  const [row] = await db
    .select({
      organizationId: shareSessions.organizationId,
      clientId: projects.clientId,
    })
    .from(shareSessions)
    .innerJoin(projects, eq(projects.projectId, shareSessions.projectId))
    .where(eq(shareSessions.id, shareSessionId))
    .limit(1);

  // A project with no client cannot produce a client-scoped session, and
  // inventing one would be a tenant-isolation hole rather than a convenience.
  if (!row?.clientId) return null;

  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + PORTAL_SESSION_TTL_SECONDS * 1000);

  const [created] = await db
    .insert(clientPortalSessions)
    .values({
      organizationId: row.organizationId,
      clientId: row.clientId,
      // Only the hash is persisted — see the module header.
      token: hashSessionToken(token),
      status: "active",
      expiresAt,
    })
    .returning({ sessionId: clientPortalSessions.sessionId });

  if (!created) return null;

  return {
    token,
    expiresAt,
    session: {
      sessionId: created.sessionId,
      organizationId: row.organizationId,
      clientId: row.clientId,
    },
  };
}

/**
 * Resolves a raw session token to an active session, or null.
 *
 * Status and expiry are both checked in the query. Relying on the cleanup
 * worker to remove expired rows would make session lifetime depend on a cron
 * job running, which is not a property to bet authentication on.
 */
export async function resolvePortalSession(
  token: string | undefined,
): Promise<PortalSession | null> {
  if (!token) return null;

  const [session] = await db
    .select({
      sessionId: clientPortalSessions.sessionId,
      organizationId: clientPortalSessions.organizationId,
      clientId: clientPortalSessions.clientId,
    })
    .from(clientPortalSessions)
    .where(
      and(
        eq(clientPortalSessions.token, hashSessionToken(token)),
        eq(clientPortalSessions.status, "active"),
        gt(clientPortalSessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return session ?? null;
}

/**
 * Revokes a session by token.
 *
 * Marks it revoked rather than deleting it, so the row remains available to an
 * audit of who held access and when it was withdrawn.
 */
export async function revokePortalSession(
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;

  const revoked = await db
    .update(clientPortalSessions)
    .set({ status: "revoked" })
    .where(
      and(
        eq(clientPortalSessions.token, hashSessionToken(token)),
        eq(clientPortalSessions.status, "active"),
      ),
    )
    .returning({ sessionId: clientPortalSessions.sessionId });

  return revoked.length > 0;
}

/** Exposed for tests, which must be able to compute the stored form. */
export const __hashSessionToken = hashSessionToken;
