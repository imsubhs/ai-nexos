"use server";

/**
 * Attendance server actions (Sprint 3A) — real path. Thin binding of the
 * shared pipeline to the Drizzle repository; the live runtime path is wired
 * in Phase 7 (doc 15 §0).
 */
import { buildAttendanceActions } from "./action-core";
import { realAttendanceRepository } from "./real-repository";
import { realEmployeeReadRepository } from "../employees/real-repository";
import type {
  ClockInInput,
  ClockOutInput,
  GetAttendanceHistoryInput,
  GetAttendanceInput,
  GetTeamAttendanceInput,
  ListAttendanceInput,
  StartBreakInput,
} from "./schemas";
import type {
  AttendanceDetail,
  AttendanceHistoryResult,
  AttendanceListResult,
  AttendanceTimelineEntry,
  TeamAttendanceResult,
  TodayAttendanceView,
} from "./types";

// The T-1 `absent` denominator comes from the Identity read model, asked for a
// single row so the count arrives without paging the whole directory.
const actions = buildAttendanceActions(
  realAttendanceRepository,
  async (organizationId, departmentId) => {
    const { total } = await realEmployeeReadRepository.list(organizationId, {
      status: "active",
      departmentId,
      page: 1,
      pageSize: 10,
    });
    return total;
  },
);

export async function clockInAction(
  input?: ClockInInput,
): Promise<TodayAttendanceView> {
  return actions.clockIn(input);
}

export async function clockOutAction(
  input?: ClockOutInput,
): Promise<TodayAttendanceView> {
  return actions.clockOut(input);
}

export async function startBreakAction(
  input?: StartBreakInput,
): Promise<TodayAttendanceView> {
  return actions.startBreak(input);
}

export async function endBreakAction(): Promise<TodayAttendanceView> {
  return actions.endBreak();
}

export async function getTodayAttendanceAction(): Promise<TodayAttendanceView> {
  return actions.getTodayAttendance();
}

export async function getAttendanceTimelineAction(
  input: GetAttendanceInput,
): Promise<AttendanceTimelineEntry[]> {
  return actions.getAttendanceTimeline(input);
}

export async function listAttendanceAction(
  input?: ListAttendanceInput,
): Promise<AttendanceListResult> {
  return actions.listAttendance(input);
}

export async function getAttendanceAction(
  input: GetAttendanceInput,
): Promise<AttendanceDetail | null> {
  return actions.getAttendance(input);
}

export async function getAttendanceHistoryAction(
  input?: GetAttendanceHistoryInput,
): Promise<AttendanceHistoryResult> {
  return actions.getAttendanceHistory(input);
}

export async function getTeamAttendanceAction(
  input?: GetTeamAttendanceInput,
): Promise<TeamAttendanceResult> {
  return actions.getTeamAttendance(input);
}
