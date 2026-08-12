"use server";

/**
 * The clock commands as the My Attendance screen calls them: same guarded
 * pipeline, domain violations returned as values instead of thrown (see
 * shared/action-result.ts).
 *
 * These add no authorization of their own and must not — every function here
 * delegates to the dispatcher in actions.ts, which resolves CurrentUser and
 * calls requirePermission before touching a repository.
 */
import {
  clockInAction,
  clockOutAction,
  endBreakAction,
  startBreakAction,
} from "./actions";
import { toActionResult, type ActionResult } from "../shared/action-result";
import type { TodayAttendanceView } from "./types";

export async function submitClockIn(
  wfh: boolean,
): Promise<ActionResult<TodayAttendanceView>> {
  return toActionResult(() => clockInAction({ wfh }));
}

export async function submitClockOut(
  notes: string,
): Promise<ActionResult<TodayAttendanceView>> {
  const trimmed = notes.trim();
  return toActionResult(() =>
    clockOutAction(trimmed.length > 0 ? { notes: trimmed } : {}),
  );
}

export async function submitStartBreak(
  kind: string,
): Promise<ActionResult<TodayAttendanceView>> {
  return toActionResult(() => startBreakAction({ kind }));
}

export async function submitEndBreak(): Promise<
  ActionResult<TodayAttendanceView>
> {
  return toActionResult(() => endBreakAction());
}
