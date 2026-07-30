import { db } from "@/db";
import { clientPortalSessions } from "@/db/schema/client-portal";
import { lte } from "drizzle-orm";

export class SessionCleanupWorker {
  /**
   * Deletes all expired portal sessions to prevent table bloat.
   * This should be called by a cron job or background worker periodically.
   */
  static async cleanupExpiredSessions() {
    const now = new Date();
    try {
      const result = await db
        .delete(clientPortalSessions)
        .where(lte(clientPortalSessions.expiresAt, now))
        .returning({ deletedId: clientPortalSessions.sessionId });

      console.log(
        `[SessionCleanupWorker] Cleaned up ${result.length} expired sessions at ${now.toISOString()}`,
      );
      return result.length;
    } catch (error) {
      console.error(
        "[SessionCleanupWorker] Failed to clean up sessions",
        error,
      );
      throw error;
    }
  }
}
