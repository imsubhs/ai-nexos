import { db } from "@/db";
import { approvalCycles } from "@/db/schema/approvals";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";

/**
 * Loads a snapshot and guarantees its integrity via SHA-256 validation.
 */
export async function loadAndValidateSnapshot(
  cycleId: string,
  tx: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0] = db,
) {
  const cycle = await tx.query.approvalCycles.findFirst({
    where: eq(approvalCycles.cycleId, cycleId),
  });

  if (!cycle) throw new Error("Approval cycle not found");

  const snapshotString = JSON.stringify(cycle.snapshotData);
  const calculatedHash = createHash("sha256")
    .update(snapshotString)
    .digest("hex");

  if (calculatedHash !== cycle.snapshotHash) {
    throw new Error(
      "SNAPSHOT INTEGRITY FAILURE: The underlying entity data has been modified since the cycle was frozen.",
    );
  }

  return cycle.snapshotData;
}
