/**
 * Correction notification consumer (merge doc 14 §11.3). Architecturally the
 * M12 notification templates consume the L3 correction events; that pipeline
 * lands in Phase 5. To keep demo parity behavioral (a reviewer actually sees a
 * pending-review notification; a requester sees the decision), this consumer
 * writes to the shared `notifications` DemoStore collection in demo mode and
 * is a no-op on the real path (where M12 templates own delivery).
 *
 * This reuses the existing notifications collection — it does not build a new
 * notification service or call the notifications action API from a workforce
 * action (doc 15 §0: actions never call notification APIs directly).
 */
import { getDemoStore, nextDemoId } from "@/lib/demo/store";
import type { CorrectionDetail } from "./types";
import { isDemoMode } from "@/lib/env.server";

function pushNotification(
  organizationId: string,
  userId: string,
  title: string,
  message: string,
): void {
  const store = getDemoStore();
  store.notifications.push({
    notificationId: nextDemoId(store),
    organizationId,
    userId,
    title,
    message,
    category: "CORRECTIONS",
    isRead: false,
    createdAt: new Date(),
  });
}

export function notifyCorrectionSubmitted(
  organizationId: string,
  correction: CorrectionDetail,
  reviewerUserIds: string[],
): void {
  if (!isDemoMode()) return;
  for (const reviewerId of reviewerUserIds) {
    if (reviewerId === correction.userId) continue; // never self-review
    pushNotification(
      organizationId,
      reviewerId,
      "Correction awaiting review",
      `${correction.employeeName} requested a correction (${correction.correctionCode}) for ${correction.date}.`,
    );
  }
}

export function notifyCorrectionDecision(
  organizationId: string,
  correction: CorrectionDetail,
): void {
  if (!isDemoMode()) return;
  const decided = correction.status === "APPROVED" ? "approved" : "rejected";
  pushNotification(
    organizationId,
    correction.userId,
    `Correction ${decided}`,
    `Your correction ${correction.correctionCode} for ${correction.date} was ${decided}.`,
  );
}
