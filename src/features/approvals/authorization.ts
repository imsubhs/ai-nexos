/**
 * Approval authorization — the one place that decides who may act on a review
 * or a condition.
 *
 * A plain module, deliberately: nothing here is a server action, so no export
 * on this file is reachable as an HTTP endpoint. It is imported by
 * `real-actions.ts`, which is the "use server" surface.
 *
 * ── Why this file exists ─────────────────────────────────────────────────────
 *
 * `real-actions.ts` previously did all four of the following in-line, and got
 * three of them wrong:
 *
 *   1. `resolveCondition()` skipped authentication entirely whenever the caller
 *      supplied a non-empty `externalToken`, and then never verified it. Any
 *      string authorised the mutation. See CRIT-1.
 *   2. `submitReview()` and `delegateReview()` established identity and then
 *      updated `reviews` by primary key alone — no organisation predicate, no
 *      permission check, no check that the review was the caller's to submit.
 *      A review id from another tenant matched a row and was written. See H-1.
 *   3. The mutation ran first and the checks (such as they were) came after.
 *   4. Failure messages differed by cause, which made the endpoint an oracle
 *      for "does this review id exist".
 *
 * ── The four controls, kept distinct ─────────────────────────────────────────
 *
 * These are different things and are enforced separately here:
 *
 *   · authentication          `requireCurrentUser()` — who is calling
 *   · authorization (RBAC)    `requirePermission()`  — may this ROLE do this
 *   · tenant isolation        cycle.organizationId === user.organizationId
 *   · object-level authz      is THIS review this caller's to act on
 *
 * A caller that passes the first two and fails either of the last two is the
 * exact shape of every cross-tenant finding in the Phase 2.5.1 audit. Passing
 * `requireCurrentUser()` is not authorization, and holding `approvals.review`
 * organisation-wide is not permission to submit somebody else's review.
 *
 * ── One refusal message ──────────────────────────────────────────────────────
 *
 * Every resource-level failure below throws `APPROVAL_DENIED` — missing,
 * wrong tenant, wrong reviewer, revoked token, all identical. Distinguishing
 * them tells an attacker which ids exist, which is the disclosure the tenant
 * check is there to prevent. `requirePermission()` throws its own
 * `PermissionDeniedError` first and reveals nothing about the resource, so the
 * ordering below is: role, then existence, then tenant, then object.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  approvalConditions,
  approvalCycles,
  approvalStages,
  reviews,
} from "@/db/schema/approvals";
import type { CurrentUser } from "@/features/auth/current-user";
import type { Action } from "@/features/permissions/constants";
import { requirePermission } from "@/features/permissions";
import { timingSafeCompare } from "@/lib/security/password";
import { verifyExternalReviewToken } from "./tokens";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbLike = typeof db | DbTransaction;

/**
 * The single refusal. Deliberately says nothing about which check failed.
 */
const APPROVAL_DENIED = "Approval not found or access denied.";

export class ApprovalAccessError extends Error {
  constructor() {
    super(APPROVAL_DENIED);
    this.name = "ApprovalAccessError";
  }
}

/** A review with the stage and cycle that own it — the tenancy path. */
export type ApprovalContext = {
  readonly review: typeof reviews.$inferSelect;
  readonly stage: typeof approvalStages.$inferSelect;
  readonly cycle: typeof approvalCycles.$inferSelect;
};

/**
 * Resolves review → stage → cycle in one query.
 *
 * `approval_cycles` is the only table in this graph carrying
 * `organization_id`; `reviews` and `approval_stages` inherit their tenancy
 * through it. That is why every check in this file joins all the way up rather
 * than filtering the review directly — there is nothing on the review row to
 * filter on.
 */
