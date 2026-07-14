

export interface GraphCache {
  invalidateNode(nodeId: string, orgId: string): Promise<void>;
  invalidateEdge(edgeId: string, orgId: string): Promise<void>;
  invalidateNeighborhood(nodeId: string, depth: number, orgId: string): Promise<void>;
  invalidateOrganization(orgId: string): Promise<void>;
}

export class EventDrivenCacheInvalidator {
  private cache: GraphCache;

  constructor(cacheImpl: GraphCache) {
    this.cache = cacheImpl;
  }

  /**
   * Handle incoming platform events to invalidate specific graph caches
   * This avoids TTL-only freshness and ensures real-time cache invalidation
   * when the underlying operational data triggers a graph projection update.
   */
  public async handlePlatformEvent(event: { eventType: string, payload: any, organization_id: string }) {
    const { eventType, payload, organization_id } = event;

    try {
      switch (eventType) {
        case 'NODE_CREATED':
        case 'NODE_UPDATED':
        case 'NODE_DELETED':
          if (payload.internal_id) {
            await this.cache.invalidateNode(payload.internal_id, organization_id);
            // Invalidate 1-level neighborhood as relationships might be impacted
            await this.cache.invalidateNeighborhood(payload.internal_id, 1, organization_id);
          }
          break;

        case 'EDGE_CREATED':
        case 'EDGE_DELETED':
          if (payload.id) {
            await this.cache.invalidateEdge(payload.id, organization_id);
          }
          if (payload.source_node_id) {
            await this.cache.invalidateNeighborhood(payload.source_node_id, 1, organization_id);
          }
          if (payload.target_node_id) {
            await this.cache.invalidateNeighborhood(payload.target_node_id, 1, organization_id);
          }
          break;
          
        case 'ORGANIZATION_PURGED':
          await this.cache.invalidateOrganization(organization_id);
          break;

        default:
          // Ignored events
          break;
      }
    } catch (error) {
      console.error(`Failed to invalidate cache for event ${eventType}:`, error);
    }
  }
}
