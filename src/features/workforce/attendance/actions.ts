"use server";

/**
 * Attendance slice dispatcher (merge doc 15 §0 transport convention) —
 * DEMO_MODE switch identical to the employees/projects/clients pattern.
 */
import * as real from "./real-actions";
import * as mock from "./mock-actions";

export async function clockInAction(
  ...args: Parameters<typeof real.clockInAction>
): Promise<Awaited<ReturnType<typeof real.clockInAction>>> {
  if (process.env.DEMO_MODE === "true") return mock.clockInAction(...args);
  return real.clockInAction(...args);
}

export async function clockOutAction(
  ...args: Parameters<typeof real.clockOutAction>
): Promise<Awaited<ReturnType<typeof real.clockOutAction>>> {
  if (process.env.DEMO_MODE === "true") return mock.clockOutAction(...args);
  return real.clockOutAction(...args);
}

export async function startBreakAction(
  ...args: Parameters<typeof real.startBreakAction>
): Promise<Awaited<ReturnType<typeof real.startBreakAction>>> {
  if (process.env.DEMO_MODE === "true") return mock.startBreakAction(...args);
  return real.startBreakAction(...args);
}

export async function endBreakAction(
  ...args: Parameters<typeof real.endBreakAction>
): Promise<Awaited<ReturnType<typeof real.endBreakAction>>> {
  if (process.env.DEMO_MODE === "true") return mock.endBreakAction(...args);
  return real.endBreakAction(...args);
}

export async function getTodayAttendanceAction(
  ...args: Parameters<typeof real.getTodayAttendanceAction>
): Promise<Awaited<ReturnType<typeof real.getTodayAttendanceAction>>> {
  if (process.env.DEMO_MODE === "true") {
    return mock.getTodayAttendanceAction(...args);
  }
  return real.getTodayAttendanceAction(...args);
}

export async function getAttendanceTimelineAction(
  ...args: Parameters<typeof real.getAttendanceTimelineAction>
): Promise<Awaited<ReturnType<typeof real.getAttendanceTimelineAction>>> {
  if (process.env.DEMO_MODE === "true") {
    return mock.getAttendanceTimelineAction(...args);
  }
  return real.getAttendanceTimelineAction(...args);
}

export async function listAttendanceAction(
  ...args: Parameters<typeof real.listAttendanceAction>
): Promise<Awaited<ReturnType<typeof real.listAttendanceAction>>> {
  if (process.env.DEMO_MODE === "true") return mock.listAttendanceAction(...args);
  return real.listAttendanceAction(...args);
}

export async function getAttendanceAction(
  ...args: Parameters<typeof real.getAttendanceAction>
): Promise<Awaited<ReturnType<typeof real.getAttendanceAction>>> {
  if (process.env.DEMO_MODE === "true") return mock.getAttendanceAction(...args);
  return real.getAttendanceAction(...args);
}
