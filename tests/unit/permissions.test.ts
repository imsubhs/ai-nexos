import { describe, expect, it } from "vitest";
import {
  hasPermission,
  requirePermission,
  PermissionDeniedError,
  SYSTEM_ROLES,
  MODULES,
  ACTIONS,
  type PermissionMap,
} from "@/features/permissions";

describe("hasPermission", () => {
  it("grants everything for the owner wildcard {'*': ['*']}", () => {
    const owner: PermissionMap = { "*": ["*"] };
    for (const moduleName of MODULES) {
      for (const action of ACTIONS) {
        expect(hasPermission(owner, moduleName, action)).toBe(true);
      }
    }
  });

  it("grants all actions for a module wildcard", () => {
    const map: PermissionMap = { projects: ["*"] };
    expect(hasPermission(map, "projects", "delete")).toBe(true);
    expect(hasPermission(map, "projects", "read")).toBe(true);
    expect(hasPermission(map, "clients", "read")).toBe(false);
  });

  it("grants only the listed action", () => {
    const map: PermissionMap = { tasks: ["read", "update"] };
    expect(hasPermission(map, "tasks", "read")).toBe(true);
    expect(hasPermission(map, "tasks", "update")).toBe(true);
    expect(hasPermission(map, "tasks", "delete")).toBe(false);
  });

  it("denies on null, undefined, and empty maps", () => {
    expect(hasPermission(null, "projects", "read")).toBe(false);
    expect(hasPermission(undefined, "projects", "read")).toBe(false);
    expect(hasPermission({}, "projects", "read")).toBe(false);
  });

  it("does not treat a module list as a global wildcard", () => {
    const map: PermissionMap = { projects: ["*"] };
    expect(hasPermission(map, "settings", "update")).toBe(false);
  });
});

describe("requirePermission", () => {
  it("throws PermissionDeniedError with module/action context", () => {
    expect(() => requirePermission({}, "projects", "delete")).toThrowError(
      PermissionDeniedError,
    );
    try {
      requirePermission({}, "projects", "delete");
    } catch (error) {
      const denied = error as PermissionDeniedError;
      expect(denied.module).toBe("projects");
      expect(denied.action).toBe("delete");
    }
  });

  it("passes silently when permitted", () => {
    expect(() =>
      requirePermission({ projects: ["delete"] }, "projects", "delete"),
    ).not.toThrow();
  });
});

describe("SYSTEM_ROLES", () => {
  it("defines exactly one owner with the global wildcard", () => {
    const owners = SYSTEM_ROLES.filter((r) => r.roleKey === "owner");
    expect(owners).toHaveLength(1);
    expect(hasPermission(owners[0].permissions, "organization", "delete")).toBe(
      true,
    );
  });

  it("only references known modules and actions", () => {
    for (const role of SYSTEM_ROLES) {
      for (const [module, actions] of Object.entries(role.permissions)) {
        expect([...MODULES, "*"]).toContain(module);
        for (const action of actions ?? []) {
          expect([...ACTIONS, "*"]).toContain(action);
        }
      }
    }
  });

  it("never grants organization.delete to non-owner roles", () => {
    for (const role of SYSTEM_ROLES.filter((r) => r.roleKey !== "owner")) {
      expect(hasPermission(role.permissions, "organization", "delete")).toBe(
        false,
      );
    }
  });
});
