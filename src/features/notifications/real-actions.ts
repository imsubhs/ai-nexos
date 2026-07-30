"use server";

import { db } from "@/db";
import {
  notifications,
  notificationPreferences,
  notificationTemplates,
} from "@/db/schema/notifications";
import { events } from "@/db/schema/events";
import { eq, and, inArray } from "drizzle-orm";
import {
  UpdateNotificationPreferencesInput,
  updateNotificationPreferencesSchema,
} from "./schemas";
import { getNotificationPreferencesQuery, getNotificationsQuery } from "./queries";
import { composeNotification, type NotificationFeedItem } from "./templates";
import { revalidatePath } from "next/cache";

export const getNotificationsAction = async (userId: string, organizationId: string) => {
  return await getNotificationsQuery(userId, organizationId);
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
export const getNotificationFeedAction = async (
  userId: string,
  organizationId: string,
): Promise<NotificationFeedItem[]> => {
  const rows = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.organizationId, organizationId)
      )
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
        rows.map((row) => row.eventId)
      )
    );
  const eventById = new Map(eventRows.map((event) => [event.eventId, event]));

  const templateRows = await db
    .select()
    .from(notificationTemplates)
    .where(
      and(
        eq(notificationTemplates.organizationId, organizationId),
        eq(notificationTemplates.channel, "in_app")
      )
    );
  const templateByEventType = new Map(
    templateRows.map((template) => [template.eventType as string, template])
  );

  return rows
    .map((row) => {
      const event = eventById.get(row.eventId) ?? null;
      const template = event ? (templateByEventType.get(event.eventType) ?? null) : null;
      return composeNotification(row, event, template);
    })
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
};

export const markNotificationReadAction = async (
  notificationId: string,
  userId: string,
  organizationId: string
) => {
  await db
    .update(notifications)
    .set({
      status: "read",
      readAt: new Date(),
    })
    .where(
      and(
        eq(notifications.notificationId, notificationId),
        eq(notifications.userId, userId),
        eq(notifications.organizationId, organizationId)
      )
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
export const markNotificationUnreadAction = async (
  notificationId: string,
  userId: string,
  organizationId: string
) => {
  await db
    .update(notifications)
    .set({
      status: "delivered",
      readAt: null,
    })
    .where(
      and(
        eq(notifications.notificationId, notificationId),
        eq(notifications.userId, userId),
        eq(notifications.organizationId, organizationId)
      )
    );

  revalidatePath("/");
};

/** Sprint 12B — bulk clear, so a full bell is not a per-row chore. */
export const markAllNotificationsReadAction = async (
  userId: string,
  organizationId: string
) => {
  await db
    .update(notifications)
    .set({ status: "read", readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.organizationId, organizationId),
        inArray(notifications.status, ["queued", "processing", "delivered"])
      )
    );

  revalidatePath("/");
};

export const updateNotificationPreferencesAction = async (
  userId: string,
  organizationId: string,
  input: UpdateNotificationPreferencesInput
) => {
  const validated = updateNotificationPreferencesSchema.parse(input);

  const existingPrefs = await getNotificationPreferencesQuery(userId, organizationId);
  
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
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.organizationId, organizationId)
        )
      );
  } else {
    await db.insert(notificationPreferences).values({
      organizationId,
      userId,
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
