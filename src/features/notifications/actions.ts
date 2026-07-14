"use server";

import * as real from "./real-actions";
import * as mock from "./mock-actions";

export async function getNotificationsAction(...args: Parameters<typeof real.getNotificationsAction>): Promise<Awaited<ReturnType<typeof real.getNotificationsAction>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).getNotificationsAction(...args);
  return (real as any).getNotificationsAction(...args);
}

export async function markNotificationReadAction(...args: Parameters<typeof real.markNotificationReadAction>): Promise<Awaited<ReturnType<typeof real.markNotificationReadAction>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).markNotificationReadAction(...args);
  return (real as any).markNotificationReadAction(...args);
}

export async function updateNotificationPreferencesAction(...args: Parameters<typeof real.updateNotificationPreferencesAction>): Promise<Awaited<ReturnType<typeof real.updateNotificationPreferencesAction>>> {
  if (process.env.DEMO_MODE === "true") return (mock as any).updateNotificationPreferencesAction(...args);
  return (real as any).updateNotificationPreferencesAction(...args);
}

