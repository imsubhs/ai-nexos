/**
 * DemoStore-backed EmployeeAdminRepository (Sprint 2 / WP-105B).
 * Writes live store user rows so demo sessions behave like a database:
 * creates appear in the directory, archives disappear, restores return.
 * Employee codes are minted per-org via the shared demo sequence.
 */
import {
  getDemoStore,
  logDemoActivity,
  nextDemoCode,
  nextDemoId,
} from "@/lib/demo/store";
import {
  EmployeeAdminError,
  wouldCreateManagerCycle,
  type EmployeeAdminRepository,
} from "./repository";

type DemoUser = {
  userId: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string | null;
  avatarUrl: string | null;
  designation: string | null;
  roleId: string;
  departmentId: string | null;
  employeeCode: string | null;
  managerId: string | null;
  location: string | null;
  employmentType: string;
  hireDate?: string | null;
  terminationDate?: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  deletedAt: Date | null;
  deletedBy: string | null;
  isArchived: boolean;
};

type DemoDepartment = {
  departmentId: string;
  organizationId: string;
  deletedAt: unknown;
};

function orgUsers(organizationId: string): DemoUser[] {
  return (getDemoStore().users as DemoUser[]).filter(
    (u) => u.organizationId === organizationId && u.deletedAt == null,
  );
}

function requireUser(organizationId: string, userId: string): DemoUser {
  const user = orgUsers(organizationId).find((u) => u.userId === userId);
  if (!user) throw new EmployeeAdminError("Employee not found.");
  return user;
}

function fullName(user: DemoUser): string {
  return [user.firstName, user.lastName].filter(Boolean).join(" ");
}

/** Org-aware reference checks shared by create/update/assign paths. */
function validateReferences(
  organizationId: string,
  data: { departmentId?: string | null; managerId?: string | null },
  subjectUserId: string | null,
): void {
  if (data.departmentId) {
    const departments = getDemoStore().departments as DemoDepartment[];
    const found = departments.find(
      (d) =>
        d.departmentId === data.departmentId &&
        d.organizationId === organizationId &&
        d.deletedAt == null,
    );
    if (!found) {
      throw new EmployeeAdminError(
        "Department does not belong to this organization.",
      );
    }
  }
  if (data.managerId) {
    if (subjectUserId && data.managerId === subjectUserId) {
      throw new EmployeeAdminError("An employee cannot be their own manager.");
    }
    const manager = orgUsers(organizationId).find(
      (u) => u.userId === data.managerId,
    );
    if (!manager || manager.isArchived) {
      throw new EmployeeAdminError(
        "Manager must be an active member of this organization.",
      );
    }
    if (manager.status !== "active") {
      throw new EmployeeAdminError("Manager must be an active employee.");
    }
  }
}

async function assertNoCycle(
  organizationId: string,
  userId: string,
  managerId: string,
): Promise<void> {
  const byId = new Map(orgUsers(organizationId).map((u) => [u.userId, u]));
  const cycle = await wouldCreateManagerCycle(userId, managerId, async (id) => {
    return byId.get(id)?.managerId ?? null;
  });
  if (cycle) {
    throw new EmployeeAdminError(
      "Assignment would create a cycle in the manager hierarchy.",
    );
  }
}

function assertWritable(user: DemoUser): void {
  if (user.isArchived || user.status === "archived") {
    throw new EmployeeAdminError(
      "Employee is archived — restore them before making changes.",
    );
  }
}

