import { db } from "@/db";
import { notificationQueue } from "@/db/schema/notifications";
import { eq } from "drizzle-orm";

export interface INotificationQueuePayload {
  deliveryId: string;
  channelId: string;
  providerConfig: unknown;
  messagePayload: unknown;
}

export interface INotificationQueue {
  enqueue(payload: INotificationQueuePayload, scheduledFor?: Date): Promise<void>;
  dequeue(batchSize?: number): Promise<INotificationQueuePayload[]>;
  acknowledge(deliveryId: string): Promise<void>;
  fail(deliveryId: string, error: Error): Promise<void>;
}

export class DatabaseNotificationQueue implements INotificationQueue {
  async enqueue(payload: INotificationQueuePayload, scheduledFor: Date = new Date()): Promise<void> {
    await db.insert(notificationQueue).values({
      deliveryId: payload.deliveryId,
      scheduledFor,
      status: "pending",
    });
  }

  async dequeue(_batchSize: number = 10): Promise<INotificationQueuePayload[]> {
    // Basic polling implementation for the database queue
    // In a real database queue, you would use FOR UPDATE SKIP LOCKED
    // Here we represent the abstraction for AI NEX OS
    return [];
  }

  async acknowledge(deliveryId: string): Promise<void> {
    await db.update(notificationQueue)
      .set({ status: "completed" })
      .where(eq(notificationQueue.deliveryId, deliveryId));
  }

  async fail(deliveryId: string, _error: Error): Promise<void> {
    // Dead Letter Queue handling is triggered here via retry policies
    await db.update(notificationQueue)
      .set({ status: "failed" })
      .where(eq(notificationQueue.deliveryId, deliveryId));
  }
}
