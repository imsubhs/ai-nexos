/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  getNotificationsQuery as real_getNotificationsQuery,
  getNotificationPreferencesQuery as real_getNotificationPreferencesQuery,
} from "./real-queries";

export async function getNotificationsQuery(
  ...args: Parameters<typeof real_getNotificationsQuery>
): Promise<Awaited<ReturnType<typeof real_getNotificationsQuery>>> {
  return [] as any;
}

export async function getNotificationPreferencesQuery(
  ...args: Parameters<typeof real_getNotificationPreferencesQuery>
): Promise<Awaited<ReturnType<typeof real_getNotificationPreferencesQuery>>> {
  return [] as any;
}
