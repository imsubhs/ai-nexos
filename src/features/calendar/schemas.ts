/**
 * Calendar DTO validation. One input: which month to render. The lens takes no
 * organization, user or project parameter — breadth comes from CurrentUser and
 * from the viewer's module permissions, never from the request.
 */
import { z } from "zod";

export const getCalendarMonthSchema = z.object({
  /** YYYY-MM; defaults to the current month server-side. */
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be YYYY-MM.")
    .optional(),
});

export type GetCalendarMonthInput = z.input<typeof getCalendarMonthSchema>;
