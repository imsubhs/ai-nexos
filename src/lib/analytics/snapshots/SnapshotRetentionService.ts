import { AnalyticsSnapshot } from "../types";

export class SnapshotRetentionService {
  /**
   * Defines the retention policy for snapshots.
   * Hourly: 30 days
   * Daily: 12 months
   * Monthly: Forever (no expiry)
   */
  getRetentionDate(
    period: "HOURLY" | "DAILY" | "MONTHLY",
    currentDate: Date = new Date(),
  ): Date | null {
    const cutoffDate = new Date(currentDate);

    switch (period) {
      case "HOURLY":
        cutoffDate.setDate(cutoffDate.getDate() - 30);
        return cutoffDate;
      case "DAILY":
        cutoffDate.setMonth(cutoffDate.getMonth() - 12);
        return cutoffDate;
      case "MONTHLY":
        return null; // Forever
      default:
        throw new Error(`Unknown period: ${period}`);
    }
  }

  /**
   * Checks if a snapshot should be retained or purged based on the policy.
   */
  shouldRetain(
    snapshot: AnalyticsSnapshot,
    currentDate: Date = new Date(),
  ): boolean {
    const cutoffDate = this.getRetentionDate(snapshot.period, currentDate);
    if (!cutoffDate) {
      return true; // Retain forever
    }

    const snapshotDate = new Date(snapshot.timestamp);
    return snapshotDate >= cutoffDate;
  }

  /**
   * Enforces immutability check.
   */
  assertImmutable(snapshot: AnalyticsSnapshot): void {
    if (snapshot._immutable !== true) {
      throw new Error("Analytics snapshots must be immutable.");
    }
  }
}

export const snapshotRetentionService = new SnapshotRetentionService();
