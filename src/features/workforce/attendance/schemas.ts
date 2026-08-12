/**
 * Attendance slice DTO validation (merge doc 14 §14, doc 15 A-1…A-6).
 * Clock commands are self-scoped: no userId is ever accepted from input —
 * the actor is resolved from CurrentUser (doc 15 §0).
 */
import { z } from "zod";

/** A-1 clockIn — context (ip/device/browser) is captured server-side. */
export const clockInSchema = z.object({
  wfh: z.boolean().optional(),
  location: z.string().max(200).optional(),
});
export type ClockInInput = z.input<typeof clockInSchema>;

/** A-2 clockOut. */
export const clockOutSchema = z.object({
  notes: z.string().max(1000).optional(),
});
export type ClockOutInput = z.input<typeof clockOutSchema>;

/** A-3 startBreak — optional break kind (doc 15 A-3). */
export const startBreakSchema = z.object({
  kind: z.string().max(50).default("break"),
});
export type StartBreakInput = z.input<typeof startBreakSchema>;

/** Directory query (doc 14 §12.5 / Q-7 scope — org-scoped in Sprint 3A). */
export const listAttendanceSchema = z.object({
  date: z.iso.date().optional(),
  departmentId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  status: z
    .enum(["PRESENT", "ABSENT", "LATE", "WFH", "HALF_DAY", "WORKING"])
    .optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z
    .union([z.literal(10), z.literal(25), z.literal(50), z.literal(100)])
    .default(25),
});
export type ListAttendanceInput = z.input<typeof listAttendanceSchema>;

/** Detail lookup by attendance record id (Q-8 subset). */
export const getAttendanceSchema = z.object({
  attendanceId: z.string().uuid(),
});
export type GetAttendanceInput = z.input<typeof getAttendanceSchema>;

/** Longest range A-6 will serve (doc 15 §1) — three months of daily rows. */
export const MAX_HISTORY_RANGE_DAYS = 92;

/**
 * A-6 self history (doc 15 §1): `month` XOR an explicit `from`/`to` range,
 * defaulting to the current month.
 *
 * There is deliberately no `userId`. A-6 is self-scoped, and an optional
 * userId is the shape that later grows an authorization hole — reading another
 * employee's history is T-2's job, behind `attendance.view_team`.
 */
export const getAttendanceHistorySchema = z
  .object({
    month: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be YYYY-MM.")
      .optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z
      .union([z.literal(10), z.literal(25), z.literal(50), z.literal(100)])
      .default(100),
  })
  .superRefine((v, ctx) => {
    const hasRange = v.from !== undefined || v.to !== undefined;
    if (v.month && hasRange) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["month"],
        message: "Provide either a month or a from/to range, not both.",
      });
      return;
    }
    if (!hasRange) return;
    if (!v.from || !v.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [v.from ? "to" : "from"],
        message: "A range needs both from and to.",
      });
      return;
    }
    if (v.to < v.from) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to"],
        message: "The range end must not precede its start.",
      });
      return;
    }
    const span =
      (Date.parse(`${v.to}T00:00:00.000Z`) -
        Date.parse(`${v.from}T00:00:00.000Z`)) /
        86_400_000 +
      1;
    if (span > MAX_HISTORY_RANGE_DAYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to"],
        message: `A history range may span at most ${MAX_HISTORY_RANGE_DAYS} days.`,
      });
    }
  });
export type GetAttendanceHistoryInput = z.input<
  typeof getAttendanceHistorySchema
>;

/** T-1 team attendance for one day (doc 15 §4), organization-scoped. */
export const getTeamAttendanceSchema = z.object({
  date: z.iso.date().optional(),
  departmentId: z.string().uuid().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z
    .union([z.literal(10), z.literal(25), z.literal(50), z.literal(100)])
    .default(25),
});
export type GetTeamAttendanceInput = z.input<typeof getTeamAttendanceSchema>;
