import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/features/auth/current-user";
import { hasPermission } from "@/features/permissions/engine";
import { listDepartmentsAction } from "@/features/organizations/departments/actions";
import { listEmployeesAction } from "@/features/workforce/employees/actions";
import { EmployeeCreateButton } from "@/features/workforce/employees/components/employee-create-button";
import {
  EmployeesDirectory,
  type DepartmentOption,
} from "@/features/workforce/employees/components/employees-directory";

export const metadata = {
  title: "Employees",
};

const PAGE_SIZE = 25;

/**
 * Org directory (merge doc 16 S-12, doc 13 §2 note 3) — read-only workforce
 * lens over platform users; administration stays in Settings ▸ Members.
 * Deep links `?search=&departmentId=&status=&page=` resolve server-side.
 */
export default async function EmployeesPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{
    search?: string;
    departmentId?: string;
    status?: string;
    page?: string;
  }>;
}>) {
  const user = await requireCurrentUser();
  if (!hasPermission(user.permissions, "users", "read")) {
    redirect("/unauthorized");
  }

  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const status =
    params.status === "active" ||
    params.status === "inactive" ||
    params.status === "archived"
      ? params.status
      : undefined;
  // Invalid uuid deep links degrade to the unfiltered directory rather than a 500.
  const departmentId = /^[0-9a-f-]{36}$/i.test(params.departmentId ?? "")
    ? params.departmentId
    : undefined;

  // Sprint 2 (WP-105A) closed the departments-list gap: filter options come
  // from the Department slice when the viewer can read departments; other
  // viewers keep the WP-105 directory-derived fallback.
  const canReadDepartments = hasPermission(
    user.permissions,
    "departments",
    "read",
  );
  const canCreate = hasPermission(user.permissions, "users", "create");

  // The directory page, the department filter options, and the manager
  // options are three independent reads — they were awaited one after
  // another, so the page waited for the sum of their latencies.
  const [directory, departmentSource, managerSource] = await Promise.all([
    listEmployeesAction({
      search: params.search || undefined,
      departmentId,
      status,
      page,
      pageSize: PAGE_SIZE,
    }),
    canReadDepartments
      ? listDepartmentsAction({ status: "active" })
      : listEmployeesAction({ pageSize: 100 }),
    canCreate
      ? listEmployeesAction({ status: "active", pageSize: 100 })
      : Promise.resolve(null),
  ]);

  const { rows, total } = directory;

  // Raw department rows for the create form — empty for viewers who cannot
  // read departments, matching the previous behaviour.
  const departmentRows = canReadDepartments
    ? (departmentSource as Awaited<ReturnType<typeof listDepartmentsAction>>)
        .rows
    : [];

  let departmentOptions: DepartmentOption[];
  if (canReadDepartments) {
    departmentOptions = departmentRows.map((d) => ({
      departmentId: d.departmentId,
      name: d.name,
    }));
  } else {
    const unfiltered = departmentSource as Awaited<
      ReturnType<typeof listEmployeesAction>
    >;
    departmentOptions = Array.from(
      new Map(
        unfiltered.rows
          .filter((row) => row.departmentId && row.departmentName)
          .map((row) => [
            row.departmentId as string,
            {
              departmentId: row.departmentId as string,
              name: row.departmentName as string,
            },
          ]),
      ).values(),
    ).sort((a, b) => a.name.localeCompare(b.name));
  }

  const managerOptions = managerSource
    ? managerSource.rows.map((row) => ({
        userId: row.userId,
        name: [row.firstName, row.lastName].filter(Boolean).join(" "),
      }))
    : [];

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground text-sm">
            Org directory. Role and permission administration lives in Settings
            ▸ Members.
          </p>
        </div>
        {canCreate ? (
          <EmployeeCreateButton
            departments={departmentRows}
            managerOptions={managerOptions}
          />
        ) : null}
      </div>
      <EmployeesDirectory
        rows={rows}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        departmentOptions={departmentOptions}
      />
    </div>
  );
}
