import { db } from "@/db";
import { approvalCycles } from "@/db/schema/approvals";
import { eq, and } from "drizzle-orm";

/**
 * Ensures application-level cascading. 
 * Must be invoked whenever a parent entity (e.g. Deliverable, File) is hard-deleted or archived.
 */
export async function archiveEntityApprovals(
  entityType: "deliverable" | "file" | "brand_asset" | "creative_brief" | "contract" | "invoice" | "prompt_pack" | "campaign" | "ai_content", 
  entityId: string, 
  tx: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0] = db
) {
  await tx.update(approvalCycles).set({
    status: "cancelled",
  }).where(
    and(
      eq(approvalCycles.entityType, entityType),
      eq(approvalCycles.entityId, entityId)
    )
  );
}
