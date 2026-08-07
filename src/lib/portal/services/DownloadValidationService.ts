import { db } from "@/db";
import { clientPortalSessions } from "@/db/schema/client-portal";
import { projects } from "@/db/schema/projects";
import { files, fileVersions } from "@/db/schema/files";
import {
  shareExpiration,
  sharePolicies,
  shareSessionItems,
  shareSessions,
} from "@/db/schema/shares";
import { and, eq, gt } from "drizzle-orm";
import { storageService } from "@/lib/storage/SupabaseStorageProvider";
import { logSecurityEvent } from "@/lib/security/logger";

/**
 * Authorises a portal download and issues a URL for it.
 *
 * The previous implementation ran four checks that looked like a chain of
 * defences and were not:
 *
 *   · `validatePermission` asked "does a share_session row with this id
 *     exist?" — with no reference to the client making the request. Any portal
 *     client could name any share session id on the platform and be
 *     authorised. A cross-tenant IDOR on the one route whose entire job is
 *     authorising access to files.
 *   · Expiry, revocation and the view cap in `share_expiration` were never
 *     read, so `expiresAt`, `isRevoked` and `maxViews` were decorative.
 *   · The share's own status was not checked, so a draft or closed share was
 *     downloadable.
 *   · `generateSignedUrl` returned a hand-written string containing
 *     `token=temp_token` against a hostname that does not exist. Nothing was
 *     signed, and nothing would have downloaded.
 *
 * The parameters changed shape. The old signature took a `resourceId` that was
 * a share session, and a share is a collection — it cannot name the object to
 * be signed, which is why the URL had to be invented. The caller now says
 * which file within which share, and both are verified. Nothing called this
 * service, so no call site had to be migrated.
 */

export type PortalDownloadRequest = {
  /** The caller's portal session, from the httpOnly cookie. */
  readonly portalSessionId: string;
  /** The client the session belongs to. Never taken from the request body. */
  readonly clientId: string;
  /** The share the file is being requested through. */
  readonly shareSessionId: string;
  /** The file within that share. */
  readonly fileId: string;
};

/**
 * One message for every denial.
 *
 * The caller is external. Distinguishing "no such share" from "not yours" from
 * "expired" turns this into an enumeration oracle over other tenants' ids.
 */
export class DownloadDeniedError extends Error {
  constructor() {
    super("This download is not available.");
    this.name = "DownloadDeniedError";
  }
}

export class DownloadValidationService {
  /** Validates a download request and returns a short-lived URL. */
  static async validateAndGetDownloadUrl(
    request: PortalDownloadRequest,
  ): Promise<string> {
    const { portalSessionId, clientId, shareSessionId, fileId } = request;

    const deny = (reason: string): never => {
      logSecurityEvent("portal.download_denied", "denied", {
        reason,
        portalSessionId,
      });
      throw new DownloadDeniedError();
    };

    // 1. The portal session must be live and must belong to this client.
    const session = await this.getActiveSession(portalSessionId, clientId);
    if (!session) deny("no_active_session");

    // 2. The share must be published, owned by the session's organisation, and
    //    attached to a project belonging to this client. All three matter: the
    //    organisation check stops cross-tenant access, and the client check
    //    stops one client of the same agency reading another's work.
    const share = await this.getAuthorisedShare(
      shareSessionId,
      session!.organizationId,
      clientId,
    );
    if (!share) deny("share_not_authorised");

    // 3. Lifecycle bounds. These columns exist to constrain a link that has
    //    been forwarded on; reading them is what makes them true.
    const lifecycle = await this.checkLifecycle(shareSessionId);
    if (!lifecycle.ok) deny(lifecycle.reason);

    // 4. A view-only share is a deliberate choice by whoever published it.
    if (!(await this.policyAllowsDownload(share!.policyId))) {
      deny("policy_forbids_download");
    }

    // 5. The file must actually be *in* this share. Without this the first
    //    four checks authorise a share and then hand over any file id the
    //    caller supplies — the same IDOR, one level down.
    const storagePath = await this.getSharedFileStoragePath(
      shareSessionId,
      fileId,
      session!.organizationId,
    );
    if (!storagePath) deny("file_not_in_share");

    logSecurityEvent("portal.download_allowed", "allowed", {
      portalSessionId,
      shareSessionId,
      fileId,
    });

    // Fifteen minutes: long enough to start a large download, short enough
    // that a URL captured from a browser history or proxy log is already dead.
    return storageService.createPreSignedDownloadUrl(storagePath!, 900);
  }

