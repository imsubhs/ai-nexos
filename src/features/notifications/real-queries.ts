/**
 * Notification reads.
 *
 * CRIT-2 was here and in `real-actions.ts`. Every function in this module used
 * to take `(userId, organizationId)` and filter on them — which reads as
 * tenant-scoped and is not, because both values arrived from the caller. These
 * are re-exported through `queries.ts`, which carries `"use server"`, so they
 * were registered Server Actions: a POST naming any user id in any
 * organisation returned that user's notifications.
 *
 * Identity is now derived from the session inside each function and the
 * parameters are gone, so there is no longer a way to express the request that
 * was the vulnerability. `getCurrentUser()` is memoised per request via React
 * `cache()`, so an action that also resolves the user does not pay twice.
 *
 * A notification is a self-scoped resource: it is authorised by ownership
 * (`userId` = the session's user), not by an RBAC module permission. That is
 * deliberate and is why there is no `requirePermission()` call here —
 * `team_member`, `finance` and `hr` hold no `notifications` permission at all,
 * and gating a user's own bell on one would deny most of the organisation
 * access to their own inbox. Ownership is the control; see
 * docs/AUTHORIZATION-CONTROLS.md.
 */

import { db } from "@/db";
import {
  notifications,
  notificationPreferences,
} from "@/db/schema/notifications";
import { eq, and } from "drizzle-orm";
import { requireCurrentUser } from "@/features/auth/current-user";

export const getNotificationsQuery = async () => {
  const user = await requireCurrentUser();

  return db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, user.userId),
        eq(notifications.organizationId, user.organizationId),
      ),
    )
    .orderBy(notifications.createdAt);
};

export const getNotificationPreferencesQuery = async () => {
  const user = await requireCurrentUser();

  return db
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, user.userId),
        eq(notificationPreferences.organizationId, user.organizationId),
      ),
    )
    .limit(1);
};
