"use server";

/**
 * Attendance server actions (Sprint 3A) — real path. Thin binding of the
 * shared pipeline to the Drizzle repository; the live runtime path is wired
 * in Phase 7 (doc 15 §0).
 */
import { buildAttendanceActions } from "./action-core";
import { realAttendanceRepository } from "./real-repository";
import type {
  ClockInInput,
  ClockOutInput,
  GetAttendanceInput,
  ListAttendanceInput,
  StartBreakInput,
} from "./schemas";
import type {
  AttendanceDetail,
  AttendanceListResult,
  AttendanceTimelineEntry,
  TodayAttendanceView,
} from "./types";

const actions = buildAttendanceActions(realAttendanceRepository);

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