  /** The portal session, if it is active, unexpired and this client's. */
  private static async getActiveSession(sessionId: string, clientId: string) {
    const [session] = await db
      .select({ organizationId: clientPortalSessions.organizationId })
      .from(clientPortalSessions)
      .where(
        and(
          eq(clientPortalSessions.sessionId, sessionId),
          eq(clientPortalSessions.clientId, clientId),
          eq(clientPortalSessions.status, "active"),
          gt(clientPortalSessions.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return session ?? null;
  }

  /**
   * The share, if this organisation and client are entitled to it.
   *
   * The join to `projects` is the client check: a share names a project, and
   * the project names the client it belongs to. Without the join, the only
   * thing tying a share to a requester is that both exist.
   */
  private static async getAuthorisedShare(
    shareId: string,
    organizationId: string,
    clientId: string,
  ) {
    const [share] = await db
      .select({ id: shareSessions.id, policyId: shareSessions.policyId })
      .from(shareSessions)
      .innerJoin(projects, eq(projects.projectId, shareSessions.projectId))
      .where(
        and(
          eq(shareSessions.id, shareId),
          eq(shareSessions.organizationId, organizationId),
          eq(projects.clientId, clientId),
          eq(shareSessions.status, "published"),
        ),
      )
      .limit(1);

    return share ?? null;
  }

  /** Expiry, revocation and the view cap, from `share_expiration`. */
  private static async checkLifecycle(
    shareId: string,
  ): Promise<{ ok: true; reason?: never } | { ok: false; reason: string }> {
    const [expiry] = await db
      .select({
        expiresAt: shareExpiration.expiresAt,
        maxViews: shareExpiration.maxViews,
        currentViews: shareExpiration.currentViews,
        isRevoked: shareExpiration.isRevoked,
      })
      .from(shareExpiration)
      .where(eq(shareExpiration.sessionId, shareId))
      .limit(1);

    // No row means no additional constraint was configured. The share's
    // `published` status, already checked, still governs.
    if (!expiry) return { ok: true };

    if (expiry.isRevoked) return { ok: false, reason: "revoked" };

    if (expiry.expiresAt && expiry.expiresAt.getTime() <= Date.now()) {
      return { ok: false, reason: "expired" };
    }

    if (expiry.maxViews !== null && expiry.currentViews >= expiry.maxViews) {
      return { ok: false, reason: "view_cap_reached" };
    }

    return { ok: true };
  }

  /** Whether the attached policy permits downloads. No policy: permitted. */
  private static async policyAllowsDownload(
    policyId: string | null,
  ): Promise<boolean> {
    if (!policyId) return true;

    const [policy] = await db
      .select({ allowDownloads: sharePolicies.allowDownloads })
      .from(sharePolicies)
      .where(eq(sharePolicies.id, policyId))
      .limit(1);

    return policy ? policy.allowDownloads : true;
  }

  /**
   * The storage path of a file, if that file is part of the share.
   *
   * Resolved through `share_session_items` so membership is proven by the join
   * rather than assumed, and the organisation is re-asserted on every table in
   * the chain — a mis-set `organization_id` anywhere along it would otherwise
   * be enough to cross the boundary.
   */
  private static async getSharedFileStoragePath(
    shareSessionId: string,
    fileId: string,
    organizationId: string,
  ): Promise<string | null> {
    const [row] = await db
      .select({ storagePath: fileVersions.storagePath })
      .from(shareSessionItems)
      .innerJoin(files, eq(files.fileId, shareSessionItems.fileId))
      .innerJoin(
        fileVersions,
        eq(fileVersions.versionId, files.currentVersionId),
      )
      .where(
        and(
          eq(shareSessionItems.sessionId, shareSessionId),
          eq(shareSessionItems.fileId, fileId),
          eq(shareSessionItems.organizationId, organizationId),
          eq(files.organizationId, organizationId),
          eq(fileVersions.organizationId, organizationId),
        ),
      )
      .limit(1);

    return row?.storagePath ?? null;
  }
}
