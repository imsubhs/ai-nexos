import { TraversalBudget, KnowledgeNode } from '../types/models';

export enum TraversalStrategy {
  BFS = 'BFS',
  DFS = 'DFS',
  BIDIRECTIONAL = 'BIDIRECTIONAL',
  INDEX_LOOKUP = 'INDEX_LOOKUP'
}

export interface QueryPlan {
  strategy: TraversalStrategy;
  budget: TraversalBudget;
  estimated_cost: number;
}

export class GraphQueryPlanner {
  private defaultBudget: TraversalBudget = {
    max_depth: 3,
    max_visited_nodes: 1000,
    max_visited_edges: 5000,
    max_execution_time_ms: 200
  };

  /**
   * Selects the optimal traversal strategy before execution.
   */
  public createPlan(
    source: KnowledgeNode,
    target?: KnowledgeNode,
    requestedDepth?: number
  ): QueryPlan {
    const budget = this.calculateBudget(requestedDepth);
    
    // Select strategy based on Graph constraints
    let strategy = TraversalStrategy.BFS; // Default to breadth-first for neighborhood
    
    if (target) {
      // If we have a source and target, bidirectional search is usually optimal for shortest path
      strategy = TraversalStrategy.BIDIRECTIONAL;
    } else if (budget.max_depth > 5) {
      // Deep traversals might prefer DFS or hybrid if memory constrained
      strategy = TraversalStrategy.DFS; 
    }
    
    return {
      strategy,
      budget,
      estimated_cost: this.estimateCost(budget, strategy)
    };
  }

  private calculateBudget(requestedDepth?: number): TraversalBudget {
    return {
      max_depth: requestedDepth ? Math.min(requestedDepth, 10) : this.defaultBudget.max_depth,
      max_visited_nodes: this.defaultBudget.max_visited_nodes,
      max_visited_edges: this.defaultBudget.max_visited_edges,
      max_execution_time_ms: this.defaultBudget.max_execution_time_ms
    };
  }

  private estimateCost(budget: TraversalBudget, strategy: TraversalStrategy): number {
    // Basic heuristic cost based on branch factor estimations
    return budget.max_depth * 10;
  }
}

export const queryPlanner = new GraphQueryPlanner();
