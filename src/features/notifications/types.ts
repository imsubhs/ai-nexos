import {
  notificationChannelEnum,
  notificationDigestFrequencyEnum,
  notificationPriorityEnum,
  notificationStatusEnum,
} from "@/db/schema/enums";

export type NotificationStatus = typeof notificationStatusEnum.enumValues[number];
export type NotificationPriority = typeof notificationPriorityEnum.enumValues[number];
export type NotificationChannel = typeof notificationChannelEnum.enumValues[number];
export type NotificationDigestFrequency = typeof notificationDigestFrequencyEnum.enumValues[number];

export interface INotification {
  id: string;
  eventId: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  readAt: Date | null;
  createdAt: Date;
}

export interface INotificationPreferences {
  level: "organization" | "project" | "user";
  eventTypePreferences: Record<string, NotificationChannel[]>;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone: string;
  digestFrequency: NotificationDigestFrequency;
}