async function loadReviewContext(
  reviewId: string,
  tx: DbLike,
): Promise<ApprovalContext | null> {
  const [row] = await tx
    .select({
      review: reviews,
      stage: approvalStages,
      cycle: approvalCycles,
    })
    .from(reviews)
    .innerJoin(approvalStages, eq(reviews.stageId, approvalStages.stageId))
    .innerJoin(
      approvalCycles,
      eq(approvalStages.cycleId, approvalCycles.cycleId),
    )
    .where(eq(reviews.reviewId, reviewId))
    .limit(1);

  return row ?? null;
}

/** As above, entered from a condition instead of a review. */
async function loadConditionContext(
  conditionId: string,
  tx: DbLike,
): Promise<
  | (ApprovalContext & { condition: typeof approvalConditions.$inferSelect })
  | null
> {
  const [row] = await tx
    .select({
      condition: approvalConditions,
      review: reviews,
      stage: approvalStages,
      cycle: approvalCycles,
    })
    .from(approvalConditions)
    .innerJoin(reviews, eq(approvalConditions.reviewId, reviews.reviewId))
    .innerJoin(approvalStages, eq(reviews.stageId, approvalStages.stageId))
    .innerJoin(
      approvalCycles,
      eq(approvalStages.cycleId, approvalCycles.cycleId),
    )
    .where(eq(approvalConditions.conditionId, conditionId))
    .limit(1);

  return row ?? null;
}

/**
 * Internal caller acting on a review.
 *
 * `requireReviewerAuthority` is the object-level control and defaults on: a
 * role permission says the caller may participate in approvals at all, not
 * that this particular review is theirs to decide. An organisation-wide
 * `approvals.review` grant without this check means any member can cast any
 * other member's vote, which is the same defect as the cross-tenant one with a
 * smaller blast radius.
 */
export async function validateInternalReviewAccess(
  reviewId: string,
  user: CurrentUser,
  action: Action,
  tx: DbLike = db,
  {
    requireReviewerAuthority = true,
  }: { requireReviewerAuthority?: boolean } = {},
): Promise<ApprovalContext> {
  // 1. RBAC — reveals nothing about the resource, so it goes first.
  requirePermission(user.permissions, "approvals", action);

  // 2. Existence.
  const context = await loadReviewContext(reviewId, tx);
  if (!context) throw new ApprovalAccessError();

  // 3. Tenant isolation.
  if (context.cycle.organizationId !== user.organizationId) {
    throw new ApprovalAccessError();
  }

  // 4. Object-level authorization. A review awaiting an external reviewer has
  //    `reviewerId = null`, which no internal user id can equal — so the same
  //    comparison also stops an internal user answering on a client's behalf.
  if (requireReviewerAuthority && context.review.reviewerId !== user.userId) {
    throw new ApprovalAccessError();
  }

  return context;
}

/**
 * External caller acting on a review, by bearer token.
 *
 * This mirrors `POST /api/approvals/verify` exactly — same mechanism, same
 * order, same refusal — because there should be one answer in this codebase to
 * "is this external review token good", not two that drift.
 *
 *   1. signature and expiry, cryptographically (`jwtVerify`);
 *   2. the token names the review the caller named — a token minted for review
 *      A must not authorise review B;
 *   3. the review is genuinely an external review (it has both a stored token
 *      and an address it was issued to);
 *   4. the stored token still matches, in constant time. The column is the
 *      revocation record: reissuing supersedes the old token, so an unexpired
 *      token that no longer matches is refused.
 *
 * Note the consequence of (3): no code path in this application currently
 * writes `reviews.external_token`, so external access fails closed today. That
 * is the correct posture — the alternative is a verification step that passes
 * because the column it checks is empty.
 *
 * There is deliberately no permission check. Permissions belong to users of
 * this platform; an external reviewer has none. The token is the entire
 * authorization, which is why it is checked this thoroughly.
 */
