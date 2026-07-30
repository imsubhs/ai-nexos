/**
 * Shared attendance action pipeline (Sprint 3A). real-actions/mock-actions
 * differ only in the repository they bind, so the pipeline — auth preamble →
 * permission gate → DTO validation → repository write → L3 event publish →
 * path revalidation (doc 15 §0 side-effect order) — lives once here.
 *
 * Self-scoped commands: the actor is always CurrentUser; no caller-supplied
 * userId is accepted for clock commands (doc 15 §0). Reads (directory/detail)
 * are organization-scoped via CurrentUser.organizationId.
 *
 * Audit (L2, doc 14 §11.2) is written by the repository adapter at the write
 * site (demo: logDemoActivity; real: Phase 7 db insert) — the same posture as
 * the employee-admin slice. Notifications/search are consumers of the L3
 * events emitted here, never called directly (doc 14 §11.3 / §11.5).
 */
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireCurrentUser } from "@/features/auth/current-user";
import { requirePermission } from "@/features/permissions";
import { publishDomainEvent } from "@/features/events/domain-publisher";
import type { ClockContext, TimePeriod } from "../shared/types";
import { DEFAULT_WORKFORCE_POLICY } from "../shared/types";
import { deriveIsLate, recomputeDay } from "./clock-service";
import { ensureWorkforceHandlersRegistered } from "../events/handlers";
import { ATTENDANCE_EVENTS } from "./events";
import { AttendanceError, type AttendanceRepository } from "./repository";
import { assertTransition } from "./state-machine";
import {
  clockInSchema,
  clockOutSchema,
  getAttendanceSchema,
  listAttendanceSchema,
  startBreakSchema,
  type ClockInInput,
  type ClockOutInput,
  type GetAttendanceInput,
  type ListAttendanceInput,
  type StartBreakInput,
} from "./schemas";
import type {
  AttendanceDetail,
  AttendanceListResult,
  AttendanceTimelineEntry,
  TodayAttendanceView,
} from "./types";

/** Server day/instant — policy-timezone resolution is a Phase 4 helper (10.4). */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Server-captured ClockContext (doc 14 §5). Never client-supplied except
 * `location`; ipAddress captured only when the policy opts in (privacy 10.6).
 */
async function captureClockContext(location?: string): Promise<ClockContext> {
  const context: ClockContext = {};
  try {
    const h = await headers();
    const ua = h.get("user-agent");
    if (ua) context.browser = ua;
    if (DEFAULT_WORKFORCE_POLICY.requireLocationTracking) {
      const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim();
      if (ip) context.ipAddress = ip;
    }
  } catch {
    // headers() unavailable outside a request scope — context stays minimal.
  }
  if (location) context.location = location;
  return context;
}

function toPeriods(
  breaks: { startAt: string; endAt: string | null }[],
): TimePeriod[] {
  return breaks.map((b) => ({
    startAt: new Date(b.startAt).getTime(),
    endAt: b.endAt ? new Date(b.endAt).getTime() : null,
  }));
}

