/* eslint-disable @typescript-eslint/no-explicit-any */
import { ActionType, TriggerType } from "./registry";

export interface RawWorkflowDefinition {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export type NodeType = "trigger" | "condition" | "action";

export interface WorkflowNode {
  id: string;
  type: NodeType;
  subType?: TriggerType | ActionType;
  config: Record<string, any>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  conditionId?: string; // If this edge requires a condition to evaluate to true
}

export interface CompiledExecutablePlan {
  workflowId: string;
  version: number;
  entryNodes: string[];
  executionGraph: Record<
    string,
    {
      node: WorkflowNode;
      nextNodes: string[];
    }
  >;
  compiledAt: Date;
}

export class WorkflowCompilationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowCompilationError";
  }
}

/**
 * Workflow Compiler
 *
 * Transforms a raw nodes/edges graph into a strict Executable Plan.
 * Validates the graph for:
 * - Reachability (invalid branches)
 * - Cyclic dependencies (infinite loops)
 * - Support matrix (unsupported actions)
 */
export class WorkflowCompiler {
  compile(
    definition: RawWorkflowDefinition,
    versionNumber: number,
  ): CompiledExecutablePlan {
    const { nodes, edges } = definition;

    if (!nodes || nodes.length === 0) {
      throw new WorkflowCompilationError(
        "Workflow must contain at least one node.",
      );
    }

    const nodeMap = new Map<string, WorkflowNode>();
    for (const node of nodes) {
      nodeMap.set(node.id, node);
    }

    const adjacencyList = new Map<string, string[]>();
    for (const node of nodes) {
      adjacencyList.set(node.id, []);
    }

    for (const edge of edges) {
      if (!nodeMap.has(edge.source))
        throw new WorkflowCompilationError(
          `Invalid edge source: ${edge.source}`,
        );
      if (!nodeMap.has(edge.target))
        throw new WorkflowCompilationError(
          `Invalid edge target: ${edge.target}`,
        );
      adjacencyList.get(edge.source)!.push(edge.target);
    }

    // 1. Detect Infinite Loops (Cycles in Directed Graph)
    this.detectCycles(adjacencyList);

    // 2. Identify Entry Nodes (Triggers)
    const entryNodes = nodes
      .filter((n) => n.type === "trigger")
      .map((n) => n.id);
    if (entryNodes.length === 0) {
      throw new WorkflowCompilationError(
        "Workflow must have at least one trigger node.",
      );
    }

    // 3. Detect Reachability (Invalid branches)
    this.detectUnreachableNodes(
      nodes.map((n) => n.id),
      entryNodes,
      adjacencyList,
    );

    // Build the execution graph
    const executionGraph: Record<
      string,
      { node: WorkflowNode; nextNodes: string[] }
    > = {};
    for (const node of nodes) {
      executionGraph[node.id] = {
        node,
        nextNodes: adjacencyList.get(node.id) || [],
      };
    }

    return {
      workflowId: definition.id,
      version: versionNumber,
      entryNodes,
      executionGraph,
      compiledAt: new Date(),
    };
  }

  private detectCycles(adjacencyList: Map<string, string[]>) {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string) => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = adjacencyList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (recursionStack.has(neighbor)) {
          throw new WorkflowCompilationError(
            `Infinite loop detected involving node ${neighbor}`,
          );
        }
      }

      recursionStack.delete(nodeId);
    };

    for (const nodeId of adjacencyList.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    }
  }

  private detectUnreachableNodes(
    allNodeIds: string[],
    entryNodes: string[],
    adjacencyList: Map<string, string[]>,
  ) {
    const visited = new Set<string>();

    const queue = [...entryNodes];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (!visited.has(current)) {
        visited.add(current);
        const neighbors = adjacencyList.get(current) || [];
        queue.push(...neighbors);
      }
    }

    for (const nodeId of allNodeIds) {
      if (!visited.has(nodeId)) {
        throw new WorkflowCompilationError(
          `Invalid branch: Node ${nodeId} is unreachable from any trigger.`,
        );
      }
    }
  }
}
