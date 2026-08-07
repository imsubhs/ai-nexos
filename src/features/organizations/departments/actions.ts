"use server";

/**
 * Department slice dispatcher (merge doc 15 §0 transport convention) —
 * DEMO_MODE switch identical to the employees/projects/clients pattern.
 */
import * as real from "./real-actions";
import * as mock from "./mock-actions";
import { isDemoMode } from "@/lib/env.server";

export async function listDepartmentsAction(
  ...args: Parameters<typeof real.listDepartmentsAction>
): Promise<Awaited<ReturnType<typeof real.listDepartmentsAction>>> {
  if (isDemoMode()) {
    return mock.listDepartmentsAction(...args);
  }
  return real.listDepartmentsAction(...args);
}

export async function getDepartmentAction(
  ...args: Parameters<typeof real.getDepartmentAction>
): Promise<Awaited<ReturnType<typeof real.getDepartmentAction>>> {
  if (isDemoMode()) {
    return mock.getDepartmentAction(...args);
  }
  return real.getDepartmentAction(...args);
}
