"use server";

/**
 * Attendance slice dispatcher (merge doc 15 §0 transport convention) —
 * DEMO_MODE switch identical to the employees/projects/clients pattern.
 */
import * as real from "./real-actions";
import * as mock from "./mock-actions";
import { isDemoMode } from "@/lib/env.server";

export async function clockInAction(
  ...args: Parameters<typeof real.clockInAction>
): Promise<Awaited<ReturnType<typeof real.clockInAction>>> {
  if (isDemoMode()) return mock.clockInAction(...args);
  return real.clockInAction(...args);
}

export async function clockOutAction(
  ...args: Parameters<typeof real.clockOutAction>
): Promise<Awaited<ReturnType<typeof real.clockOutAction>>> {
  if (isDemoMode()) return mock.clockOutAction(...args);
  return real.clockOutAction(...args);
}

export async function startBreakAction(
  ...args: Parameters<typeof real.startBreakAction>
): Promise<Awaited<ReturnType<typeof real.startBreakAction>>> {
  if (isDemoMode()) return mock.startBreakAction(...args);
  return real.startBreakAction(...args);
}

export async function endBreakAction(
  ...args: Parameters<typeof real.endBreakAction>
): Promise<Awaited<ReturnType<typeof real.endBreakAction>>> {
  if (isDemoMode()) return mock.endBreakAction(...args);
  return real.endBreakAction(...args);
}

export async function getTodayAttendanceAction(
  ...args: Parameters<typeof real.getTodayAttendanceAction>
): Promise<Awaited<ReturnType<typeof real.getTodayAttendanceAction>>> {
  if (isDemoMode()) {
    return mock.getTodayAttendanceAction(...args);
  }
  return real.getTodayAttendanceAction(...args);
}

export async function getAttendanceTimelineAction(
  ...args: Parameters<typeof real.getAttendanceTimelineAction>
): Promise<Awaited<ReturnType<typeof real.getAttendanceTimelineAction>>> {
  if (isDemoMode()) {
    return mock.getAttendanceTimelineAction(...args);
  }
  return real.getAttendanceTimelineAction(...args);
}

export async function listAttendanceAction(
  ...args: Parameters<typeof real.listAttendanceAction>
): Promise<Awaited<ReturnType<typeof real.listAttendanceAction>>> {
  if (isDemoMode()) return mock.listAttendanceAction(...args);
  return real.listAttendanceAction(...args);
}

export async function getAttendanceAction(
  ...args: Parameters<typeof real.getAttendanceAction>
): Promise<Awaited<ReturnType<typeof real.getAttendanceAction>>> {
  if (isDemoMode()) return mock.getAttendanceAction(...args);
  return real.getAttendanceAction(...args);
}

export async function getAttendanceHistoryAction(
  ...args: Parameters<typeof real.getAttendanceHistoryAction>
): Promise<Awaited<ReturnType<typeof real.getAttendanceHistoryAction>>> {
  if (isDemoMode()) return mock.getAttendanceHistoryAction(...args);
  return real.getAttendanceHistoryAction(...args);
}

export async function getTeamAttendanceAction(
  ...args: Parameters<typeof real.getTeamAttendanceAction>
): Promise<Awaited<ReturnType<typeof real.getTeamAttendanceAction>>> {
  if (isDemoMode()) return mock.getTeamAttendanceAction(...args);
  return real.getTeamAttendanceAction(...args);
}
