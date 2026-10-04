import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Building2, Users } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireCurrentUser } from "@/features/auth/current-user";
import { hasPermission } from "@/features/permissions/engine";
import { listDepartmentsAction } from "@/features/organizations/departments/actions";
import {
  getEmployeeAction,
  listDirectReportsAction,
  listEmployeesAction,
} from "@/features/workforce/employees/actions";
import {
  EmployeeStatusBadge,
  employeeInitials,
  formatEmploymentType,
} from "@/features/workforce/employees/components/employee-badges";
import { EmployeeAdminPanel } from "@/features/workforce/employees/components/employee-admin-panel";
import type { EmployeeDirectoryEntry } from "@/features/workforce/employees/types";

export const metadata = {
  title: "Employee",
};

function DetailRow({
  label,
  value,
}: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-right text-sm font-medium">{value ?? "—"}</span>
    </div>
  );
}

function fullName(e: Pick<EmployeeDirectoryEntry, "firstName" | "lastName">) {
  return [e.firstName, e.lastName].filter(Boolean).join(" ");
}

/**
 * Employee profile (Sprint 2 / WP-105C): identity + employment detail with
 * relationship navigation — manager, department, and direct reports all
 * link onward. Admin actions render only for permitted viewers.
 */
export default async function EmployeeDetailPage({
  params,
}: Readonly<{ params: Promise<{ userId: string }> }>) {
  const user = await requireCurrentUser();
  if (!hasPermission(user.permissions, "users", "read")) {
    redirect("/unauthorized");
  }

  const { userId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(userId)) notFound();

  const employee = await getEmployeeAction({ userId });
  if (!employee) notFound();

  const canUpdate = hasPermission(user.permissions, "users", "update");
  const canArchive = hasPermission(user.permissions, "users", "archive");
  const canRestore = hasPermission(user.permissions, "users", "restore");
  const canReadDepartments = hasPermission(
    user.permissions,
    "departments",
    "read",
  );

  const [reports, departmentsResult, colleagues] = await Promise.all([
    listDirectReportsAction({ managerId: employee.userId }),
    canReadDepartments
      ? listDepartmentsAction({ status: "active" })
      : Promise.resolve({ rows: [], total: 0 }),
    canUpdate
      ? listEmployeesAction({ status: "active", pageSize: 100 })
      : Promise.resolve({ rows: [], total: 0 }),
  ]);

  const managerOptions = colleagues.rows
    .filter((c) => c.userId !== employee.userId)
    .map((c) => ({ userId: c.userId, name: fullName(c) }));

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <Breadcrumb className="mb-2">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/workforce/employees" />}>
              Employees
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="max-w-[200px] truncate sm:max-w-[400px]">
              {fullName(employee)}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="border-border h-16 w-16 border">
            <AvatarImage
              src={employee.avatarUrl ?? undefined}
              alt={fullName(employee)}
            />
            <AvatarFallback className="bg-primary/5 text-primary text-lg font-semibold">
              {employeeInitials(employee)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">
                {fullName(employee)}
              </h2>
              <EmployeeStatusBadge status={employee.entityStatus} />
            </div>
            <p className="text-muted-foreground text-sm">
              {employee.designation ?? "—"}
              {employee.employeeCode ? ` · ${employee.employeeCode}` : ""}
            </p>
          </div>
        </div>

        {canUpdate || canArchive || canRestore ? (
          <EmployeeAdminPanel
            employee={employee}
            departments={departmentsResult.rows}
            managerOptions={managerOptions}
            canUpdate={canUpdate}
            canArchive={canArchive}
            canRestore={canRestore}
          />
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Employment</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailRow label="Email" value={employee.email} />
            <DetailRow label="Employee code" value={employee.employeeCode} />
            <DetailRow
              label="Employment type"
              value={formatEmploymentType(employee.employmentType)}
            />
            <DetailRow label="Location" value={employee.location} />
            <DetailRow label="Hire date" value={employee.hireDate} />
            {employee.terminationDate ? (
              <DetailRow
                label="Termination date"
                value={employee.terminationDate}
              />
            ) : null}
            <Separator className="my-2" />
            <DetailRow
              label="Today"
              value={
                employee.todayStatus ? (
                  <Badge variant="secondary">{employee.todayStatus}</Badge>
                ) : (
                  "—"
                )
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organization</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailRow
              label="Department"
              value={
                employee.departmentId && employee.departmentName ? (
                  <Link
                    href={`/workforce/employees?departmentId=${employee.departmentId}`}
                    className="text-primary inline-flex items-center gap-1 hover:underline"
                  >
                    <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {employee.departmentName}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <DetailRow
              label="Manager"
              value={
                employee.managerId && employee.managerName ? (
                  <Link
                    href={`/workforce/employees/${employee.managerId}`}
                    className="text-primary hover:underline"
                  >
                    {employee.managerName}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <Separator className="my-2" />
            <div className="py-2">
              <div className="text-muted-foreground mb-2 flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" aria-hidden="true" />
                Direct reports ({reports.length})
              </div>
              {reports.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No direct reports.
                </p>
              ) : (
                <ul className="space-y-1">
                  {reports.map((report) => (
                    <li key={report.userId}>
                      <Link
                        href={`/workforce/employees/${report.userId}`}
                        className="hover:bg-muted flex items-center justify-between rounded-md px-2 py-1.5 text-sm"
                      >
                        <span className="font-medium">{fullName(report)}</span>
                        <span className="text-muted-foreground">
                          {report.designation ?? ""}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
