/**
 * CorrectionRepository (merge doc 14 §13.1) — the write + read surface for the
 * CorrectionRequest aggregate (attendance_corrections). Org scoping is a
 * repository invariant (organizationId first on every method).
 *
 * Sprint 3B scope: the request lifecycle (submit → cancel / review decide) and
 * the mine/queue/detail reads. The C-9 apply-to-AttendanceDay amendment
 * (recompute metrics) is intentionally NOT here — it depends on the deferred
 * work-validation engine and must not touch the interim finalizer. `appliedAt`
 * therefore stays null until Sprint 4 lands the amendment path.
 */
import type { AttendanceStatus, CorrectionType } from "../shared/enums";
import type {
  CorrectionDetail,
  CorrectionListItem,
  CorrectionListResult,
} from "./types";

/** Domain-rule violations — actions surface `.message` (stable keys). */
export class CorrectionError extends Error {
  constructor(
    public readonly key: string,
    message: string,
  ) {
    super(message);
    this.name = "CorrectionError";
  }
}

export interface CreateCorrectionData {
  userId: string;
  date: string;
  correctionType: CorrectionType;
  requestedClockInAt?: string;
  requestedClockOutAt?: string;
  requestedStatus?: AttendanceStatus;
  reason: string;
  evidenceUrl?: string;
  /** M09 cycle opened by the action (reused, not built here). */
  approvalCycleId?: string;
}

export interface CorrectionListFilters {
  status?: CorrectionListItem["status"];
  departmentId?: string;
  page: number;
  pageSize: number;
}

export interface ReviewDecisionData {
  decision: "APPROVED" | "REJECTED";
  reviewNote?: string;
  reviewedBy: string;
  reviewedAt: string;
}

export interface CorrectionRepository {
  create(
    organizationId: string,
    actorUserId: string,
    data: CreateCorrectionData,
  ): Promise<CorrectionDetail>;
  findById(
    organizationId: string,
    correctionId: string,
  ): Promise<CorrectionDetail | null>;
  /** True when the user already has a non-terminal request for `date`. */
  hasOpenForDate(
    organizationId: string,
    userId: string,
    date: string,
  ): Promise<boolean>;
  listForUser(
    organizationId: string,
    userId: string,
    filters: CorrectionListFilters,
  ): Promise<CorrectionListResult>;
  listQueue(
    organizationId: string,
    scopeUserIds: string[] | null,
    filters: CorrectionListFilters,
  ): Promise<CorrectionListResult>;
  markUnderReview(
    organizationId: string,
    actorUserId: string,
    correctionId: string,
  ): Promise<CorrectionDetail>;
  cancel(
    organizationId: string,
    actorUserId: string,
    correctionId: string,
  ): Promise<CorrectionDetail>;
  applyDecision(
    organizationId: string,
    correctionId: string,
    data: ReviewDecisionData,
  ): Promise<CorrectionDetail>;
  /**
   * C-9 (Sprint 4B): stamp `appliedAt` once the approved correction has been
   * applied to its AttendanceDay (engine recompute). Separate from
   * applyDecision so the amendment can fail/skip without un-approving.
   */
  markApplied(
    organizationId: string,
    correctionId: string,
    appliedAt: string,
  ): Promise<CorrectionDetail>;
}
