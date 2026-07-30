import {
  EdgeType,
  EdgeProperties,
  KnowledgeNode,
  KnowledgeEdge,
} from "../types/models";

export interface RelationshipRule {
  allowed_source_nodes: string[];
  allowed_target_nodes: string[];
  cardinality: "1:1" | "1:N" | "N:1" | "N:M";
  required_properties: string[];
}

export interface GraphDBContext {
  getEdgeCount(
    sourceNodeId: string,
    edgeType: string,
    targetNodeId?: string,
  ): Promise<number>;
  getRuleConfig(edgeType: string): Promise<RelationshipRule | null>;
}

export class RelationshipRegistry {
  private db: GraphDBContext;

  constructor(db: GraphDBContext) {
    this.db = db;
  }

  /**
   * Database-backed relationship validation enforcing types, required properties, and cardinality.
   */
  public async validateRelationship(
    source: KnowledgeNode,
    target: KnowledgeNode,
    edge: KnowledgeEdge,
  ): Promise<boolean> {
    const rule = await this.db.getRuleConfig(edge.edge_type);

    if (!rule) {
      throw new Error(`Unknown relationship type: ${edge.edge_type}`);
    }

    if (
      rule.allowed_source_nodes.length > 0 &&
      !rule.allowed_source_nodes.includes(source.entity_type)
    ) {
      throw new Error(
        `Invalid source node type ${source.entity_type} for edge ${edge.edge_type}`,
      );
    }

    if (
      rule.allowed_target_nodes.length > 0 &&
      !rule.allowed_target_nodes.includes(target.entity_type)
    ) {
      throw new Error(
        `Invalid target node type ${target.entity_type} for edge ${edge.edge_type}`,
      );
    }

    for (const prop of rule.required_properties) {
      if (edge.properties[prop as keyof EdgeProperties] === undefined) {
        throw new Error(
          `Missing required property ${prop} for edge ${edge.edge_type}`,
        );
      }
    }

    // Runtime Cardinality Enforcement
    if (rule.cardinality === "1:1") {
      const sourceCount = await this.db.getEdgeCount(
        source.internal_id,
        edge.edge_type,
      );
      if (sourceCount >= 1)
        throw new Error(
          `Cardinality violation 1:1 for source ${source.internal_id}`,
        );

      const targetCount = await this.db.getEdgeCount(
        target.internal_id,
        edge.edge_type,
        undefined,
      );
      if (targetCount >= 1)
        throw new Error(
          `Cardinality violation 1:1 for target ${target.internal_id}`,
        );
    } else if (rule.cardinality === "1:N") {
      // One target can only have One source for this edge type (Target -> Source is N:1 perspective)
      // Actually '1:N' means Source can have Many targets, Target can have One source.
      // E.g., User (1) OWNS Projects (N)
      const targetCount = await this.db.getEdgeCount(
        target.internal_id,
        edge.edge_type,
        undefined,
      );
      if (targetCount >= 1)
        throw new Error(
          `Cardinality violation 1:N: Target ${target.internal_id} already has a source for ${edge.edge_type}`,
        );
    } else if (rule.cardinality === "N:1") {
      // Source can have One target, Target can have Many sources
      const sourceCount = await this.db.getEdgeCount(
        source.internal_id,
        edge.edge_type,
      );
      if (sourceCount >= 1)
        throw new Error(
          `Cardinality violation N:1: Source ${source.internal_id} already has a target for ${edge.edge_type}`,
        );
    }
    // 'N:M' requires no specific maximum edge count constraints

    return true;
  }
}
