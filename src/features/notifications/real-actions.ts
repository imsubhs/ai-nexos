"use server";

/**
 * Notification writes.
 *
 * CRIT-2. Every export in this file previously took `(userId, organizationId)`
 * — or `(notificationId, userId, organizationId)` — from the caller and used
 * them as the WHERE clause. The organisation predicate looked like tenant
 * scoping but was supplied by the requester, so it constrained nothing. The
 * file is `"use server"`, and `NotificationBell` (a client component in the app
 * header, rendered on every authenticated page) imports these, so the action
 * ids were registered and reachable: any signed-in user could read, mark and
 * rewrite the notification state of any user in any organisation.
 *
 * The fix is architectural rather than a validation: identity is derived from
 * the session and the parameters are removed, so the malicious request is no
 * longer expressible. Comparing a caller-supplied `organizationId` against the
 * session's would have left `userId` manipulable within a tenant, which is
 * still a cross-user read.
 *
 * `revalidatePath("/")` is retained — the bell lives in the shell.
 */

import { db } from "@/db";
import {
  notifications,
  notificationPreferences,
  notificationTemplates,
} from "@/db/schema/notifications";
import { events } from "@/db/schema/events";
import { eq, and, inArray } from "drizzle-orm";
import { requireCurrentUser } from "@/features/auth/current-user";
import {
  UpdateNotificationPreferencesInput,
  updateNotificationPreferencesSchema,
} from "./schemas";
import {
  getNotificationPreferencesQuery,
  getNotificationsQuery,
} from "./real-queries";
import { composeNotification, type NotificationFeedItem } from "./templates";
import { revalidatePath } from "next/cache";

export const getNotificationsAction = async () => {
  return await getNotificationsQuery();
};

/**
 * Sprint 12B — the renderable notification feed (technical-debt item 11).
 *
 * `getNotificationsAction` returns the raw rows and stays as it is: other
 * callers depend on that shape. This is the read that performs the join the
 * bell needs — notification → event → in-app template — so a notification can
 * finally say what happened instead of "normal priority · delivered".
 *
 * The joins are two batched lookups rather than a three-table SQL join because
 * the event store lives in its own `events` schema and templates are keyed by
 * (eventType, channel) with no FK from notifications; composing in code keeps
 * the read honest about that and lets a missing template degrade gracefully.
 */
export const getNotificationFeedAction = async (): Promise<
  NotificationFeedItem[]
> => {
  const user = await requireCurrentUser();

  const rows = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, user.userId),
        eq(notifications.organizationId, user.organizationId),
      ),
    );

  if (rows.length === 0) return [];

  const eventRows = await db
    .select({
      eventId: events.eventId,
      eventType: events.eventType,
      aggregateType: events.aggregateType,
      payload: events.payload,
    })
    .from(events)
    .where(
      inArray(
        events.eventId,
        rows.map((row) => row.eventId),
      ),
    );
  const eventById = new Map(eventRows.map((event) => [event.eventId, event]));

  const templateRows = await db
    .select()
    .from(notificationTemplates)
    .where(
      and(
        eq(notificationTemplates.organizationId, user.organizationId),
        eq(notificationTemplates.channel, "in_app"),
      ),
    );
  const templateByEventType = new Map(
    templateRows.map((template) => [template.eventType as string, template]),
  );

  return rows
    .map((row) => {
      const event = eventById.get(row.eventId) ?? null;
      const template = event
        ? (templateByEventType.get(event.eventType) ?? null)
        : null;
      return composeNotification(row, event, template);
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
};

export const markNotificationReadAction = async (notificationId: string) => {
  const user = await requireCurrentUser();

  await db
    .update(notifications)
    .set({
      status: "read",
      readAt: new Date(),
    })
    .where(
      and(
        eq(notifications.notificationId, notificationId),
        eq(notifications.userId, user.userId),
        eq(notifications.organizationId, user.organizationId),
      ),
    );

  revalidatePath("/");
};

/**
 * Sprint 12B — the inverse of mark-as-read.
 *
 * `readAt` clears and the status returns to `delivered`, which is the state a
 * notification is in before anyone opens it. `queued` would be a lie: it has
 * already been delivered.
 */
export const markNotificationUnreadAction = async (notificationId: string) => {
  const user = await requireCurrentUser();

  await db
    .update(notifications)
    .set({
      status: "delivered",
      readAt: null,
    })
    .where(
      and(
        eq(notifications.notificationId, notificationId),
        eq(notifications.userId, user.userId),
        eq(notifications.organizationId, user.organizationId),
      ),
    );

  revalidatePath("/");
};

/** Sprint 12B — bulk clear, so a full bell is not a per-row chore. */
export const markAllNotificationsReadAction = async () => {
  const user = await requireCurrentUser();

  await db
    .update(notifications)
    .set({ status: "read", readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, user.userId),
        eq(notifications.organizationId, user.organizationId),
        inArray(notifications.status, ["queued", "processing", "delivered"]),
      ),
    );

  revalidatePath("/");
};

export const updateNotificationPreferencesAction = async (
  input: UpdateNotificationPreferencesInput,
) => {
  const user = await requireCurrentUser();
  const validated = updateNotificationPreferencesSchema.parse(input);

  const existingPrefs = await getNotificationPreferencesQuery();

  if (existingPrefs.length > 0) {
    await db
      .update(notificationPreferences)
      .set({
        level: validated.level,
        eventTypePreferences: validated.eventTypePreferences,
        quietHoursStart: validated.quietHoursStart,
        quietHoursEnd: validated.quietHoursEnd,
        timezone: validated.timezone,
        digestFrequency: validated.digestFrequency,
      })
      .where(
        and(
          eq(notificationPreferences.userId, user.userId),
          eq(notificationPreferences.organizationId, user.organizationId),
        ),
      );
  } else {
    await db.insert(notificationPreferences).values({
      organizationId: user.organizationId,
      userId: user.userId,
      level: validated.level,
      eventTypePreferences: validated.eventTypePreferences,
      quietHoursStart: validated.quietHoursStart,
      quietHoursEnd: validated.quietHoursEnd,
      timezone: validated.timezone,
      digestFrequency: validated.digestFrequency,
    });
  }

  revalidatePath("/");
};
