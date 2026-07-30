/**
 * Shared corrections action pipeline (Sprint 3B). Binds the request lifecycle
 * to a CorrectionRepository; real/mock differ only in that binding.
 *
 * Side-effect order (doc 15 §0): validate → repository write → audit (L2, at
 * repo write site) → publish L3 event → notify consumer (demo) → revalidate.
 * Notifications/search are consumers of the L3 events (doc 14 §11.3 / §11.5).
 *
 * Deferred by scope (NOT built here): the C-9 apply-to-AttendanceDay amendment
 * + metric recompute (needs the work-validation engine; must not touch the
 * interim finalizer), full M09 cycle/subject-registry integration, and the
 * TeamScopeResolver (queue is org-wide for reviewers this sprint — owner/
 * super_admin/hr are org-wide anyway, doc 14 §10.2).
 */
import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/features/auth/current-user";
import { hasPermission, requirePermission } from "@/features/permissions";
import { publishDomainEvent } from "@/features/events/domain-publisher";
import { getDemoStore } from "@/lib/demo/store";
import { resolveWorkforcePolicy } from "../shared/policy-resolver";
import { ensureWorkforceHandlersRegistered } from "../events/handlers";
import {
  applyApprovedCorrection,
  type AttendanceAmendPort,
} from "./apply-correction";
import { CORRECTION_EVENTS } from "./events";
import { notifyCorrectionDecision, notifyCorrectionSubmitted } from "./notify";
import { CorrectionError, type CorrectionRepository } from "./repository";
import { assertTransition } from "./state-machine";
import {
  cancelCorrectionSchema,
  getCorrectionSchema,
  listMyCorrectionsSchema,
  listReviewQueueSchema,
  markUnderReviewSchema,
  reviewCorrectionSchema,
  submitCorrectionSchema,
  type CancelCorrectionInput,
  type GetCorrectionInput,
  type ListMyCorrectionsInput,
  type ListReviewQueueInput,
  type MarkUnderReviewInput,
  type ReviewCorrectionInput,
  type SubmitCorrectionInput,
} from "./schemas";
import type { CorrectionDetail, CorrectionListResult } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function nowIso(): string {
  return new Date().toISOString();
}

/** Reviewer ids for the demo notification consumer (roles with review, §9). */
function demoReviewerIds(organizationId: string): string[] {
  if (process.env.DEMO_MODE !== "true") return [];
  const users = getDemoStore().users as {
    userId: string;
    organizationId: string;
    roleId: string;
  }[];
  return users
    .filter(
      (u) =>
        u.organizationId === organizationId &&
        (u.roleId.includes("owner") ||
          u.roleId.includes("super_admin") ||
          u.roleId.includes("hr")),
    )
    .map((u) => u.userId);
}

async function publishCorrectionEvent(
  organizationId: string,
  actorId: string,
  correctionId: string,
  eventName: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await publishDomainEvent({
    organizationId,
    eventType: "correction",
    eventName,
    aggregateType: "attendance_correction",
    aggregateId: correctionId,
    actorId,
    correlationId: correctionId,
    payload,
  });
}

