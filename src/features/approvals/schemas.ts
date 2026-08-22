import { z } from "zod";

/**
 * `organizationId` is deliberately absent.
 *
 * It was declared here and never read — the action has always stamped the
 * cycle with `user.organizationId`. A field that must always equal a derived
 * value is a trap: it reads as though the caller chooses the tenant, and the
 * first call site that starts trusting it reintroduces the whole class of bug.
 * The tenant is never a parameter (docs/SECURITY.md §3).
 */
export const createApprovalCycleSchema = z.object({
  entityType: z.enum([
    "deliverable",
    "file",
    "brand_asset",
    "creative_brief",
    "contract",
    "invoice",
    "prompt_pack",
    "campaign",
    "ai_content",
  ]),
  entityId: z.string().uuid(),
  workflowId: z.string().uuid().optional(),
});

export const submitReviewSchema = z.object({
  reviewId: z.string().uuid(),
  status: z.enum([
    "approved",
    "rejected",
    "approved_with_conditions",
    "abstained",
  ]),
  comments: z.string().optional(),
  conditions: z.array(z.string()).optional(), // Array of condition text strings
  externalToken: z.string().optional(), // Used if the reviewer is an external client
});

export const delegateReviewSchema = z
  .object({
    reviewId: z.string().uuid(),
    delegateToUserId: z.string().uuid().optional(),
    externalEmail: z.string().email().optional(),
    comments: z.string().optional(),
  })
  .refine((data) => data.delegateToUserId || data.externalEmail, {
    message:
      "Must provide either an internal user ID or an external email for delegation.",
  });

export const resolveConditionSchema = z.object({
  conditionId: z.string().uuid(),
  externalToken: z.string().optional(),
});
