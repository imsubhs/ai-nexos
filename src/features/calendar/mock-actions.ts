/** Calendar server actions — DEMO_MODE adapter (DemoStore repository). */
import { buildCalendarActions } from "./action-core";
import { mockCalendarRepository } from "./mock-repository";
import type { GetCalendarMonthInput } from "./schemas";
import type { CalendarMonth } from "./types";

const actions = buildCalendarActions(mockCalendarRepository);

export async function getCalendarMonthAction(
  input?: GetCalendarMonthInput,
): Promise<CalendarMonth> {
  return actions.getMonth(input);
}
