import {
  ProjectionCheckpoint,
  KnowledgeNode,
  KnowledgeEdge,
} from "../types/models";
import { EventDrivenCacheInvalidator } from "../cache/invalidator";
import { RelationshipRegistry, GraphDBContext } from "../registry/registry";

export interface PlatformEvent {
  id: string; // Event ID
  sequence: number;
  type: string;
  source_module: string;
  timestamp: string;
  payload: any;
  organization_id: string;
  auth_token?: string; // Used to authenticate events from Module 12
}

export interface EngineDBContext {
  getLatestCheckpoint(orgId: string): Promise<ProjectionCheckpoint | null>;
  saveCheckpoint(checkpoint: ProjectionCheckpoint): Promise<void>;
  hasProcessedEvent(eventId: string): Promise<boolean>;
  getConnectedEdgeIds(nodeId: string): Promise<string[]>;
  verifyModuleAuth(token?: string): boolean;
  // Node / Edge appends
  appendNodeVersion(node: KnowledgeNode): Promise<void>;
  appendEdgeVersion(edge: KnowledgeEdge): Promise<void>;
  tombstoneNode(internalId: string): Promise<void>;
  tombstoneEdge(edgeId: string): Promise<void>;
}

export class ProjectionEngine {
  private cacheInvalidator: EventDrivenCacheInvalidator;
  private registry: RelationshipRegistry;
  private db: EngineDBContext;

  constructor(
    cacheInvalidator: EventDrivenCacheInvalidator,
    registry: RelationshipRegistry,
    db: EngineDBContext,
  ) {
    this.cacheInvalidator = cacheInvalidator;
    this.registry = registry;
    this.db = db;
  }

  /**
   * Initializes the engine by loading the latest checkpoint to resume processing.
   */
  public async resume(orgId: string): Promise<number> {
    const latest = await this.db.getLatestCheckpoint(orgId);
    return latest ? latest.event_sequence : 0;
  }

  /**
   * Process a stream of events deterministically.
   * Append-only projection ensuring we never overwrite graph relationships.
   */
  public async processEvents(events: PlatformEvent[]) {
    // Sort by sequence for deterministic replay
    events.sort((a, b) => a.sequence - b.sequence);

    for (const event of events) {
      // 1. Authenticate event (Security check)
      if (!this.db.verifyModuleAuth(event.auth_token)) {
        console.error(`Unauthorized event dropped: ${event.id}`);
        continue; // Drop or DLQ
      }

      // 2. Idempotency Check (High-water mark / exact event)
      if (await this.db.hasProcessedEvent(event.id)) {
        console.log(`Skipping already processed event: ${event.id}`);
        continue;
      }

      try {
        await this.applyEvent(event);

        await this.db.saveCheckpoint({
          id: crypto.randomUUID(),
          event_id: event.id,
          event_sequence: event.sequence,
          projection_version: 1,
          checkpoint_timestamp: new Date().toISOString(),
          module_source: event.source_module,
        });

        // Asynchronous Event-driven cache invalidation to prevent projection lag
        this.cacheInvalidator
          .handlePlatformEvent({
            eventType: event.type,
            payload: event.payload,
            organization_id: event.organization_id,
          })
          .catch((err) =>
            console.error("Async cache invalidation failed:", err),
          );
      } catch (error) {
        console.error(`Failed to process event ${event.id}:`, error);
        throw error;
      }
    }
  }

  private async applyEvent(event: PlatformEvent) {
    switch (event.type) {
      case "NODE_CREATED":
      case "NODE_UPDATED":
        await this.db.appendNodeVersion(event.payload);
        break;
      case "EDGE_CREATED":
        // Validation via registry happens before appending
        const { sourceNode, targetNode, edge } = event.payload;
        await this.registry.validateRelationship(sourceNode, targetNode, edge);
        await this.db.appendEdgeVersion(edge);
        break;
      case "NODE_DELETED":
        const internalId = event.payload.internal_id;
        await this.db.tombstoneNode(internalId);

        // Cascade tombstones to all connected edges to prevent orphans
        const connectedEdges = await this.db.getConnectedEdgeIds(internalId);
        for (const edgeId of connectedEdges) {
          await this.db.tombstoneEdge(edgeId);
        }
        break;
      case "EDGE_DELETED":
        await this.db.tombstoneEdge(event.payload.id);
        break;
    }
  }
}
