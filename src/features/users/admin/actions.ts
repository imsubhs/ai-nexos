"use server";

/**
 * Employee admin dispatcher (merge doc 15 §0 transport convention) —
 * DEMO_MODE switch identical to the other feature slices.
 */
import * as real from "./real-actions";
import * as mock from "./mock-actions";

const demo = () => process.env.DEMO_MODE === "true";

export async function createEmployeeAction(
  ...args: Parameters<typeof real.createEmployeeAction>
): Promise<Awaited<ReturnType<typeof real.createEmployeeAction>>> {
  return demo() ? mock.createEmployeeAction(...args) : real.createEmployeeAction(...args);
}

export async function updateEmployeeAction(
  ...args: Parameters<typeof real.updateEmployeeAction>
): Promise<Awaited<ReturnType<typeof real.updateEmployeeAction>>> {
  return demo() ? mock.updateEmployeeAction(...args) : real.updateEmployeeAction(...args);
}

export async function setEmployeeStatusAction(
  ...args: Parameters<typeof real.setEmployeeStatusAction>
): Promise<Awaited<ReturnType<typeof real.setEmployeeStatusAction>>> {
  return demo() ? mock.setEmployeeStatusAction(...args) : real.setEmployeeStatusAction(...args);
}

export async function archiveEmployeeAction(
  ...args: Parameters<typeof real.archiveEmployeeAction>
): Promise<Awaited<ReturnType<typeof real.archiveEmployeeAction>>> {
  return demo() ? mock.archiveEmployeeAction(...args) : real.archiveEmployeeAction(...args);
}

export async function restoreEmployeeAction(
  ...args: Parameters<typeof real.restoreEmployeeAction>
): Promise<Awaited<ReturnType<typeof real.restoreEmployeeAction>>> {
  return demo() ? mock.restoreEmployeeAction(...args) : real.restoreEmployeeAction(...args);
}

export async function assignDepartmentAction(
  ...args: Parameters<typeof real.assignDepartmentAction>
): Promise<Awaited<ReturnType<typeof real.assignDepartmentAction>>> {
  return demo() ? mock.assignDepartmentAction(...args) : real.assignDepartmentAction(...args);
}

export async function assignManagerAction(
  ...args: Parameters<typeof real.assignManagerAction>
): Promise<Awaited<ReturnType<typeof real.assignManagerAction>>> {
  return demo() ? mock.assignManagerAction(...args) : real.assignManagerAction(...args);
}
