import { db } from "@/db";
import { aiGuardrails } from "@/db/schema/ai-workspace";
import { eq, or, isNull, and } from "drizzle-orm";

export class AIGuardrails {
  /**
   * Acts as a Prompt Firewall before execution.
   * Dynamically loads Active Guardrails from the Database.
   * Supports both Organization-specific rules and Global rules.
   */
  static async validatePrompt(
    promptContent: string,
    organizationId: string,
  ): Promise<boolean> {
    const activeGuardrails = await db.query.aiGuardrails.findMany({
      where: and(
        eq(aiGuardrails.isActive, true),
        or(
          eq(aiGuardrails.organizationId, organizationId),
          isNull(aiGuardrails.organizationId), // Global rules
        ),
      ),
    });

    for (const rule of activeGuardrails) {
      if (rule.ruleType === "blocked_keyword") {
        if (promptContent.toLowerCase().includes(rule.pattern.toLowerCase())) {
          console.warn(`Prompt blocked by keyword rule: ${rule.pattern}`);
          return false;
        }
      } else if (
        rule.ruleType === "pii_pattern" ||
        rule.ruleType === "prompt_injection"
      ) {
        try {
          const regex = new RegExp(rule.pattern, "i");
          if (regex.test(promptContent)) {
            console.warn(
              `Prompt blocked by regex pattern rule: ${rule.ruleType}`,
            );
            return false;
          }
        } catch (_e) {
          console.error(`Invalid regex in guardrail pattern: ${rule.pattern}`);
        }
      }
    }

    return true; // Prompt is safe to execute
  }
}
