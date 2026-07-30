"use server";

import * as real from "./real-actions";
import * as mock from "./mock-actions";

export async function getNotificationsAction(
  ...args: Parameters<typeof real.getNotificationsAction>
): Promise<Awaited<ReturnType<typeof real.getNotificationsAction>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).getNotificationsAction(...args);
  return (real as any).getNotificationsAction(...args);
}

export async function getNotificationFeedAction(
  ...args: Parameters<typeof real.getNotificationFeedAction>
): Promise<Awaited<ReturnType<typeof real.getNotificationFeedAction>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).getNotificationFeedAction(...args);
  return (real as any).getNotificationFeedAction(...args);
}

export async function markNotificationUnreadAction(
  ...args: Parameters<typeof real.markNotificationUnreadAction>
): Promise<Awaited<ReturnType<typeof real.markNotificationUnreadAction>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).markNotificationUnreadAction(...args);
  return (real as any).markNotificationUnreadAction(...args);
}

export async function markAllNotificationsReadAction(
  ...args: Parameters<typeof real.markAllNotificationsReadAction>
): Promise<Awaited<ReturnType<typeof real.markAllNotificationsReadAction>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).markAllNotificationsReadAction(...args);
  return (real as any).markAllNotificationsReadAction(...args);
}

export async function markNotificationReadAction(
  ...args: Parameters<typeof real.markNotificationReadAction>
): Promise<Awaited<ReturnType<typeof real.markNotificationReadAction>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).markNotificationReadAction(...args);
  return (real as any).markNotificationReadAction(...args);
}

export async function updateNotificationPreferencesAction(
  ...args: Parameters<typeof real.updateNotificationPreferencesAction>
): Promise<
  Awaited<ReturnType<typeof real.updateNotificationPreferencesAction>>
> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).updateNotificationPreferencesAction(...args);
  return (real as any).updateNotificationPreferencesAction(...args);
}
