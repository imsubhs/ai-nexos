import { db } from "@/db";
import { aiModelProfiles } from "@/db/schema/ai-workspace";
import type { ModelRoutingRequest } from "./types";
import { eq, and, gte, asc } from "drizzle-orm";

export async function routeModel(req: ModelRoutingRequest) {
  const conditions = [
    eq(aiModelProfiles.isActive, true),
    eq(aiModelProfiles.capability, req.capability),
    gte(aiModelProfiles.contextWindow, req.minContextWindow)
  ];

  // Fetch all profiles matching the capability and context requirements
  const profiles = await db.select()
    .from(aiModelProfiles)
    .where(and(...conditions))
    .orderBy(asc(aiModelProfiles.costPer1kPrompt)); // Order by cheapest first

  if (profiles.length === 0) {
    return null;
  }

  // Filter by cost constraint if specified
  let validProfiles = profiles;
  if (req.maxCostPer1kTokens) {
    validProfiles = profiles.filter(p => 
      p.costPer1kPrompt !== null && Number(p.costPer1kPrompt) <= req.maxCostPer1kTokens!
    );
  }

  if (validProfiles.length === 0) return null;

  // Prioritize provider preference if specified, but KEEP others as fallbacks
  if (req.providerPreference) {
    // validProfiles = [...preferred, ...others];
    console.log(`Preferred provider preference requested: ${req.providerPreference}`);
  }

  // Return the best model and a list of fallbacks for the Provider Factory
  return {
    primary: validProfiles[0],
    fallbacks: validProfiles.slice(1)
  };
}
