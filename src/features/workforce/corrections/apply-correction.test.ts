/**
 * Sprint 4B — C-9 apply-on-approve. Asserts an approved correction amends the
 * AttendanceDay via the frozen engine, emits attendance.amended, and drives the
 * read-model projection handler — end to end, in demo mode.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDemoStore } from "@/lib/demo/store";
import { ATTENDANCE_EVENTS } from "../attendance/events";
import type { AmendDayData } from "../attendance/repository";
import type {
  AttendanceDetail,
  TodayAttendanceView,
} from "../attendance/types";
import { mockValidationResultRepository } from "../attendance/validation-result-mock-repository";
import { ensureWorkforceHandlersRegistered } from "../events/handlers";
import {
  applyApprovedCorrection,
  type AttendanceAmendPort,
} from "./apply-correction";
import type { CorrectionDetail } from "./types";

function baseCorrection(p: Partial<CorrectionDetail> = {}): CorrectionDetail {
  return {
    correctionId: "c1",
    correctionCode: "COR-0001",
    userId: "u1",
    employeeName: "Emp",
    date: "2026-07-10",
    correctionType: "LOGOUT_TIME",
    status: "APPROVED",
    reason: "forgot to clock out",
    createdAt: "2026-07-11T00:00:00.000Z",
    reviewedAt: "2026-07-12T00:00:00.000Z",
    requestedClockInAt: null,
    requestedClockOutAt: "2026-07-10T18:00:00.000Z",
    requestedStatus: null,
    evidenceUrl: null,
    approvalCycleId: null,
    reviewedBy: "mgr",
    reviewerName: "Mgr",
    reviewNote: null,
    appliedAt: null,
    timeline: [],
    ...p,
  };
}

/** In-memory amend port seeded with one completed day. */
function makePort(over: Partial<TodayAttendanceView> = {}) {
  let amended: AmendDayData | null = null;
  const day: TodayAttendanceView = {
    state: "COMPLETED",
    attendanceId: "att-1",
    date: "2026-07-10",
    status: "PRESENT",
    isLate: false,
    clockInAt: "2026-07-10T09:00:00.000Z",
    clockOutAt: "2026-07-10T17:00:00.000Z",
    openBreak: null,
    metrics: {
      workingMinutes: 480,
      breakMinutes: 0,
      idleMinutes: 0,
      focusMinutes: 0,
      effectiveMinutes: 480,
      overtimeMinutes: 0,
    },
    isOngoing: false,
    policy: { workStartTime: "09:00", workEndTime: "18:00" },
    ...over,
  };
  const detail: AttendanceDetail = {
    attendanceId: "att-1",
    userId: "u1",
    employeeName: "Emp",
    employeeCode: null,
    departmentId: null,
    departmentName: null,
    date: "2026-07-10",
    status: "PRESENT",
    isLate: false,
    clockInAt: day.clockInAt,
    clockOutAt: day.clockOutAt,
    metrics: day.metrics,
    isArchived: false,
    isOnBreak: false,
    breaks: [],
    clockInContext: null,
    clockOutContext: null,
    notes: null,
  };
  const port: AttendanceAmendPort = {
    async findDay() {
      return day.attendanceId ? day : null;
    },
    async findById() {
      return detail;
    },
    async amendDay(_org, _actor, _id, data) {
      amended = data;
      return { ...day, metrics: data.metrics, status: data.status };
    },
  };
  return { port, getAmended: () => amended };
}

describe("applyApprovedCorrection (C-9)", () => {
  beforeEach(() => {
    vi.stubEnv("DEMO_MODE", "true");
    const store = getDemoStore();
    store.domainEvents.length = 0;
    store.attendanceValidations.length = 0;
    ensureWorkforceHandlersRegistered();
  });

  it("amends the day via the engine and emits attendance.amended", async () => {
    const { port, getAmended } = makePort();
    const result = await applyApprovedCorrection({
      organizationId: "org1",
      actorId: "mgr",
      correction: baseCorrection(),
      attendance: port,
    });

    expect(result.applied).toBe(true);
    expect(result.appliedAt).toBeTruthy();

    // Amended with engine-recomputed metrics: 09:00→18:00 = 540 session.
    const amended = getAmended()!;
    expect(amended.metrics.workingMinutes).toBe(540);
    expect(amended.metrics.effectiveMinutes).toBe(540);
    expect(amended.reason).toBe("COR-0001");

    // Event emitted + projected into the validation read model.
    const store = getDemoStore();
    const amendedEvent = store.domainEvents.find(
      (e: { eventName: string }) => e.eventName === ATTENDANCE_EVENTS.amended,
    );
    expect(amendedEvent).toBeTruthy();

    const snap = await mockValidationResultRepository.findByAttendance(
      "org1",
      "att-1",
    );
    expect(snap?.source).toBe("correction");
    expect(snap?.result.sessionMinutes).toBe(540);
  });

  it("overrides status for a STATUS_CHANGE correction", async () => {
    const { port, getAmended } = makePort();
    await applyApprovedCorrection({
      organizationId: "org1",
      actorId: "mgr",
      correction: baseCorrection({
        correctionType: "STATUS_CHANGE",
        requestedClockInAt: null,
        requestedClockOutAt: null,
        requestedStatus: "WFH",
      }),
      attendance: port,
    });
    expect(getAmended()!.status).toBe("WFH");
  });

  it("records approval but does not amend when there is no day", async () => {
    const { port, getAmended } = makePort({ attendanceId: null });
    const result = await applyApprovedCorrection({
      organizationId: "org1",
      actorId: "mgr",
      correction: baseCorrection(),
      attendance: port,
    });
    expect(result.applied).toBe(false);
    expect(result.reason).toBe("no-attendance-day");
    expect(getAmended()).toBeNull();
  });
});
