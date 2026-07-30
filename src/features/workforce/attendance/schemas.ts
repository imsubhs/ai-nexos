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