export function buildCorrectionActions(
  repo: CorrectionRepository,
  /**
   * Sprint 4B: the attendance amend port for C-9 apply-on-approve. Optional so
   * existing callers/tests that never approve keep compiling; when absent, an
   * approval is recorded but no AttendanceDay amendment runs.
   */
  attendance?: AttendanceAmendPort,
) {
  // Ensure the read-model projection handler is wired before an amendment
  // publishes attendance.amended (idempotent).
  ensureWorkforceHandlersRegistered();
  return {
    /** CO-1 submitCorrection (C-5) — permission `corrections.create`, self. */
    async submit(input: SubmitCorrectionInput): Promise<CorrectionDetail> {
      const user = await requireCurrentUser();
      requirePermission(user.permissions, "corrections", "create");
      const data = submitCorrectionSchema.parse(input);

      // Window policy 10.5: past date only, within correctionWindowDays.
      const policy = resolveWorkforcePolicy();
      const target = new Date(`${data.date}T00:00:00.000Z`).getTime();
      const todayMs = new Date(`${today()}T00:00:00.000Z`).getTime();
      if (target >= todayMs) {
        throw new CorrectionError(
          "correction/date-not-past",
          "Corrections can only be requested for past dates.",
        );
      }
      if (todayMs - target > policy.correctionWindowDays * DAY_MS) {
        throw new CorrectionError(
          "correction/window-expired",
          `Corrections must be requested within ${policy.correctionWindowDays} days.`,
        );
      }
      if (
        await repo.hasOpenForDate(user.organizationId, user.userId, data.date)
      ) {
        throw new CorrectionError(
          "correction/duplicate-open",
          "You already have an open correction request for this date.",
        );
      }

      const detail = await repo.create(user.organizationId, user.userId, {
        userId: user.userId,
        date: data.date,
        correctionType: data.correctionType,
        requestedClockInAt: data.requestedClockInAt,
        requestedClockOutAt: data.requestedClockOutAt,
        requestedStatus: data.requestedStatus,
        reason: data.reason,
        evidenceUrl: data.evidenceUrl,
      });

      await publishCorrectionEvent(
        user.organizationId,
        user.userId,
        detail.correctionId,
        CORRECTION_EVENTS.requested,
        {
          userId: user.userId,
          date: data.date,
          correctionType: data.correctionType,
        },
      );
      notifyCorrectionSubmitted(
        user.organizationId,
        detail,
        demoReviewerIds(user.organizationId),
      );

      revalidatePath("/workforce/corrections");
      revalidatePath("/workforce/corrections/review");
      return detail;
    },

    /** CO-2 cancelCorrection (C-6) — owner of an open request only. */
    async cancel(input: CancelCorrectionInput): Promise<CorrectionDetail> {
      const user = await requireCurrentUser();
      requirePermission(user.permissions, "corrections", "create");
      const { correctionId } = cancelCorrectionSchema.parse(input);

      const existing = await repo.findById(user.organizationId, correctionId);
      if (!existing) {
        throw new CorrectionError(
          "correction/not-found",
          "Correction not found.",
        );
      }
      if (existing.userId !== user.userId) {
        throw new CorrectionError(
          "correction/not-owner",
          "You can only cancel your own correction requests.",
        );
      }
      assertTransition(existing.status, "cancel");

      const detail = await repo.cancel(
        user.organizationId,
        user.userId,
        correctionId,
      );
      await publishCorrectionEvent(
        user.organizationId,
        user.userId,
        correctionId,
        CORRECTION_EVENTS.cancelled,
        { userId: user.userId },
      );

      revalidatePath("/workforce/corrections");
      revalidatePath("/workforce/corrections/review");
      return detail;
    },

    /** CO-7 markCorrectionUnderReview — `corrections.review`, idempotent. */
    async markUnderReview(
      input: MarkUnderReviewInput,
    ): Promise<CorrectionDetail> {
      const user = await requireCurrentUser();
      requirePermission(user.permissions, "corrections", "review");
      const { correctionId } = markUnderReviewSchema.parse(input);

      const existing = await repo.findById(user.organizationId, correctionId);
      if (!existing) {
        throw new CorrectionError(
          "correction/not-found",
          "Correction not found.",
        );
      }
      if (existing.userId === user.userId) {
        throw new CorrectionError(
          "correction/self-review",
          "You cannot review your own correction request.",
        );
      }
      assertTransition(existing.status, "markUnderReview");
      const wasPending = existing.status === "PENDING";

      const detail = await repo.markUnderReview(
        user.organizationId,
        user.userId,
        correctionId,
      );
      if (wasPending) {
        await publishCorrectionEvent(
          user.organizationId,
          user.userId,
          correctionId,
          CORRECTION_EVENTS.underReview,
          { reviewerId: user.userId },
        );
      }

      revalidatePath("/workforce/corrections/review");
      return detail;
    },

    /** CO-6 reviewCorrection (C-8) — `corrections.review`, never own. */
    async review(input: ReviewCorrectionInput): Promise<CorrectionDetail> {
      const user = await requireCurrentUser();
      requirePermission(user.permissions, "corrections", "review");
      const data = reviewCorrectionSchema.parse(input);

      const existing = await repo.findById(
        user.organizationId,
        data.correctionId,
      );
      if (!existing) {
        throw new CorrectionError(
          "correction/not-found",
          "Correction not found.",
        );
      }
      if (existing.userId === user.userId) {
        throw new CorrectionError(
          "correction/self-review",
          "You cannot review your own correction request.",
        );
      }
      assertTransition(existing.status, "review");

      let detail = await repo.applyDecision(
        user.organizationId,
        data.correctionId,
        {
          decision: data.decision,
          reviewNote: data.reviewNote,
          reviewedBy: user.userId,
          reviewedAt: nowIso(),
        },
      );

      // C-9 apply-on-approve (Sprint 4B): amend the AttendanceDay and recompute
      // its metrics through the frozen engine, then stamp appliedAt. Approval
      // stands even if there is no day to amend (result.applied === false).
      if (data.decision === "APPROVED" && attendance) {
        const result = await applyApprovedCorrection({
          organizationId: user.organizationId,
          actorId: user.userId,
          correction: detail,
          attendance,
        });
        if (result.applied && result.appliedAt) {
          detail = await repo.markApplied(
            user.organizationId,
            data.correctionId,
            result.appliedAt,
          );
        }
      }

      await publishCorrectionEvent(
        user.organizationId,
        user.userId,
        data.correctionId,
        data.decision === "APPROVED"
          ? CORRECTION_EVENTS.approved
          : CORRECTION_EVENTS.rejected,
        { reviewerId: user.userId, decision: data.decision },
      );
      notifyCorrectionDecision(user.organizationId, detail);

      revalidatePath("/workforce/corrections");
      revalidatePath("/workforce/corrections/review");
      revalidatePath("/workforce/history");
      revalidatePath("/workforce/attendance");
      revalidatePath("/dashboard");
      return detail;
    },

    /** CO-3 listMyCorrections (Q-4) — own rows, `corrections.create`. */
    async listMine(
      input: ListMyCorrectionsInput = {},
    ): Promise<CorrectionListResult> {
      const user = await requireCurrentUser();
      requirePermission(user.permissions, "corrections", "create");
      const filters = listMyCorrectionsSchema.parse(input);
      return repo.listForUser(user.organizationId, user.userId, filters);
    },

    /** CO-4 getCorrection (Q-5) — owner-or-reviewer (policy 10.3). */
    async get(input: GetCorrectionInput): Promise<CorrectionDetail | null> {
      const user = await requireCurrentUser();
      requirePermission(user.permissions, "corrections", "read");
      const { correctionId } = getCorrectionSchema.parse(input);
      const detail = await repo.findById(user.organizationId, correctionId);
      if (!detail) return null;
      const isOwner = detail.userId === user.userId;
      const isReviewer = hasPermission(
        user.permissions,
        "corrections",
        "review",
      );
      if (!isOwner && !isReviewer) {
        throw new CorrectionError(
          "correction/forbidden",
          "You do not have access to this correction request.",
        );
      }
      return detail;
    },

    /** CO-5 listCorrectionReviewQueue (Q-6) — `corrections.review`. */
    async listQueue(
      input: ListReviewQueueInput = {},
    ): Promise<CorrectionListResult> {
      const user = await requireCurrentUser();
      requirePermission(user.permissions, "corrections", "review");
      const filters = listReviewQueueSchema.parse(input);
      // TeamScopeResolver (WP-121) is deferred; org-wide queue for now.
      return repo.listQueue(user.organizationId, null, filters);
    },
  };
}
