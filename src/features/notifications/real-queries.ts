import { db } from "@/db";
import { notifications, notificationPreferences } from "@/db/schema/notifications";
import { eq, and } from "drizzle-orm";

export const getNotificationsQuery = async (userId: string, organizationId: string) => {
  return db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.organizationId, organizationId)
      )
    )
    .orderBy(notifications.createdAt);
};

export const getNotificationPreferencesQuery = async (userId: string, organizationId: string) => {
  return db
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.organizationId, organizationId)
      )
    )
    .limit(1);
};
