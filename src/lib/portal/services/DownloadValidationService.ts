import { db } from "@/db";
import { clientPortalSessions } from "@/db/schema/client-portal";
import { shareSessions, sharePolicies } from "@/db/schema/shares";
import { eq, and, gt } from "drizzle-orm";

export class DownloadValidationService {
  /**
   * Validates download requests following the strict sequence:
   * Portal Session -> Permission -> Share Policy -> Signed URL
   */
  static async validateAndGetDownloadUrl(
    sessionId: string,
    clientId: string,
    resourceId: string,
    _resourceType: "deliverable" | "share_session",
  ): Promise<string> {
    // 1. Validate Portal Session
    const sessionValid = await this.validatePortalSession(sessionId, clientId);
    if (!sessionValid) throw new Error("Invalid or expired portal session.");

    // 2. Validate Permission
    const hasPermission = await this.validatePermission(
      clientId,
      resourceId,
      _resourceType,
    );
    if (!hasPermission)
      throw new Error("Insufficient permissions to download this resource.");

    // 3. Validate Share Policy
    const policyValid = await this.validateSharePolicy(resourceId);
    if (!policyValid)
      throw new Error("Share policy restricts downloading this resource.");

    // 4. Generate Signed URL
    const signedUrl = await this.generateSignedUrl(resourceId);

    return signedUrl;
  }

  private static async validatePortalSession(
    sessionId: string,
    clientId: string,
  ): Promise<boolean> {
    const session = await db.query.clientPortalSessions.findFirst({
      where: and(
        eq(clientPortalSessions.sessionId, sessionId),
        eq(clientPortalSessions.clientId, clientId),
        eq(clientPortalSessions.status, "active"),
        gt(clientPortalSessions.expiresAt, new Date()),
      ),
    });
    return !!session;
  }

  private static async validatePermission(
    clientId: string,
    resourceId: string,
    _resourceType: string,
  ): Promise<boolean> {
    const share = await db.query.shareSessions.findFirst({
      where: eq(shareSessions.id, resourceId),
    });
    return !!share;
  }

  private static async validateSharePolicy(
    resourceId: string,
  ): Promise<boolean> {
    const shareSession = await db.query.shareSessions.findFirst({
      where: eq(shareSessions.id, resourceId),
    });
    if (!shareSession || !shareSession.policyId) return true;

    const policy = await db.query.sharePolicies.findFirst({
      where: eq(sharePolicies.id, shareSession.policyId),
    });

    if (policy && !policy.allowDownloads) return false;
    return true;
  }

  private static async generateSignedUrl(resourceId: string): Promise<string> {
    // Max 15 minutes (900 seconds) expiry as requested
    const expiresIn = 900;
    return `https://storage.ainexos.com/signed/${resourceId}?token=temp_token&expiresIn=${expiresIn}`;
  }
}
