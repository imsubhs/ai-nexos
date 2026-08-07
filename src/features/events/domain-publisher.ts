/**
 * Platform L3 domain-event publisher (merge doc 15 §0 side-effect order:
 * validate → write → logActivity → **publish L3** → revalidate).
 *
 * One publish surface for every slice — the real path persists through the
 * existing `EventEngine` + `LocalEventPublisher` (no new bus, no duplicated
 * service); the demo path mirrors the event into the DemoStore `domainEvents`
 * log so notification/search consumers (M12 templates, Phase 5 indexer) can
 * read it. Actions never call notification/search APIs directly — those are
 * consumers of the events emitted here (doc 14 §11.3 / §11.5).
 */
import { getDemoStore, nextDemoId } from "@/lib/demo/store";
import { EventEngine } from "./engine";
import { LocalEventPublisher } from "./publisher";
import type { EventType, IEventPayload } from "./types";
import { isDemoMode } from "@/lib/env.server";

export interface PublishDomainEventInput {
  organizationId: string;
  eventType: EventType;
  /** Domain event name, e.g. "workforce.attendance.clocked_in" (doc 14 §11.1). */
  eventName: string;
  aggregateType: string;
  aggregateId: string;
  actorId?: string;
  payload: IEventPayload;
  /** Correlation id = aggregate id (attendanceId), doc 14 §11.1. */
  correlationId?: string;
}

/**
 * The normalized event a {@link DomainEventHandler} receives. Flattens the
 * dotted `eventName` to the top level (in the raw store it lives inside the
 * payload) so handlers can filter on `eventName` without reaching in.
 */
export interface PublishedDomainEvent {
  organizationId: string;
  eventType: EventType;
  eventName: string;
  aggregateType: string;
  aggregateId: string;
  actorId: string | null;
  payload: IEventPayload;
  correlationId: string;
}

/** An in-process consumer of published L3 events (Sprint 4B). */
export type DomainEventHandler = (
  event: PublishedDomainEvent,
) => void | Promise<void>;

/**
 * In-process handler registry (Sprint 4B). The Sprint 3 publisher persisted
 * events but never dispatched them — `LocalEventPublisher.subscribe` had zero
 * registrations, so read models could only be built by re-querying. This
 * registry lets slices register read-model / projection handlers that fire on
 * EVERY publish, in demo AND real mode (demo bypasses the db publisher, so
 * dispatch must live at this surface to run at all). Handlers are best-effort:
 * a throwing handler is logged and never breaks the emitter (same posture as
 * `LocalEventPublisher.publish`).
 */
const handlers = new Set<DomainEventHandler>();

export function registerDomainEventHandler(handler: DomainEventHandler): void {
  handlers.add(handler);
}

async function dispatchToHandlers(event: PublishedDomainEvent): Promise<void> {
  await Promise.allSettled(
    [...handlers].map(async (h) => {
      try {
        await h(event);
      } catch (err) {
        console.error(
          `Domain event handler failed for ${event.eventName}`,
          err,
        );
      }
    }),
  );
}

// Real-path singleton; instantiated lazily so demo mode never touches the db.
let engine: EventEngine | null = null;
function getEngine(): EventEngine {
  if (!engine) engine = new EventEngine(new LocalEventPublisher());
  return engine;
}

export async function publishDomainEvent(
  input: PublishDomainEventInput,
): Promise<void> {
  const payload: IEventPayload = {
    ...input.payload,
    eventName: input.eventName,
  };
  const normalized: PublishedDomainEvent = {
    organizationId: input.organizationId,
    eventType: input.eventType,
    eventName: input.eventName,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    actorId: input.actorId ?? null,
    payload,
    correlationId: input.correlationId ?? input.aggregateId,
  };

  if (isDemoMode()) {
    const store = getDemoStore();
    store.domainEvents.push({
      eventId: nextDemoId(store),
      organizationId: input.organizationId,
      eventType: input.eventType,
      eventName: input.eventName,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      actorId: input.actorId ?? null,
      payload,
      correlationId: input.correlationId ?? input.aggregateId,
      createdAt: new Date(),
    });
    // Sprint 4B: dispatch to in-process handlers (read-model projections) —
    // demo mode never reaches the db publisher, so this is the only seam.
    await dispatchToHandlers(normalized);
    return;
  }

  await getEngine().emit({
    organizationId: input.organizationId,
    eventType: input.eventType,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    payload,
    actorId: input.actorId,
    metadata: {
      eventVersion: 1,
      correlationId: input.correlationId ?? input.aggregateId,
    },
  });
  // Sprint 4B: same in-process handler dispatch on the real path (persist then
  // project), so read models are built identically in both modes.
  await dispatchToHandlers(normalized);
}
