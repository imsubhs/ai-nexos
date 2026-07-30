/**
 * DemoStore-backed CorrectionRepository (merge doc 15 §0 demo contract).
 * Reads/writes the live `attendanceCorrections` collection so demo sessions
 * behave like a database: submits appear in mine + the review queue, decisions
 * persist, cancels leave the queue. Never returns hardcoded results.
 */
import {
  getDemoStore,
  logDemoActivity,
  nextDemoCode,
  nextDemoId,
} from "@/lib/demo/store";
import type {
  AttendanceStatus,
  CorrectionStatus,
  CorrectionType,
} from "../shared/enums";
import { CORRECTION_STATUSES } from "../shared/enums";
import {
  CorrectionError,
  type CorrectionListFilters,
  type CorrectionRepository,
  type CreateCorrectionData,
  type ReviewDecisionData,
} from "./repository";
import type {
  CorrectionDetail,
  CorrectionListItem,
  CorrectionListResult,
  CorrectionStatusCounts,
  CorrectionTimelineEntry,
} from "./types";

type DemoCorrection = {
  correctionId: string;
  organizationId: string;
  correctionCode: string;
  userId: string;
  date: string;
  correctionType: CorrectionType;
  requestedClockInAt: string | null;
  requestedClockOutAt: string | null;
  requestedStatus: AttendanceStatus | null;
  reason: string;
  evidenceUrl: string | null;
  status: CorrectionStatus;
  approvalCycleId: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  appliedAt: string | null;
  createdAt: Date | string;
};

type DemoUser = { userId: string; firstName: string; lastName: string | null };
type DemoDomainEvent = {
  eventId: string;
  organizationId: string;
  eventName: string;
  aggregateId: string;
  actorId: string | null;
  payload: Record<string, unknown>;
  createdAt: Date | string;
};

function toIso(value: Date | string | null): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function corrections(): DemoCorrection[] {
  return getDemoStore().attendanceCorrections as DemoCorrection[];
}

function userName(userId: string): string {
  const u = (getDemoStore().users as DemoUser[]).find(
    (x) => x.userId === userId,
  );
  return u ? [u.firstName, u.lastName].filter(Boolean).join(" ") : "Unknown";
}

function timelineFor(
  organizationId: string,
  correctionId: string,
): CorrectionTimelineEntry[] {
  const events = getDemoStore().domainEvents as DemoDomainEvent[];
  return events
    .filter(
      (e) =>
        e.organizationId === organizationId && e.aggregateId === correctionId,
    )
    .map((e) => ({
      eventId: e.eventId,
      eventName: e.eventName,
      at: toIso(e.createdAt) as string,
      actorId: e.actorId ?? null,
      payload: e.payload ?? {},
    }))
    .sort((a, b) => a.at.localeCompare(b.at));
}

function toListItem(c: DemoCorrection): CorrectionListItem {
  return {
    correctionId: c.correctionId,
    correctionCode: c.correctionCode,
    userId: c.userId,
    employeeName: userName(c.userId),
    date: c.date,
    correctionType: c.correctionType,
    status: c.status,
    reason: c.reason,
    createdAt: toIso(c.createdAt) as string,
    reviewedAt: toIso(c.reviewedAt),
  };
}

function toDetail(c: DemoCorrection): CorrectionDetail {
  return {
    ...toListItem(c),
    requestedClockInAt: toIso(c.requestedClockInAt),
    requestedClockOutAt: toIso(c.requestedClockOutAt),
    requestedStatus: c.requestedStatus,
    evidenceUrl: c.evidenceUrl,
    approvalCycleId: c.approvalCycleId,
    reviewedBy: c.reviewedBy,
    reviewerName: c.reviewedBy ? userName(c.reviewedBy) : null,
    reviewNote: c.reviewNote,
    appliedAt: toIso(c.appliedAt),
    timeline: timelineFor(c.organizationId, c.correctionId),
  };
}

function emptyCounts(): CorrectionStatusCounts {
  return CORRECTION_STATUSES.reduce((acc, s) => {
    acc[s] = 0;
    return acc;
  }, {} as CorrectionStatusCounts);
}

function paginate(
  rows: DemoCorrection[],
  filters: CorrectionListFilters,
): CorrectionListResult {
  const counts = emptyCounts();
  for (const r of rows) counts[r.status] += 1;
  let filtered = rows;
  if (filters.status) filtered = filtered.filter((r) => r.status === filters.status);
  filtered = [...filtered].sort((a, b) =>
    (toIso(b.createdAt) ?? "").localeCompare(toIso(a.createdAt) ?? ""),
  );
  const total = filtered.length;
  const start = (filters.page - 1) * filters.pageSize;
  return {
    rows: filtered.slice(start, start + filters.pageSize).map(toListItem),
    total,
    counts,
  };
}

