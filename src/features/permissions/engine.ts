import type { Action, Module, PermissionMap } from "./constants";

/**
 * Pure permission evaluation — identical semantics to the Postgres function
 * app.has_permission(). Keep the two in sync: any change here must ship with
 * a migration updating the SQL function.
 */
export function hasPermission(
  permissions: PermissionMap | null | undefined,
  module: Module,
  action: Action,
): boolean {
  if (!permissions) return false;
  const wildcard = permissions["*"];
  if (wildcard?.includes("*")) return true;
  const moduleActions = permissions[module];
  if (!moduleActions) return false;
  return moduleActions.includes("*") || moduleActions.includes(action);
}

export class PermissionDeniedError extends Error {
  readonly module: Module;
  readonly action: Action;

  constructor(module: Module, action: Action) {
    super(`Permission denied: ${module}.${action}`);
    this.name = "PermissionDeniedError";
    this.module = module;
    this.action = action;
  }
}

/** Assert-style guard for service-layer entry points. */
export function requirePermission(
  permissions: PermissionMap | null | undefined,
  module: Module,
  action: Action,
): void {
  if (!hasPermission(permissions, module, action)) {
    throw new PermissionDeniedError(module, action);
  }
}
