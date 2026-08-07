/* eslint-disable @typescript-eslint/no-explicit-any */
import { isDemoMode } from "@/lib/env.server";
export interface QueueMessage {
  id: string;
  runId: string;
  actionId?: string;
  payload: any;
  retryCount: number;
}

/**
 * Abstract Queue Provider interface.
 * Ensures the automation engine is not tightly coupled to Redis, RabbitMQ, or Kafka.
 */
export interface QueueProvider {
  /**
   * Enqueues a message for execution.
   */
  enqueue(
    queueName: string,
    message: QueueMessage,
    delayMs?: number,
  ): Promise<void>;

  /**
   * Dequeues a message. Returns null if empty.
   */
  dequeue(queueName: string): Promise<QueueMessage | null>;

  /**
   * Acknowledges successful processing of a message.
   */
  ack(queueName: string, messageId: string): Promise<void>;

  /**
   * Rejects a message, optionally requeuing it.
   */
  nack(queueName: string, messageId: string, requeue: boolean): Promise<void>;
}

/**
 * In-memory fallback queue provider (mainly for local dev/testing).
 */
export class InMemoryQueueProvider implements QueueProvider {
  private queues: Map<string, QueueMessage[]> = new Map();

  constructor() {
    if (process.env.NODE_ENV === "production" && !isDemoMode()) {
      throw new Error(
        "InMemoryQueueProvider is unsafe and not allowed in production environments. Please configure a Redis or Kafka provider.",
      );
    }
  }

  async enqueue(
    queueName: string,
    message: QueueMessage,
    delayMs?: number,
  ): Promise<void> {
    // delayMs is ignored in this simple mock
    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, []);
    }
    this.queues.get(queueName)!.push(message);
  }

  async dequeue(queueName: string): Promise<QueueMessage | null> {
    const queue = this.queues.get(queueName);
    if (!queue || queue.length === 0) return null;
    return queue.shift() || null;
  }

  async ack(queueName: string, messageId: string): Promise<void> {
    // Mock ack
  }

  async nack(
    queueName: string,
    messageId: string,
    requeue: boolean,
  ): Promise<void> {
    // Mock nack
  }
}
