/**
 * Shared calendar action pipeline. Mirrors the workforce slices: auth preamble →
 * permission composition → DTO validation → repository read → pure projection.
 * Read-only, so there is no event publish, no audit entry and no revalidation.
 *
 * Authorization here is *composition*, not a single gate. The calendar has no
 * permission of its own (merge doc 13 §2), so each source is included only if
 * the viewer may read the module that owns it — which is decided on the server,
 * before the query runs, so an unpermitted source is never fetched rather than
 * fetched and hidden.
 */
import { requireCurrentUser } from "@/features/auth/current-user";
import { hasPermission } from "@/features/permissions";
import { buildCalendarMonth, gridRange } from "./aggregate";
import type { CalendarRepository } from "./repository";
import { getCalendarMonthSchema, type GetCalendarMonthInput } from "./schemas";
import {
  CALENDAR_SOURCES,
  CALENDAR_SOURCE_PERMISSION,
  type CalendarMonth,
  type CalendarSource,
} from "./types";

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function buildCalendarActions(repo: CalendarRepository) {
  return {
    /**
     * The month lens. Requires authentication and at least one of
     * `meetings.read` / `timeline.read` / `tasks.read` — a viewer with none gets
     * an empty `sources` array, which the page reports as "nothing you can see"
     * rather than as an empty schedule.
     */
    async getMonth(input: GetCalendarMonthInput = {}): Promise<CalendarMonth> {
      const user = await requireCurrentUser();
      const { month: requested } = getCalendarMonthSchema.parse(input);
      const month = requested ?? currentMonth();

      const sources: CalendarSource[] = CALENDAR_SOURCES.filter((source) =>
        hasPermission(
          user.permissions,
          CALENDAR_SOURCE_PERMISSION[source],
          "read",
        ),
      );

      // Queried over the padded grid, not the month: the first and last displayed
      // weeks include days from the neighbouring months, and leaving them out
      // would render real entries as empty cells.
      const entries = await repo.listEntries(
        user.organizationId,
        gridRange(month),
        sources,
      );

      return buildCalendarMonth(entries, {
        month,
        today: new Date().toISOString().slice(0, 10),
        sources,
      });
    },
  };
}
