"use server";

/**
 * Department slice dispatcher (merge doc 15 §0 transport convention) —
 * DEMO_MODE switch identical to the employees/projects/clients pattern.
 */
import * as real from "./real-actions";
import * as mock from "./mock-actions";

export async function listDepartmentsAction(
  ...args: Parameters<typeof real.listDepartmentsAction>
): Promise<Awaited<ReturnType<typeof real.listDepartmentsAction>>> {
  if (process.env.DEMO_MODE === "true") {
    return mock.listDepartmentsAction(...args);
  }
  return real.listDepartmentsAction(...args);
}

export async function getDepartmentAction(
  ...args: Parameters<typeof real.getDepartmentAction>
): Promise<Awaited<ReturnType<typeof real.getDepartmentAction>>> {
  if (process.env.DEMO_MODE === "true") {
    return mock.getDepartmentAction(...args);
  }
  return real.getDepartmentAction(...args);
}
