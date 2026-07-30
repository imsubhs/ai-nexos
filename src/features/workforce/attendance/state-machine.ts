/**
 * AttendanceDay status transitions (merge doc 14 §8.1). A single guard so the
 * clock and break commands share one definition of what is legal — no rule is
 * duplicated or re-stated per action. This formalizes the transitions Sprint
 * 3A enforced inline; it changes no business rule and does not touch the
 * interim finalizer (that stays until Sprint 4).
 *
 *   NOT_STARTED --clockIn--> WORKING --startBreak--> ON_BREAK
 *                            ^  |                        |
 *                            |  +------clockOut------+  endBreak
 *                            +---------------------|-----+
 *                                                  v
 *                                              COMPLETED
 */
import { AttendanceError } from "./repository";
import type { AttendanceState } from "./types";

export type AttendanceCommand =
  | "clockIn"
  | "startBreak"
  | "endBreak"
  | "clockOut";

const ALLOWED: Record<AttendanceCommand, AttendanceState[]> = {
  clockIn: ["NOT_STARTED"],
  startBreak: ["WORKING"],
  endBreak: ["ON_BREAK"],
  clockOut: ["WORKING", "ON_BREAK"],
};

/** Stable error key per illegal transition (surfaced to the UI). */
const ILLEGAL_KEY: Record<AttendanceCommand, string> = {
  clockIn: "attendance/already-clocked-in",
  startBreak: "attendance/cannot-start-break",
  endBreak: "attendance/not-on-break",
  clockOut: "attendance/not-clocked-in",
};

const MESSAGE: Record<AttendanceCommand, string> = {
  clockIn: "You have already clocked in today.",
  startBreak: "You can only start a break while clocked in and working.",
  endBreak: "There is no open break to end.",
  clockOut: "You are not currently clocked in.",
};

export function canTransition(
  state: AttendanceState,
  command: AttendanceCommand,
): boolean {
  return ALLOWED[command].includes(state);
}

/** Throws AttendanceError with the command's stable key when illegal. */
export function assertTransition(
  state: AttendanceState,
  command: AttendanceCommand,
): void {
  if (!canTransition(state, command)) {
    throw new AttendanceError(ILLEGAL_KEY[command], MESSAGE[command]);
  }
}
