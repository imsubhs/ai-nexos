"use server";

/** Calendar server actions — real path (Drizzle repository). */
import { buildCalendarActions } from "./action-core";
import { realCalendarRepository } from "./real-repository";
import type { GetCalendarMonthInput } from "./schemas";
import type { CalendarMonth } from "./types";

const actions = buildCalendarActions(realCalendarRepository);

export async function getCalendarMonthAction(
  input?: GetCalendarMonthInput,
): Promise<CalendarMonth> {
  return actions.getMonth(input);
}
