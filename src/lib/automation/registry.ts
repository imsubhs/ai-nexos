/* eslint-disable @typescript-eslint/no-explicit-any */
import { 
  automationTriggerTypeEnum, 
  automationActionTypeEnum 
} from "@/db/schema/enums";

export type TriggerType = typeof automationTriggerTypeEnum.enumValues[number];
export type ActionType = typeof automationActionTypeEnum.enumValues[number];

export interface AutomationCapability {
  id: string; // Unique string identifier, e.g., 'cap_client_onboarding'
  name: string;
  description: string;
  allowedTriggers: TriggerType[];
  allowedActions: ActionType[];
  requiredPermissions: string[];
  requiresApproval: boolean;
  aiAvailable: boolean;
}

/**
 * Automation Capability Registry
 * 
 * Defines what triggers and actions are allowed for specific types of automation scenarios.
 * E.g., a capability for 'Client Onboarding' might allow platform events, but not arbitrary webhook triggers.
 */
class CapabilityRegistry {
  private capabilities: Map<string, AutomationCapability> = new Map();

  register(capability: AutomationCapability) {
    if (this.capabilities.has(capability.id)) {
      throw new Error(`Capability with id ${capability.id} is already registered.`);
    }
    this.capabilities.set(capability.id, capability);
  }

  get(id: string): AutomationCapability | undefined {
    return this.capabilities.get(id);
  }

  list(): AutomationCapability[] {
    return Array.from(this.capabilities.values());
  }
}

export const automationRegistry = new CapabilityRegistry();

// -----------------------------------------------------------------------------
// Seed Core Capabilities
// -----------------------------------------------------------------------------

automationRegistry.register({
  id: "cap_core_platform_events",
  name: "Core Platform Events",
  description: "Standard workflow capability reacting to internal platform events.",
  allowedTriggers: ["platform_event", "manual"],
  allowedActions: ["create", "update", "delete", "notify", "assign", "request_review"],
  requiredPermissions: ["automation:execute:core"],
  requiresApproval: false,
  aiAvailable: false,
});

automationRegistry.register({
  id: "cap_external_integration",
  name: "External Integration",
  description: "Allows integrations via webhooks and sending emails.",
  allowedTriggers: ["webhook", "api"],
  allowedActions: ["webhook", "send_email", "notify"],
  requiredPermissions: ["automation:execute:external"],
  requiresApproval: true,
  aiAvailable: false,
});

automationRegistry.register({
  id: "cap_ai_orchestration",
  name: "AI Orchestration",
  description: "Allows AI-driven workflows utilizing the AI Workspace.",
  allowedTriggers: ["platform_event", "schedule", "manual"],
  allowedActions: ["ai_workspace", "generate", "request_review", "notify"],
  requiredPermissions: ["automation:execute:ai"],
  requiresApproval: false,
  aiAvailable: true,
});
