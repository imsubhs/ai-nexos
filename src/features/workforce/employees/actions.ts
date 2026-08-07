"use server";

/**
 * Employee slice dispatcher (merge doc 15 §0 transport convention) —
 * DEMO_MODE switch identical to the projects/clients pattern.
 */
import * as real from "./real-actions";
import * as mock from "./mock-actions";
import { isDemoMode } from "@/lib/env.server";

export async function listEmployeesAction(
  ...args: Parameters<typeof real.listEmployeesAction>
): Promise<Awaited<ReturnType<typeof real.listEmployeesAction>>> {
  if (isDemoMode()) return mock.listEmployeesAction(...args);
  return real.listEmployeesAction(...args);
}

export async function getEmployeeAction(
  ...args: Parameters<typeof real.getEmployeeAction>
): Promise<Awaited<ReturnType<typeof real.getEmployeeAction>>> {
  if (isDemoMode()) return mock.getEmployeeAction(...args);
  return real.getEmployeeAction(...args);
}

export async function listDirectReportsAction(
  ...args: Parameters<typeof real.listDirectReportsAction>
): Promise<Awaited<ReturnType<typeof real.listDirectReportsAction>>> {
  if (isDemoMode()) {
    return mock.listDirectReportsAction(...args);
  }
  return real.listDirectReportsAction(...args);
}
