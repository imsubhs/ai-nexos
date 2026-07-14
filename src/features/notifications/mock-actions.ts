/* eslint-disable @typescript-eslint/no-explicit-any */
import type { getNotificationsAction as real_getNotificationsAction, markNotificationReadAction as real_markNotificationReadAction, updateNotificationPreferencesAction as real_updateNotificationPreferencesAction } from "./real-actions";

export async function getNotificationsAction(...args: Parameters<typeof real_getNotificationsAction>): Promise<Awaited<ReturnType<typeof real_getNotificationsAction>>> {
  return [] as any;
}

export async function markNotificationReadAction(...args: Parameters<typeof real_markNotificationReadAction>): Promise<Awaited<ReturnType<typeof real_markNotificationReadAction>>> {
  return { id: "mock-id", data: [] } as any;
}

export async function updateNotificationPreferencesAction(...args: Parameters<typeof real_updateNotificationPreferencesAction>): Promise<Awaited<ReturnType<typeof real_updateNotificationPreferencesAction>>> {
  return { id: "mock-id", success: true } as any;
}