export function buildAttendanceActions(repo: AttendanceRepository) {
  // Sprint 4B: ensure the read-model projection handler is wired before any
  // attendance event fires (idempotent).
  ensureWorkforceHandlersRegistered();
  return {
    /** A-1 clockIn (C-1) — permission `attendance.clock`, self only. */
    async clockIn(input: ClockInInput = {}): Promise<TodayAttendanceView> {
      const user = await requireCurrentUser();
      requirePermission(user.permissions, "attendance", "clock");
      const data = clockInSchema.parse(input);

      if (data.wfh && !DEFAULT_WORKFORCE_POLICY.allowWFH) {
        throw new AttendanceError(
          "attendance/wfh-not-allowed",
          "Work-from-home is not permitted by your organization policy.",
        );
      }
      const date = today();
      const existing = await repo.findDay(
        user.organizationId,
        user.userId,
        date,
      );
      if (existing) {
        throw new AttendanceError(
          "attendance/already-clocked-in",
          "You have already clocked in today.",
        );
      }
      const open = await repo.findOpenDay(user.organizationId, user.userId);
      if (open) {
        throw new AttendanceError(
          "attendance/session-open",
          "You still have an open session — clock out before clocking in again.",
        );
      }

      const clockInAt = nowIso();
      const clockInContext = await captureClockContext(data.location);
      const view = await repo.createDay(user.organizationId, user.userId, {
        userId: user.userId,
        date,
        clockInAt,
        status: "WORKING",
        isLate: deriveIsLate(clockInAt, DEFAULT_WORKFORCE_POLICY),
        wfh: data.wfh ?? false,
        clockInContext,
      });

      await publishEvents(
        user.organizationId,
        user.userId,
        view.attendanceId!,
        [ATTENDANCE_EVENTS.created, ATTENDANCE_EVENTS.clockedIn],
        { date, clockInAt, isLate: view.isLate, wfh: data.wfh ?? false },
      );

      revalidatePath("/workforce/attendance");
      revalidatePath("/dashboard");
      return view;
    },

    /** A-2 clockOut (C-2) — permission `attendance.clock`, self only. */
    async clockOut(input: ClockOutInput = {}): Promise<TodayAttendanceView> {
      const user = await requireCurrentUser();
      requirePermission(user.permissions, "attendance", "clock");
      const data = clockOutSchema.parse(input);

      const open = await repo.findOpenDay(user.organizationId, user.userId);
      if (!open || !open.attendanceId || !open.clockInAt) {
        throw new AttendanceError(
          "attendance/not-clocked-in",
          "You are not currently clocked in.",
        );
      }
      const clockOutAt = nowIso();
      if (
        new Date(clockOutAt).getTime() <= new Date(open.clockInAt).getTime()
      ) {
        throw new AttendanceError(
          "attendance/invalid-clock-out",
          "Clock-out must be after clock-in.",
        );
      }

      const detail = await repo.findById(
        user.organizationId,
        open.attendanceId,
      );
      const breaks = detail ? toPeriods(detail.breaks) : [];
      const wfh = detail?.notes === "WFH";
      // Sprint 4B: one engine pass produces metrics + status + the rich
      // validation result; the result rides the L3 event to the read-model
      // projection handler (no second engine run, no duplicate math).
      const { metrics, status, validation } = recomputeDay({
        clockInIso: open.clockInAt,
        clockOutIso: clockOutAt,
        breaks,
        policy: DEFAULT_WORKFORCE_POLICY,
        isLate: open.isLate,
        wfh,
      });
      const clockOutContext = await captureClockContext();
      const view = await repo.finalizeDay(
        user.organizationId,
        user.userId,
        open.attendanceId,
        {
          clockOutAt,
          status,
          isLate: open.isLate,
          metrics,
          clockOutContext,
          notes: data.notes,
        },
      );

      await publishEvents(
        user.organizationId,
        user.userId,
        open.attendanceId,
        [ATTENDANCE_EVENTS.updated, ATTENDANCE_EVENTS.clockedOut],
        { date: open.date, clockOutAt, status, metrics, validation },
      );

      revalidatePath("/workforce/attendance");
      revalidatePath("/workforce/history");
      revalidatePath("/dashboard");
      return view;
    },

    /** A-3 startBreak (C-3) — permission `attendance.clock`, self only. */
    async startBreak(
      input: StartBreakInput = {},
    ): Promise<TodayAttendanceView> {
      const user = await requireCurrentUser();
      requirePermission(user.permissions, "attendance", "clock");
      const { kind } = startBreakSchema.parse(input);

      const open = await repo.findOpenDay(user.organizationId, user.userId);
      if (!open || !open.attendanceId) {
        throw new AttendanceError(
          "attendance/not-clocked-in",
          "You are not currently clocked in.",
        );
      }
      assertTransition(open.state, "startBreak");

      await repo.addBreak(
        user.organizationId,
        user.userId,
        open.attendanceId,
        nowIso(),
        kind,
      );
      await publishEvents(
        user.organizationId,
        user.userId,
        open.attendanceId,
        [ATTENDANCE_EVENTS.breakStarted, ATTENDANCE_EVENTS.updated],
        { kind },
      );

      revalidatePath("/workforce/attendance");
      const view = await repo.findDay(
        user.organizationId,
        user.userId,
        open.date,
      );
      return view!;
    },

    /** A-4 endBreak (C-4) — permission `attendance.clock`, self only. */
    async endBreak(): Promise<TodayAttendanceView> {
      const user = await requireCurrentUser();
      requirePermission(user.permissions, "attendance", "clock");

      const open = await repo.findOpenDay(user.organizationId, user.userId);
      if (!open || !open.attendanceId) {
        throw new AttendanceError(
          "attendance/not-clocked-in",
          "You are not currently clocked in.",
        );
      }
      assertTransition(open.state, "endBreak");

      await repo.closeBreak(
        user.organizationId,
        user.userId,
        open.attendanceId,
        nowIso(),
      );
      await publishEvents(
        user.organizationId,
        user.userId,
        open.attendanceId,
        [ATTENDANCE_EVENTS.breakEnded, ATTENDANCE_EVENTS.updated],
        {},
      );

      revalidatePath("/workforce/attendance");
      const view = await repo.findDay(
        user.organizationId,
        user.userId,
        open.date,
      );
      return view!;
    },

    /** A-5 getTodayAttendance (Q-1) — permission `attendance.clock`, self. */
    async getTodayAttendance(): Promise<TodayAttendanceView> {
      const user = await requireCurrentUser();
      requirePermission(user.permissions, "attendance", "clock");
      const view = await repo.findDay(
        user.organizationId,
        user.userId,
        today(),
      );
      if (view) return view;
      return {
        state: "NOT_STARTED",
        attendanceId: null,
        date: today(),
        status: null,
        isLate: false,
        clockInAt: null,
        clockOutAt: null,
        openBreak: null,
        metrics: {
          workingMinutes: 0,
          breakMinutes: 0,
          idleMinutes: 0,
          focusMinutes: 0,
          effectiveMinutes: 0,
          overtimeMinutes: 0,
        },
        isOngoing: false,
        policy: {
          workStartTime: DEFAULT_WORKFORCE_POLICY.workStartTime,
          workEndTime: DEFAULT_WORKFORCE_POLICY.workEndTime,
        },
      };
    },

    /** Q-7 (Sprint 3A subset) attendance directory — `attendance.view_team`. */
    async listAttendance(
      input: ListAttendanceInput = {},
    ): Promise<AttendanceListResult> {
      const user = await requireCurrentUser();
      requirePermission(user.permissions, "attendance", "view_team");
      const filters = listAttendanceSchema.parse(input);
      return repo.list(user.organizationId, filters);
    },

    /** Q-8 (Sprint 3A subset) attendance detail — `attendance.view_team`. */
    async getAttendance(
      input: GetAttendanceInput,
    ): Promise<AttendanceDetail | null> {
      const user = await requireCurrentUser();
      requirePermission(user.permissions, "attendance", "view_team");
      const { attendanceId } = getAttendanceSchema.parse(input);
      return repo.findById(user.organizationId, attendanceId);
    },

    /**
     * Attendance timeline (doc 14 §11.4) — L3 events for one AttendanceDay.
     * Owners read their own with `attendance.clock`; others need
     * `attendance.view_team` (self-vs-team scoping, doc 15 §0).
     */
    async getAttendanceTimeline(
      input: GetAttendanceInput,
    ): Promise<AttendanceTimelineEntry[]> {
      const user = await requireCurrentUser();
      const { attendanceId } = getAttendanceSchema.parse(input);
      const detail = await repo.findById(user.organizationId, attendanceId);
      if (!detail) return [];
      if (detail.userId === user.userId) {
        requirePermission(user.permissions, "attendance", "clock");
      } else {
        requirePermission(user.permissions, "attendance", "view_team");
      }
      return repo.listTimeline(user.organizationId, attendanceId);
    },
  };

  async function publishEvents(
    organizationId: string,
    actorId: string,
    attendanceId: string,
    names: string[],
    payload: Record<string, unknown>,
  ): Promise<void> {
    for (const eventName of names) {
      await publishDomainEvent({
        organizationId,
        eventType: "attendance",
        eventName,
        aggregateType: "attendance_record",
        aggregateId: attendanceId,
        actorId,
        correlationId: attendanceId,
        payload: { userId: actorId, ...payload },
      });
    }
  }
}