export const mockEmployeeAdminRepository: EmployeeAdminRepository = {
  async create(organizationId, actorUserId, data) {
    const store = getDemoStore();
    const email = data.email.toLowerCase();
    if (orgUsers(organizationId).some((u) => u.email.toLowerCase() === email)) {
      throw new EmployeeAdminError(
        "An employee with this email already exists in the organization.",
      );
    }
    validateReferences(organizationId, data, null);

    const now = new Date();
    const user: DemoUser = {
      userId: nextDemoId(store),
      organizationId,
      email,
      firstName: data.firstName,
      lastName: data.lastName ?? null,
      avatarUrl: null,
      designation: data.designation ?? null,
      // Employees extend platform users; role/permission administration
      // stays in Settings ▸ Members — new employees start as team members.
      roleId: "demo-role-team_member",
      departmentId: data.departmentId ?? null,
      employeeCode: nextDemoCode(
        store,
        store.organizations.find(
          (o: { organizationId: string }) => o.organizationId === organizationId,
        )?.codePrefix ?? "NEX",
      ),
      managerId: data.managerId ?? null,
      location: data.location ?? null,
      employmentType: data.employmentType ?? "full_time",
      hireDate: data.hireDate ?? now.toISOString().slice(0, 10),
      terminationDate: null,
      status: "active",
      createdAt: now,
      updatedAt: now,
      createdBy: actorUserId,
      updatedBy: actorUserId,
      deletedAt: null,
      deletedBy: null,
      isArchived: false,
    };
    store.users.push(user);
    logDemoActivity(
      store,
      "users",
      "create",
      "employee",
      user.userId,
      `Created employee ${fullName(user)} (${user.employeeCode})`,
      { email: user.email },
    );
    return { userId: user.userId };
  },

  async update(organizationId, actorUserId, data) {
    const user = requireUser(organizationId, data.userId);
    assertWritable(user);
    validateReferences(organizationId, data, user.userId);
    if (data.managerId) {
      await assertNoCycle(organizationId, user.userId, data.managerId);
    }

    if (data.firstName !== undefined) user.firstName = data.firstName;
    if (data.lastName !== undefined) user.lastName = data.lastName ?? null;
    if (data.designation !== undefined) {
      user.designation = data.designation ?? null;
    }
    if (data.departmentId !== undefined) {
      user.departmentId = data.departmentId;
    }
    if (data.managerId !== undefined) user.managerId = data.managerId;
    if (data.location !== undefined) user.location = data.location ?? null;
    if (data.employmentType !== undefined && data.employmentType) {
      user.employmentType = data.employmentType;
    }
    if (data.hireDate !== undefined) user.hireDate = data.hireDate ?? null;
    user.updatedAt = new Date();
    user.updatedBy = actorUserId;

    logDemoActivity(
      getDemoStore(),
      "users",
      "update",
      "employee",
      user.userId,
      `Updated employee ${fullName(user)}`,
    );
    return { userId: user.userId };
  },

  async setStatus(organizationId, actorUserId, data) {
    const user = requireUser(organizationId, data.userId);
    assertWritable(user);
    if (user.userId === actorUserId && data.status === "inactive") {
      throw new EmployeeAdminError("You cannot deactivate yourself.");
    }
    user.status = data.status;
    user.updatedAt = new Date();
    user.updatedBy = actorUserId;
    logDemoActivity(
      getDemoStore(),
      "users",
      "update",
      "employee",
      user.userId,
      `Set employee ${fullName(user)} status to ${data.status}`,
    );
    return { userId: user.userId };
  },

  async archive(organizationId, actorUserId, data) {
    const user = requireUser(organizationId, data.userId);
    assertWritable(user);
    if (user.userId === actorUserId) {
      throw new EmployeeAdminError("You cannot archive yourself.");
    }
    const reports = orgUsers(organizationId).filter(
      (u) => u.managerId === user.userId && !u.isArchived,
    );
    if (reports.length > 0) {
      throw new EmployeeAdminError(
        `Reassign ${reports.length} direct report${reports.length === 1 ? "" : "s"} before archiving this employee.`,
      );
    }
    user.status = "archived";
    user.isArchived = true;
    user.terminationDate =
      data.terminationDate ?? new Date().toISOString().slice(0, 10);
    user.updatedAt = new Date();
    user.updatedBy = actorUserId;
    logDemoActivity(
      getDemoStore(),
      "users",
      "archive",
      "employee",
      user.userId,
      `Archived employee ${fullName(user)}`,
    );
    return { userId: user.userId };
  },

  async restore(organizationId, actorUserId, userId) {
    const user = requireUser(organizationId, userId);
    if (!user.isArchived && user.status !== "archived") {
      throw new EmployeeAdminError("Employee is not archived.");
    }
    user.status = "active";
    user.isArchived = false;
    user.terminationDate = null;
    user.updatedAt = new Date();
    user.updatedBy = actorUserId;
    logDemoActivity(
      getDemoStore(),
      "users",
      "restore",
      "employee",
      user.userId,
      `Restored employee ${fullName(user)}`,
    );
    return { userId: user.userId };
  },
};
