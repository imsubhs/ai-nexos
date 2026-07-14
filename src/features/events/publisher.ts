import { DomainEvent, IEventPublisher, IEventSubscriber } from "./types";

/**
 * LocalEventPublisher is the default in-memory publisher abstraction.
 * In a future phase, this can be swapped out for a Redis, SQS, or Kafka publisher.
 */
export class LocalEventPublisher implements IEventPublisher {
  private subscribers: Map<string, IEventSubscriber[]> = new Map();

  subscribe(eventType: string, subscriber: IEventSubscriber) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(subscriber);
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.subscribers.get(event.eventType) || [];
    // Do not block the emitter, process asynchronously
    Promise.allSettled(handlers.map((h) => h.onEvent(event))).catch((err) => {
      console.error(`Error in event subscriber for ${event.eventType}`, err);
    });
  }
}
