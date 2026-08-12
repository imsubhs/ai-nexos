/**
 * Correction read models (merge doc 14 §12.6). A CorrectionRequest is the
 * workforce-facing projection of an M09 approval cycle (§8.2); this slice
 * owns the domain record, M09 owns the process record.
 */
import type {
  AttendanceStatus,
  CorrectionStatus,
  CorrectionType,
} from "../shared/enums";
import type { TodayAttendanceView } from "../attendance/types";

export interface CorrectionListItem {
  correctionId: string;
  correctionCode: string;
  userId: string;
  employeeName: string;
  date: string;
  correctionType: CorrectionType;
  status: CorrectionStatus;
  reason: string;
  createdAt: string;
  reviewedAt: string | null;
}

/** One timeline entry (doc 14 §11.4) — L3 events correlated by correctionId. */
export interface CorrectionTimelineEntry {
  eventId: string;
  eventName: string;
  at: string;
  actorId: string | null;
  payload: Record<string, unknown>;
}

export interface CorrectionDetail extends CorrectionListItem {
  requestedClockInAt: string | null;
  requestedClockOutAt: string | null;
  requestedStatus: AttendanceStatus | null;
  evidenceUrl: string | null;
  approvalCycleId: string | null;
  reviewedBy: string | null;
  reviewerName: string | null;
  reviewNote: string | null;
  appliedAt: string | null;
  timeline: CorrectionTimelineEntry[];
}

/**
 * What a reviewer needs on screen to decide: the request, and the stored
 * AttendanceDay it would amend.
 *
 * `dayVisible` distinguishes "there is no record for that date" from "you may
 * not see that record" — collapsing the two into `day: null` would tell a
 * reviewer without `attendance.view_team` that an existing day does not exist.
 */
export interface ReviewContext {
  correction: CorrectionDetail;
  day: TodayAttendanceView | null;
  dayVisible: boolean;
}

export type CorrectionStatusCounts = Record<CorrectionStatus, number>;

export interface CorrectionListResult {
  rows: CorrectionListItem[];
  total: number;
  counts: CorrectionStatusCounts;
}
