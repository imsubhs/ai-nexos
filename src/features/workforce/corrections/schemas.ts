/**
 * Corrections slice DTO validation (merge doc 14 §14, doc 15 CO-1…CO-7).
 * Self-scoped on submit/cancel (actor = CurrentUser); review is scope-checked
 * in the action, never here.
 */
import { z } from "zod";
import {
  CORRECTION_REQUESTABLE_STATUSES,
  CORRECTION_TYPES,
} from "../shared/enums";

/** CO-1 submitCorrection — type-conditional requireds enforced via refine. */
export const submitCorrectionSchema = z
  .object({
    date: z.iso.date(),
    correctionType: z.enum(CORRECTION_TYPES),
    requestedClockInAt: z.iso.datetime().optional(),
    requestedClockOutAt: z.iso.datetime().optional(),
    requestedStatus: z.enum(CORRECTION_REQUESTABLE_STATUSES).optional(),
    reason: z.string().min(10).max(1000),
    evidenceUrl: z.string().url().optional(),
  })
  .superRefine((v, ctx) => {
    const needIn =
      v.correctionType === "LOGIN_TIME" || v.correctionType === "BOTH";
    const needOut =
      v.correctionType === "LOGOUT_TIME" || v.correctionType === "BOTH";
    if (needIn && !v.requestedClockInAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["requestedClockInAt"],
        message: "A requested clock-in time is required for this correction type.",
      });
    }
    if (needOut && !v.requestedClockOutAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["requestedClockOutAt"],
        message: "A requested clock-out time is required for this correction type.",
      });
    }
    if (v.correctionType === "STATUS_CHANGE" && !v.requestedStatus) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["requestedStatus"],
        message: "A requested status is required for a status-change correction.",
      });
    }
    if (
      v.requestedClockInAt &&
      v.requestedClockOutAt &&
      new Date(v.requestedClockOutAt).getTime() <=
        new Date(v.requestedClockInAt).getTime()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["requestedClockOutAt"],
        message: "Requested clock-out must be after requested clock-in.",
      });
    }
  });
export type SubmitCorrectionInput = z.input<typeof submitCorrectionSchema>;

export const cancelCorrectionSchema = z.object({
  correctionId: z.string().uuid(),
});
export type CancelCorrectionInput = z.input<typeof cancelCorrectionSchema>;

export const getCorrectionSchema = z.object({
  correctionId: z.string().uuid(),
});
export type GetCorrectionInput = z.input<typeof getCorrectionSchema>;

export const listMyCorrectionsSchema = z.object({
  status: z
    .enum(["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "CANCELLED"])
    .optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z
    .union([z.literal(10), z.literal(25), z.literal(50), z.literal(100)])
    .default(25),
});
export type ListMyCorrectionsInput = z.input<typeof listMyCorrectionsSchema>;

export const listReviewQueueSchema = z.object({
  status: z
    .enum(["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "CANCELLED"])
    .optional(),
  departmentId: z.string().uuid().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z
    .union([z.literal(10), z.literal(25), z.literal(50), z.literal(100)])
    .default(25),
});
export type ListReviewQueueInput = z.input<typeof listReviewQueueSchema>;

/** CO-6 reviewCorrection — reject requires a note (doc 14 §14). */
export const reviewCorrectionSchema = z
  .object({
    correctionId: z.string().uuid(),
    decision: z.enum(["APPROVED", "REJECTED"]),
    reviewNote: z.string().max(1000).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.decision === "REJECTED" && (!v.reviewNote || v.reviewNote.trim().length < 5)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reviewNote"],
        message: "A review note (min 5 characters) is required to reject.",
      });
    }
  });
export type ReviewCorrectionInput = z.input<typeof reviewCorrectionSchema>;

export const markUnderReviewSchema = z.object({
  correctionId: z.string().uuid(),
});
export type MarkUnderReviewInput = z.input<typeof markUnderReviewSchema>;
