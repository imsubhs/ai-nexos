export type EventType =
  | "project"
  | "task"
  | "timeline"
  | "meeting"
  | "decision"
  | "action_item"
  | "deliverable"
  | "revision"
  | "approval"
  | "comment"
  | "mention"
  | "client"
  | "system"
  // Workforce bounded context (merge doc 14 §11.1; Sprint 3A / WP-109).
  | "attendance"
  // Corrections aggregate (merge doc 14 §11.1; Sprint 3B / WP-120).
  | "correction";

export interface IEventPayload {
  [key: string]: unknown;
}

export interface IEventMetadata {
  eventVersion: number;
  correlationId?: string;
  causationId?: string;
  aiMetadata?: Record<string, unknown>; // Reserved
}

export interface DomainEvent<T extends IEventPayload = Record<string, unknown>> {
  eventId: string;
  organizationId: string;
  eventType: EventType;
  aggregateType: string;
  aggregateId: string;
  payload: T;
  actorId?: string;
  metadata: IEventMetadata;
  createdAt: Date;
}

export interface IEventPublisher {
  publish(event: DomainEvent): Promise<void>;
}

export interface IEventSubscriber {
  onEvent(event: DomainEvent): Promise<void>;
}
