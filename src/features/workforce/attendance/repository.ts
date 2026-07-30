/**
 * AttendanceRepository (merge doc 14 §13.1) — the write + read surface for
 * the AttendanceDay aggregate (attendance_records ⋈ attendance_breaks).
 *
 * Sprint 3A foundation: clock lifecycle (create/finalize/breaks), the
 * organization-scoped directory, and detail/status reads. Range history,
 * summary aggregation, and team-scope resolution land in later WPs
 * (WP-112 / WP-130) and are intentionally absent here.
 *
 * Implementations: mock-repository.ts (DemoStore) and real-repository.ts
 * (Drizzle; runtime wiring in Phase 7). Every method takes organizationId
 * first — org scoping is a repository invariant, never a caller option.
 */
import type { AttendanceStatus } from "../shared/enums";
import type { ClockContext } from "../shared/types";
import type {
  AttendanceDetail,
  AttendanceListResult,
  AttendanceMetrics,
  AttendanceTimelineEntry,
  BreakView,
  TodayAttendanceView,
} from "./types";

/** Domain-rule violations — actions surface `.message` (stable keys). */
export class AttendanceError extends Error {
  constructor(
    /** Stable machine key, e.g. "attendance/already-clocked-in". */
    public readonly key: string,
    message: string,
  ) {
    super(message);
    this.name = "AttendanceError";
  }
}

export interface CreateDayData {
  userId: string;
  date: string;
  clockInAt: string;
  status: AttendanceStatus;
  isLate: boolean;
  wfh: boolean;
  clockInContext: ClockContext;
}

export interface FinalizeDayData {
  clockOutAt: string;
  status: AttendanceStatus;
  isLate: boolean;
  metrics: AttendanceMetrics;
  clockOutContext: ClockContext;
  notes?: string;
}

/**
 * The write payload for the C-9 correction amendment (Sprint 4B). Unlike
 * finalize, an amend may adjust clock-in and does not touch breaks — it
 * re-persists the engine-recomputed metrics + status over an existing (usually
 * already-finalized) day. `reason` is the correction code for the audit trail.
 */
export interface AmendDayData {
  clockInAt: string;
  clockOutAt: string | null;
  status: AttendanceStatus;
  isLate: boolean;
  metrics: AttendanceMetrics;
  reason: string;
}

export interface AttendanceDirectoryFilters {
  date?: string;
  departmentId?: string;
  userId?: string;
  status?: AttendanceStatus;
  page: number;
  pageSize: number;
}

export interface AttendanceRepository {
  /** The AttendanceDay for (org, user, date), or null if no row exists. */
  findDay(
    organizationId: string,
    userId: string,
    date: string,
  ): Promise<TodayAttendanceView | null>;
  /** The user's currently open (WORKING/ON_BREAK) day, if any. */
  findOpenDay(
    organizationId: string,
    userId: string,
  ): Promise<TodayAttendanceView | null>;
  createDay(
    organizationId: string,
    actorUserId: string,
    data: CreateDayData,
  ): Promise<TodayAttendanceView>;
  /** Clock-out: close any open break, finalize metrics + terminal status. */
  finalizeDay(
    organizationId: string,
    actorUserId: string,
    attendanceId: string,
    data: FinalizeDayData,
  ): Promise<TodayAttendanceView>;
  /**
   * C-9 apply-on-approve (Sprint 4B): re-persist an amended day's
   * engine-recomputed metrics/status/isLate + adjusted clock times. Does not
   * close breaks. Returns the refreshed day view.
   */
  amendDay(
    organizationId: string,
    actorUserId: string,
    attendanceId: string,
    data: AmendDayData,
  ): Promise<TodayAttendanceView>;
  addBreak(
    organizationId: string,
    actorUserId: string,
    attendanceId: string,
    startAt: string,
    kind: string,
  ): Promise<BreakView>;
  closeBreak(
    organizationId: string,
    actorUserId: string,
    attendanceId: string,
    endAt: string,
  ): Promise<BreakView>;
  /** Organization-scoped attendance directory (paginated, filtered). */
  list(
    organizationId: string,
    filters: AttendanceDirectoryFilters,
  ): Promise<AttendanceListResult>;
  findById(
    organizationId: string,
    attendanceId: string,
  ): Promise<AttendanceDetail | null>;
  /**
   * Timeline projection (doc 14 §11.4) — the L3 domain events for this
   * AttendanceDay, correlated by attendanceId, oldest first.
   */
  listTimeline(
    organizationId: string,
    attendanceId: string,
  ): Promise<AttendanceTimelineEntry[]>;
}