export async function validateExternalReviewAccess(
  reviewId: string,
  token: string,
  tx: DbLike = db,
): Promise<ApprovalContext> {
  let claims: { reviewId: string; externalEmail: string };
  try {
    claims = await verifyExternalReviewToken(token);
  } catch {
    throw new ApprovalAccessError();
  }

  if (claims.reviewId !== reviewId) throw new ApprovalAccessError();

  const context = await loadReviewContext(reviewId, tx);
  if (!context) throw new ApprovalAccessError();

  const { review } = context;
  if (!review.externalToken || !review.externalEmail) {
    throw new ApprovalAccessError();
  }
  if (!timingSafeCompare(review.externalToken, token)) {
    throw new ApprovalAccessError();
  }
  if (!timingSafeCompare(review.externalEmail, claims.externalEmail)) {
    throw new ApprovalAccessError();
  }

  return context;
}

/** A condition plus the review/stage/cycle chain that owns it. */
export type ConditionContext = ApprovalContext & {
  readonly condition: typeof approvalConditions.$inferSelect;
};

/**
 * Internal caller resolving a condition.
 *
 * `approvals.approve` rather than `review`: resolving the last outstanding
 * condition is what lets `ApprovalEngine.evaluateCycle()` move the cycle to
 * `approved`. Whoever can do that is approving, whatever the button says. Of
 * the seven system roles, `owner`, `super_admin` and `creative_director` hold
 * it; `project_manager` holds `["read","create","review"]` and so cannot, which
 * is the conservative reading and the one this hotfix ships. If the product
 * wants PMs to sign conditions off, that is a permission-map change with a test,
 * not a weaker check here.
 *
 * No reviewer-authority check: the person confirming a condition was met is
 * normally the team, not the reviewer who raised it.
 */
export async function validateInternalConditionAccess(
  conditionId: string,
  user: CurrentUser,
  tx: DbLike = db,
): Promise<ConditionContext> {
  requirePermission(user.permissions, "approvals", "approve");

  const context = await loadConditionContext(conditionId, tx);
  if (!context) throw new ApprovalAccessError();

  if (context.cycle.organizationId !== user.organizationId) {
    throw new ApprovalAccessError();
  }

  return context;
}

/**
 * External caller resolving a condition, by bearer token.
 *
 * The token model signs a *review* id, and a condition belongs to exactly one
 * review — so the binding required by CRIT-1 point 4 is: resolve the condition
 * first, then require the token to be valid for that condition's own parent
 * review. A token for review A cannot resolve a condition hanging off review B,
 * and a token cannot resolve a condition it has no relationship to at all.
 *
 * Nothing new is invented here: it reuses `validateExternalReviewAccess`
 * unchanged, which is the mechanism `/api/approvals/verify` already defines.
 */
export async function validateExternalConditionAccess(
  conditionId: string,
  token: string,
  tx: DbLike = db,
): Promise<ConditionContext> {
  const context = await loadConditionContext(conditionId, tx);
  if (!context) throw new ApprovalAccessError();

  // Binds the token to this condition through its parent review. Throws the
  // same refusal on every failure, so a caller cannot tell a bad token from a
  // condition that does not exist.
  await validateExternalReviewAccess(context.condition.reviewId, token, tx);

  return context;
}

/**
 * Confirms a workflow belongs to the caller's organisation.
 *
 * `createApprovalCycle` stamps the cycle with the caller's own organisation, so
 * the cycle itself cannot land in another tenant — but `workflowId` is a
 * caller-supplied foreign key into a tenant-scoped table, and an unchecked one
 * would let a cycle in org A be routed by org B's workflow rules.
 */
export async function requireWorkflowInOrganization(
  workflowId: string,
  user: CurrentUser,
  tx: DbLike = db,
): Promise<void> {
  const workflow = await tx.query.approvalWorkflows.findFirst({
    where: (table, { eq: equals, and: both }) =>
      both(
        equals(table.workflowId, workflowId),
        equals(table.organizationId, user.organizationId),
      ),
    columns: { workflowId: true },
  });

  if (!workflow) throw new ApprovalAccessError();
}
