"use server";

import { db } from "@/db";
import { 
  approvalCycles, 
  approvalStages, 
  reviews, 
  approvalEvents, 
  approvalConditions 
} from "@/db/schema/approvals";
import { requireCurrentUser } from "@/features/auth/current-user";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createHash } from "crypto";
import { 
  createApprovalCycleSchema, 
  submitReviewSchema, 
  delegateReviewSchema, 
  resolveConditionSchema 
} from "./schemas";
import { ApprovalEngine } from "./engine";
import { verifyExternalReviewToken } from "./tokens";

export async function createApprovalCycle(data: z.infer<typeof createApprovalCycleSchema>) {
  const user = await requireCurrentUser();
  
  const cycle = await db.transaction(async (tx) => {
    const snapshotData = { 
      frozenAt: new Date().toISOString(), 
      entityId: data.entityId, 
      entityType: data.entityType 
    };
    
    const snapshotString = JSON.stringify(snapshotData);
    const snapshotHash = createHash("sha256").update(snapshotString).digest("hex");
    
    const [newCycle] = await tx.insert(approvalCycles).values({
      organizationId: user.organizationId,
      entityType: data.entityType,
      entityId: data.entityId,
      workflowId: data.workflowId,
      snapshotData,
      snapshotHash,
      status: "pending",
      createdBy: user.userId,
    }).returning();
    
    await tx.insert(approvalEvents).values({
      cycleId: newCycle.cycleId,
      actorId: user.userId,
      eventType: "cycle_started",
      payload: { note: "Cycle created and entity snapshotted" },
    });
    
    return newCycle;
  });
  
  return cycle;
}

export async function submitReview(data: z.infer<typeof submitReviewSchema>) {
  let actorId: string | undefined = undefined;
  
  if (!data.externalToken) {
    const user = await requireCurrentUser();
    actorId = user.userId;
  } else {
    // Validate token and ensure it matches the targeted review
    const decoded = await verifyExternalReviewToken(data.externalToken);
    if (decoded.reviewId !== data.reviewId) {
      throw new Error("Token does not match the target review");
    }
  }
  
  await db.transaction(async (tx) => {
    const [updatedReview] = await tx.update(reviews).set({
      status: data.status,
      comments: data.comments,
      submittedAt: new Date(),
    }).where(eq(reviews.reviewId, data.reviewId)).returning();
    
    if (data.status === "approved_with_conditions" && data.conditions?.length) {
      for (const cond of data.conditions) {
        await tx.insert(approvalConditions).values({
          reviewId: data.reviewId,
          conditionText: cond,
        });
      }
    }
    
    const reviewStage = await tx.query.approvalStages.findFirst({
      where: eq(approvalStages.stageId, updatedReview.stageId)
    });
    
    if (reviewStage) {
      await tx.insert(approvalEvents).values({
        cycleId: reviewStage.cycleId,
        actorId: actorId,
        eventType: "review_submitted",
        payload: { status: data.status, comments: data.comments },
      });
      
      // Let the Approval Engine evaluate the workflow
      await ApprovalEngine.evaluateCycle(reviewStage.cycleId, tx);
    }
  });
}

export async function delegateReview(data: z.infer<typeof delegateReviewSchema>) {
  const user = await requireCurrentUser();
  
  await db.transaction(async (tx) => {
    const [review] = await tx.update(reviews).set({
      status: "delegated",
      comments: data.comments,
      submittedAt: new Date(),
    }).where(eq(reviews.reviewId, data.reviewId)).returning();
    
    await tx.insert(reviews).values({
      stageId: review.stageId,
      reviewerId: data.delegateToUserId,
      externalEmail: data.externalEmail,
      delegatedFromId: user.userId,
      status: "pending",
    });
    
    const reviewStage = await tx.query.approvalStages.findFirst({
      where: eq(approvalStages.stageId, review.stageId)
    });
    
    if (reviewStage) {
      await tx.insert(approvalEvents).values({
        cycleId: reviewStage.cycleId,
        actorId: user.userId,
        eventType: "review_delegated",
        payload: { delegatedTo: data.delegateToUserId || data.externalEmail },
      });
    }
  });
}

export async function resolveCondition(data: z.infer<typeof resolveConditionSchema>) {
  let actorId: string | undefined = undefined;
  
  if (!data.externalToken) {
    const user = await requireCurrentUser();
    actorId = user.userId;
  }
  
  await db.transaction(async (tx) => {
    const [condition] = await tx.update(approvalConditions).set({
      isResolved: true,
      resolvedBy: actorId,
      resolvedAt: new Date(),
    }).where(eq(approvalConditions.conditionId, data.conditionId)).returning();

    if (condition) {
      const review = await tx.query.reviews.findFirst({
        where: eq(reviews.reviewId, condition.reviewId)
      });
      
      if (review) {
        const stage = await tx.query.approvalStages.findFirst({
          where: eq(approvalStages.stageId, review.stageId)
        });
        
        if (stage) {
          // Re-evaluate cycle to see if this resolution unblocked final approval
          await ApprovalEngine.evaluateCycle(stage.cycleId, tx);
        }
      }
    }
  });
}
