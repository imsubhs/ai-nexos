"use server";

import { db } from "@/db";
import { notifications, notificationPreferences } from "@/db/schema/notifications";
import { eq, and } from "drizzle-orm";
import {
  UpdateNotificationPreferencesInput,
  updateNotificationPreferencesSchema,
} from "./schemas";
import { getNotificationPreferencesQuery, getNotificationsQuery } from "./queries";
import { revalidatePath } from "next/cache";

export const getNotificationsAction = async (userId: string, organizationId: string) => {
  return await getNotificationsQuery(userId, organizationId);
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
