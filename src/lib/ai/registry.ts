import { db } from "@/db";
import {
  aiPromptTemplates,
  aiPromptVersions,
  aiSkills,
} from "@/db/schema/ai-workspace";
import { eq, desc } from "drizzle-orm";

export class PromptRegistry {
  /**
   * Fetches the active, approved version of a prompt template.
   */
  static async getActivePrompt(templateName: string, organizationId: string) {
    const template = await db.query.aiPromptTemplates.findFirst({
      where: (t, { eq, and }) =>
        and(
          eq(t.name, templateName),
          eq(t.organizationId, organizationId),
          eq(t.isActive, true),
        ),
    });

    if (!template) return null;

    const version = await db.query.aiPromptVersions.findFirst({
      where: (v, { eq, and }) =>
        and(eq(v.templateId, template.id), eq(v.isApproved, true)),
      orderBy: [desc(aiPromptVersions.createdAt)],
    });

    return version;
  }

  /**
   * Rolls back a prompt to a previous version in case of regression.
   */
  static async rollbackPrompt(
    templateId: string,
    toVersionId: string,
    userId: string,
  ) {
    const targetVersion = await db.query.aiPromptVersions.findFirst({
      where: eq(aiPromptVersions.id, toVersionId),
    });

    if (!targetVersion) throw new Error("Target version not found");

    // Create a new version identical to the target, marking it as a rollback
    await db.insert(aiPromptVersions).values({
      templateId,
      promptVersion: `${targetVersion.promptVersion}-rollback`,
      systemPrompt: targetVersion.systemPrompt,
      variablesSchema: targetVersion.variablesSchema,
      isApproved: true,
      approvedBy: userId,
      rollbackFrom: toVersionId,
    });
  }
}

export class AISkillRegistry {
  /**
   * Retrieves an AI Skill definition, which bounds the prompt, models, and tools together.
   */
  static async getSkill(skillName: string, organizationId: string) {
    const skill = await db.query.aiSkills.findFirst({
      where: (s, { eq, and }) =>
        and(eq(s.name, skillName), eq(s.organizationId, organizationId)),
    });

    if (!skill) throw new Error(`Skill ${skillName} not found in registry.`);

    return skill;
  }
}
