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

export type CorrectionStatusCounts = Record<CorrectionStatus, number>;

export interface CorrectionListResult {
  rows: CorrectionListItem[];
  total: number;
  counts: CorrectionStatusCounts;
}
