import { db } from "@/db";
import { aiAgentSkills } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export interface ToolCapabilityManifest {
  toolName: string;
  permissions: {
    requiredRoles?: string[];
    allowedResources?: string[];
  };
  approvalRequirements: {
    requiresHumanApproval: boolean;
    autoExecuteThreshold?: number; // e.g. 0.9 confidence
  };
  inputs: Record<string, { type: string; required: boolean; description: string }>;
  outputs: Record<string, { type: string; description: string }>;
  sideEffects: string[];
}

/**
 * Parses and validates a Tool Capability Manifest.
 * Ensures the agent is aware of the tool's bounds before execution.
 */
export async function getToolManifest(
  agentId: string,
  toolName: string
): Promise<ToolCapabilityManifest | null> {
  const [skill] = await db
    .select()
    .from(aiAgentSkills)
    .where(
      and(
        eq(aiAgentSkills.agentId, agentId),
        eq(aiAgentSkills.toolName, toolName)
      )
    );

  if (!skill) return null;

  return {
    toolName: skill.toolName,
    permissions: (skill.permissions as ToolCapabilityManifest["permissions"]) || {},
    approvalRequirements: (skill.approvalRequirements as ToolCapabilityManifest["approvalRequirements"]) || {
      requiresHumanApproval: true, // Fail safe
    },
    inputs: (skill.inputs as ToolCapabilityManifest["inputs"]) || {},
    outputs: (skill.outputs as ToolCapabilityManifest["outputs"]) || {},
    sideEffects: (skill.sideEffects as ToolCapabilityManifest["sideEffects"]) || [],
  };
}

export function validateToolExecution(
  manifest: ToolCapabilityManifest,
  contextData: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (manifest.inputs) {
    for (const [key, spec] of Object.entries(manifest.inputs)) {
      if (spec.required && (contextData[key] === undefined || contextData[key] === null)) {
        errors.push(`Missing required input: ${key}`);
      }
    }
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

