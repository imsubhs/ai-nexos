import { db } from "@/db";
import { events } from "@/db/schema/events";
import { DomainEvent, IEventPublisher, IEventSubscriber } from "./types";

/**
 * EventEngine handles persistence of events and delegates
 * the actual publishing (triggering subscribers) to a reserved
 * publisher abstraction.
 */
export class EventEngine {
  private publisher: IEventPublisher;
  private subscribers: Map<string, IEventSubscriber[]> = new Map();

  constructor(publisher: IEventPublisher) {
    this.publisher = publisher;
  }

  /**
   * Emits a domain event.
   * 1. Persists to the Event Store (PostgreSQL).
   * 2. Publishes via the Publisher abstraction.
   */
  async emit(event: Omit<DomainEvent, "eventId" | "createdAt">): Promise<void> {
    const insertedEvents = await db.insert(events).values({
      organizationId: event.organizationId,
      eventType: event.eventType,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      payload: event.payload,
      actorId: event.actorId,
      eventVersion: event.metadata.eventVersion,
      correlationId: event.metadata.correlationId,
      causationId: event.metadata.causationId,
      aiMetadata: event.metadata.aiMetadata,
    }).returning();

    const persistedEvent = insertedEvents[0];
    
    // Construct full DomainEvent with db defaults
    const fullEvent: DomainEvent = {
      ...event,
      eventId: persistedEvent.eventId,
      createdAt: persistedEvent.createdAt,
    };

    // Publish to subscribers via abstraction
    await this.publisher.publish(fullEvent);
  }
}