function requireCorrection(
  organizationId: string,
  correctionId: string,
): DemoCorrection {
  const c = corrections().find(
    (x) => x.correctionId === correctionId && x.organizationId === organizationId,
  );
  if (!c) {
    throw new CorrectionError("correction/not-found", "Correction not found.");
  }
  return c;
}

export const mockCorrectionRepository: CorrectionRepository = {
  async create(organizationId, actorUserId, data: CreateCorrectionData) {
    const store = getDemoStore();
    const record: DemoCorrection = {
      correctionId: nextDemoId(store),
      organizationId,
      correctionCode: nextDemoCode(store, "COR"),
      userId: data.userId,
      date: data.date,
      correctionType: data.correctionType,
      requestedClockInAt: data.requestedClockInAt ?? null,
      requestedClockOutAt: data.requestedClockOutAt ?? null,
      requestedStatus: data.requestedStatus ?? null,
      reason: data.reason,
      evidenceUrl: data.evidenceUrl ?? null,
      status: "PENDING",
      approvalCycleId: data.approvalCycleId ?? null,
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      appliedAt: null,
      createdAt: new Date(),
    };
    store.attendanceCorrections.push(record);
    logDemoActivity(
      store,
      "corrections",
      "create",
      "correction",
      record.correctionId,
      `Submitted correction ${record.correctionCode} for ${data.date}`,
      { correctionType: data.correctionType },
    );
    return toDetail(record);
  },

  async findById(organizationId, correctionId) {
    const c = corrections().find(
      (x) =>
        x.correctionId === correctionId && x.organizationId === organizationId,
    );
    return c ? toDetail(c) : null;
  },

  async hasOpenForDate(organizationId, userId, date) {
    return corrections().some(
      (c) =>
        c.organizationId === organizationId &&
        c.userId === userId &&
        c.date === date &&
        (c.status === "PENDING" || c.status === "UNDER_REVIEW"),
    );
  },

  async listForUser(organizationId, userId, filters) {
    const rows = corrections().filter(
      (c) => c.organizationId === organizationId && c.userId === userId,
    );
    return paginate(rows, filters);
  },

  async listQueue(organizationId, scopeUserIds, filters) {
    let rows = corrections().filter((c) => c.organizationId === organizationId);
    if (scopeUserIds) {
      const scope = new Set(scopeUserIds);
      rows = rows.filter((c) => scope.has(c.userId));
    }
    if (filters.departmentId) {
      const usersInDept = new Set(
        (getDemoStore().users as { userId: string; departmentId: string | null }[])
          .filter((u) => u.departmentId === filters.departmentId)
          .map((u) => u.userId),
      );
      rows = rows.filter((c) => usersInDept.has(c.userId));
    }
    return paginate(rows, filters);
  },

  async markUnderReview(organizationId, actorUserId, correctionId) {
    const c = requireCorrection(organizationId, correctionId);
    if (c.status === "PENDING") c.status = "UNDER_REVIEW";
    logDemoActivity(
      getDemoStore(),
      "corrections",
      "update",
      "correction",
      correctionId,
      `Marked correction ${c.correctionCode} under review`,
    );
    return toDetail(c);
  },

  async cancel(organizationId, actorUserId, correctionId) {
    const c = requireCorrection(organizationId, correctionId);
    c.status = "CANCELLED";
    logDemoActivity(
      getDemoStore(),
      "corrections",
      "update",
      "correction",
      correctionId,
      `Cancelled correction ${c.correctionCode}`,
    );
    return toDetail(c);
  },

  async applyDecision(organizationId, correctionId, data: ReviewDecisionData) {
    const c = requireCorrection(organizationId, correctionId);
    c.status = data.decision;
    c.reviewedBy = data.reviewedBy;
    c.reviewedAt = data.reviewedAt;
    c.reviewNote = data.reviewNote ?? null;
    // appliedAt is stamped by markApplied after the C-9 AttendanceDay amendment
    // (Sprint 4B) — separate step so a skipped amendment never un-approves.
    logDemoActivity(
      getDemoStore(),
      "corrections",
      "review",
      "correction",
      correctionId,
      `${data.decision === "APPROVED" ? "Approved" : "Rejected"} correction ${c.correctionCode}`,
      { decision: data.decision },
    );
    return toDetail(c);
  },

  async markApplied(organizationId, correctionId, appliedAt) {
    const c = requireCorrection(organizationId, correctionId);
    c.appliedAt = appliedAt;
    logDemoActivity(
      getDemoStore(),
      "corrections",
      "update",
      "correction",
      correctionId,
      `Applied correction ${c.correctionCode} to attendance`,
      { appliedAt },
    );
    return toDetail(c);
  },
};
