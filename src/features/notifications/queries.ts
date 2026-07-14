"use server";

import * as real from "./real-queries";
import * as mock from "./mock-queries";

export async function getNotificationsQuery(...args: Parameters<typeof real.getNotificationsQuery>): Promise<Awaited<ReturnType<typeof real.getNotificationsQuery>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).getNotificationsQuery(...args);
  return (real as any).getNotificationsQuery(...args);
}

export async function getNotificationPreferencesQuery(...args: Parameters<typeof real.getNotificationPreferencesQuery>): Promise<Awaited<ReturnType<typeof real.getNotificationPreferencesQuery>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).getNotificationPreferencesQuery(...args);
  return (real as any).getNotificationPreferencesQuery(...args);
}

