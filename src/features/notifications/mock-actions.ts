/**
 * Demo adapter for notifications.
 *
 * CRIT-2: these functions took `(userId, organizationId)` from the caller to
 * mirror the real adapter's signature. That signature is gone, so the demo
 * identity is now read from the demo store's own constants — which are the
 * same two ids `DEMO_ADMIN_USER` carries in
 * `src/features/auth/current-user.ts`, so the real and demo paths agree on who
 * the caller is rather than one of them being told.
 */
import {
  getDemoStore,
  logDemoActivity,
  nextDemoId,
  DEMO_ORG_ID,
  DEMO_USER_ID,
} from "@/lib/demo/store";
import type {
  getNotificationsAction as real_getNotificationsAction,
  markNotificationReadAction as real_markNotificationReadAction,
  updateNotificationPreferencesAction as real_updateNotificationPreferencesAction,
  getNotificationFeedAction as real_getNotificationFeedAction,
  markNotificationUnreadAction as real_markNotificationUnreadAction,
  markAllNotificationsReadAction as real_markAllNotificationsReadAction,
} from "./real-actions";
import { composeNotification, type NotificationTemplate } from "./templates";
import { revalidatePath } from "next/cache";

/**
 * Sprint 12B — same composition as the real adapter, over the DemoStore's
 * `domainEvents` and `notificationTemplates` collections.
 */
export async function getNotificationFeedAction(): Promise<
  Awaited<ReturnType<typeof real_getNotificationFeedAction>>
> {
  const store = getDemoStore();

  const rows = store.notifications.filter(
    (n: any) => n.userId === DEMO_USER_ID && n.organizationId === DEMO_ORG_ID,
  );

  const eventById = new Map(
    (store.domainEvents ?? []).map((event: any) => [event.eventId, event]),
  );
  const templateByEventType = new Map(
    (store.notificationTemplates ?? [])
      .filter(
        (template: any) =>
          template.organizationId === DEMO_ORG_ID &&
          template.channel === "in_app",
      )
      .map((template: any) => [
        template.eventType,
        template as NotificationTemplate,
      ]),
  );

  return rows
    .map((row: any) => {
      const event = (eventById.get(row.eventId) as any) ?? null;
      const template = event
        ? ((templateByEventType.get(event.eventType) as NotificationTemplate) ??
          null)
        : null;
      return composeNotification(row, event, template);
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export async function markNotificationUnreadAction(
  notificationId: string,
): Promise<Awaited<ReturnType<typeof real_markNotificationUnreadAction>>> {
  const store = getDemoStore();
  const notification = store.notifications.find(
    (n: any) =>
      n.notificationId === notificationId &&
      n.userId === DEMO_USER_ID &&
      n.organizationId === DEMO_ORG_ID,
  );

  if (notification) {
    notification.status = "delivered";
    notification.readAt = null;
    logDemoActivity(
      store,
      "notifications",
      "update",
      "notification",
      notificationId,
      "Marked notification as unread",
    );
  }

  revalidatePath("/");
}

export async function markAllNotificationsReadAction(): Promise<
  Awaited<ReturnType<typeof real_markAllNotificationsReadAction>>
> {
  const store = getDemoStore();
  let cleared = 0;

  for (const notification of store.notifications) {
    if (
      notification.userId === DEMO_USER_ID &&
      notification.organizationId === DEMO_ORG_ID &&
      !notification.readAt
    ) {
      notification.status = "read";
      notification.readAt = new Date();
      cleared++;
    }
  }

  if (cleared > 0) {
    logDemoActivity(
      store,
      "notifications",
      "update",
      "notification",
      DEMO_USER_ID,
      `Marked ${cleared} notifications as read`,
    );
  }

  revalidatePath("/");
}

export async function getNotificationsAction(): Promise<
  Awaited<ReturnType<typeof real_getNotificationsAction>>
> {
  const store = getDemoStore();
  const orgNotifications = store.notifications.filter(
    (n) => n.userId === DEMO_USER_ID && n.organizationId === DEMO_ORG_ID,
  );

  return orgNotifications.sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export async function markNotificationReadAction(
  notificationId: string,
): Promise<Awaited<ReturnType<typeof real_markNotificationReadAction>>> {
  const store = getDemoStore();
  const notification = store.notifications.find(
    (n) =>
      n.notificationId === notificationId &&
      n.userId === DEMO_USER_ID &&
      n.organizationId === DEMO_ORG_ID,
  );

  if (notification) {
    notification.status = "read";
    notification.readAt = new Date();

    logDemoActivity(
      store,
      "notifications",
      "update",
      "notification",
      notificationId,
      "Marked notification as read",
    );
  }

  revalidatePath("/");
}

export async function updateNotificationPreferencesAction(
  input: any,
): Promise<
  Awaited<ReturnType<typeof real_updateNotificationPreferencesAction>>
> {
  const store = getDemoStore();
  const existing = store.notificationPreferences.find(
    (p) => p.userId === DEMO_USER_ID && p.organizationId === DEMO_ORG_ID,
  );

  if (existing) {
    Object.assign(existing, {
      ...input,
      updatedAt: new Date(),
    });

    logDemoActivity(
      store,
      "notifications",
      "update",
      "notification_preference",
      existing.preferenceId,
      "Updated notification preferences",
    );
  } else {
    const newId = nextDemoId(store);
    store.notificationPreferences.push({
      preferenceId: newId,
      organizationId: DEMO_ORG_ID,
      userId: DEMO_USER_ID,
      level: input.level || "org_default",
      eventTypePreferences: input.eventTypePreferences || {},
      quietHoursStart: input.quietHoursStart || null,
      quietHoursEnd: input.quietHoursEnd || null,
      timezone: input.timezone || "UTC",
      digestFrequency: input.digestFrequency || "instant",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logDemoActivity(
      store,
      "notifications",
      "create",
      "notification_preference",
      newId,
      "Created notification preferences",
    );
  }

  revalidatePath("/");
}
