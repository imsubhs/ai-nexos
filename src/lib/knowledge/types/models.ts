export enum SemanticLayer {
  OPERATIONAL = 'OPERATIONAL',
  BUSINESS = 'BUSINESS',
  AI = 'AI',
  ANALYTICS = 'ANALYTICS'
}

export interface KnowledgeNode {
  internal_id: string; // Internal Graph ID (UUID)
  entity_id: string;   // Immutable External Entity ID
  entity_type: string; // e.g., 'USER', 'PROJECT', 'TASK'
  layer: SemanticLayer;
  organization_id: string;
  properties: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface EdgeProperties {
  weight?: number;
  confidence?: number;
  created_by?: string;
  source_module?: string;
  valid_from?: string;
  valid_until?: string;
  data: Record<string, unknown>; // JSON properties
}

export enum EdgeType {
  OWNS = 'OWNS',
  BELONGS_TO = 'BELONGS_TO',
  ASSIGNED_TO = 'ASSIGNED_TO',
  DEPENDS_ON = 'DEPENDS_ON',
  REFERENCES = 'REFERENCES',
  GENERATED = 'GENERATED',
  APPROVED = 'APPROVED',
  REQUESTED = 'REQUESTED',
  ATTENDED = 'ATTENDED',
  MENTIONED = 'MENTIONED',
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  LINKED = 'LINKED',
  RELATED = 'RELATED',
  CUSTOM = 'CUSTOM'
}

export interface KnowledgeEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type: EdgeType | string;
  properties: EdgeProperties;
  organization_id: string;
  created_at: string;
  is_deleted?: boolean; // Tombstone for append-only deletion
  version?: number;     // For append-only versioning
}

export interface ProjectionCheckpoint {
  id: string;
  event_id: string;
  event_sequence: number;
  projection_version: number;
  checkpoint_timestamp: string;
  module_source: string;
}

export interface TraversalBudget {
  max_depth: number;
  max_visited_nodes: number;
  max_visited_edges: number;
  max_execution_time_ms: number;
}
