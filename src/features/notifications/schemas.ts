import { z } from "zod";

export const updateNotificationPreferencesSchema = z.object({
  level: z.enum(["organization", "project", "user"]),
  eventTypePreferences: z.record(z.string(), z.array(z.string())),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
  timezone: z.string(),
  digestFrequency: z.enum(["instant", "hourly", "daily", "weekly"]),
});

export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>;
