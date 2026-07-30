import { db } from "@/db";
import {
  approvalCycles,
  approvalStages,
  approvalConditions,
  approvalEvents,
} from "@/db/schema/approvals";
import { eq, and } from "drizzle-orm";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class ApprovalEngine {
  /**
   * Evaluates the state of a cycle (Quorum, Conditionals, Stage Progression).
   * Must be called after every review submission or condition resolution.
   */
  static async evaluateCycle(cycleId: string, tx: DbTransaction) {
    const cycle = await tx.query.approvalCycles.findFirst({
      where: eq(approvalCycles.cycleId, cycleId),
      with: {
        stages: {
          with: { reviews: true },
        },
      },
    });

    if (!cycle || cycle.status === "cancelled") return;

    let hasRejected = false;
    let allStagesComplete = true;

    // Evaluate stages in order
    const sortedStages = cycle.stages.sort(
      (a, b) => a.orderIndex - b.orderIndex,
    );

    for (const stage of sortedStages) {
      if (stage.status === "rejected") {
        hasRejected = true;
        break;
      }

      if (stage.status !== "completed" && stage.status !== "skipped") {
        if (stage.status === "active") {
          let approvedCount = 0;

          for (const review of stage.reviews) {
            if (review.status === "rejected") {
              await tx
                .update(approvalStages)
                .set({ status: "rejected" })
                .where(eq(approvalStages.stageId, stage.stageId));
              hasRejected = true;
              break;
            }
            if (
              review.status === "approved" ||
              review.status === "approved_with_conditions"
            ) {
              approvedCount++;
            }
          }

          if (hasRejected) break;

          // Quorum evaluation
          if (approvedCount >= stage.quorumCount) {
            await tx
              .update(approvalStages)
              .set({ status: "completed" })
              .where(eq(approvalStages.stageId, stage.stageId));

            // Activate next stage sequentially
            const nextStage = sortedStages.find(
              (s) => s.orderIndex > stage.orderIndex && s.status === "pending",
            );
            if (nextStage) {
              await tx
                .update(approvalStages)
                .set({ status: "active" })
                .where(eq(approvalStages.stageId, nextStage.stageId));
              allStagesComplete = false;
            }
          } else {
            allStagesComplete = false;
          }
        } else {
          allStagesComplete = false;
        }
      }
    }

    // Evaluate overall Cycle completion
    if (hasRejected) {
      if (cycle.status !== "rejected") {
        await tx
          .update(approvalCycles)
          .set({ status: "rejected" })
          .where(eq(approvalCycles.cycleId, cycleId));
        await tx.insert(approvalEvents).values({
          cycleId,
          eventType: "cycle_rejected",
          payload: { note: "Quorum failed or rejection received" },
        });
      }
    } else if (allStagesComplete) {
      // Evaluate conditions
      const cycleReviewIds = cycle.stages.flatMap((s) =>
        s.reviews.map((r) => r.reviewId),
      );
      let hasUnresolvedConditions = false;

      if (cycleReviewIds.length > 0) {
        const unresolved = await tx.query.approvalConditions.findMany({
          where: eq(approvalConditions.isResolved, false),
        });
        hasUnresolvedConditions = unresolved.some((c) =>
          cycleReviewIds.includes(c.reviewId),
        );
      }

      if (hasUnresolvedConditions) {
        if (cycle.status !== "conditional") {
          await tx
            .update(approvalCycles)
            .set({ status: "conditional" })
            .where(eq(approvalCycles.cycleId, cycleId));
        }
      } else {
        if (cycle.status !== "approved") {
          await tx
            .update(approvalCycles)
            .set({ status: "approved" })
            .where(eq(approvalCycles.cycleId, cycleId));
          await tx.insert(approvalEvents).values({
            cycleId,
            eventType: "cycle_approved",
            payload: { note: "Cycle fully approved, all conditions resolved" },
          });
        }
      }
    }
  }
}
