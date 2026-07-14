import { queryPlanner, TraversalStrategy } from './planner';
import { KnowledgeNode, TraversalBudget } from '../types/models';

export interface ActionDBContext {
  getNode(id: string): Promise<KnowledgeNode>;
  executeGraphTraversal(startNodeId: string, budget: TraversalBudget): Promise<any>;
  executeShortestPath(sourceId: string, targetId: string, budget: TraversalBudget): Promise<any>;
}

export class QueryActions {
  private db: ActionDBContext;

  constructor(db: ActionDBContext) {
    this.db = db;
  }

  public async getNeighborhoodAction(nodeId: string, depth: number = 1) {
    const sourceNode = await this.db.getNode(nodeId);
    
    // Use Graph Query Planner to get optimal strategy and budget
    const plan = queryPlanner.createPlan(sourceNode, undefined, depth);
    
    // Enforce Traversal Budget
    if (depth > plan.budget.max_depth) {
      throw new Error(`Requested depth ${depth} exceeds budget max ${plan.budget.max_depth}`);
    }

    // Pass planner limits into the database execution strategy
    // Executes the secure SQL CTE function: traverse_graph_secure()
    const results = await this.db.executeGraphTraversal(nodeId, plan.budget);
    
    return {
      strategy_used: plan.strategy,
      budget_allocated: plan.budget,
      results
    };
  }

  public async findShortestPathAction(sourceId: string, targetId: string) {
    const sourceNode = await this.db.getNode(sourceId);
    const targetNode = await this.db.getNode(targetId);
    
    const plan = queryPlanner.createPlan(sourceNode, targetNode);

    // Pass planner limits into DB shortest path execution
    const path = await this.db.executeShortestPath(sourceId, targetId, plan.budget);

    return {
      strategy_used: plan.strategy,
      budget_allocated: plan.budget,
      path
    };
  }

  public async traverseGraphAction(sourceId: string, customDepth: number) {
    const sourceNode = await this.db.getNode(sourceId);
    const plan = queryPlanner.createPlan(sourceNode, undefined, customDepth);

    if (customDepth > plan.budget.max_depth) {
      throw new Error(`Requested depth exceeds budget limit of ${plan.budget.max_depth}`);
    }

    const results = await this.db.executeGraphTraversal(sourceId, plan.budget);
    
    return {
      strategy_used: plan.strategy,
      budget_allocated: plan.budget,
      results
    };
  }
}
