"use server";

/**
 * Calendar slice dispatcher (merge doc 15 §0 transport convention) — the same
 * DEMO_MODE switch the workforce and project slices use.
 */
import * as real from "./real-actions";
import * as mock from "./mock-actions";
import { isDemoMode } from "@/lib/env.server";

export async function getCalendarMonthAction(
  ...args: Parameters<typeof real.getCalendarMonthAction>
): Promise<Awaited<ReturnType<typeof real.getCalendarMonthAction>>> {
  if (isDemoMode()) return mock.getCalendarMonthAction(...args);
  return real.getCalendarMonthAction(...args);
}
