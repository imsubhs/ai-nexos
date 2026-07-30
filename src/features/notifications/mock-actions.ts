import {
  getDemoStore,
  logDemoActivity,
  nextDemoId,
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
export async function getNotificationFeedAction(
  userId: string,
  organizationId: string,
): Promise<Awaited<ReturnType<typeof real_getNotificationFeedAction>>> {
  const store = getDemoStore();

  const rows = store.notifications.filter(
    (n: any) => n.userId === userId && n.organizationId === organizationId,
  );

  const eventById = new Map(
    (store.domainEvents ?? []).map((event: any) => [event.eventId, event]),
  );
  const templateByEventType = new Map(
    (store.notificationTemplates ?? [])
      .filter(
        (template: any) =>
          template.organizationId === organizationId &&
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
  userId: string,
  organizationId: string,
): Promise<Awaited<ReturnType<typeof real_markNotificationUnreadAction>>> {
  const store = getDemoStore();
  const notification = store.notifications.find(
    (n: any) =>
      n.notificationId === notificationId &&
      n.userId === userId &&
      n.organizationId === organizationId,
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

export async function markAllNotificationsReadAction(
  userId: string,
  organizationId: string,
): Promise<Awaited<ReturnType<typeof real_markAllNotificationsReadAction>>> {
  const store = getDemoStore();
  let cleared = 0;

  for (const notification of store.notifications) {
    if (
      notification.userId === userId &&
      notification.organizationId === organizationId &&
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
      userId,
      `Marked ${cleared} notifications as read`,
    );
  }

  revalidatePath("/");
}

export async function getNotificationsAction(
  userId: string,
  organizationId: string,
): Promise<Awaited<ReturnType<typeof real_getNotificationsAction>>> {
  const store = getDemoStore();
  const orgNotifications = store.notifications.filter(
    (n) => n.userId === userId && n.organizationId === organizationId,
  );

  return orgNotifications.sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export async function markNotificationReadAction(
  notificationId: string,
  userId: string,
  organizationId: string,
): Promise<Awaited<ReturnType<typeof real_markNotificationReadAction>>> {
  const store = getDemoStore();
  const notification = store.notifications.find(
    (n) =>
      n.notificationId === notificationId &&
      n.userId === userId &&
      n.organizationId === organizationId,
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
  userId: string,
  organizationId: string,
  input: any,
): Promise<
  Awaited<ReturnType<typeof real_updateNotificationPreferencesAction>>
> {
  const store = getDemoStore();
  const existing = store.notificationPreferences.find(
    (p) => p.userId === userId && p.organizationId === organizationId,
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
      organizationId,
      userId,
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
