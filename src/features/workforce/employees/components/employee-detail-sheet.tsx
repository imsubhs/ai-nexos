"use client";

/**
 * Read-only employee detail drawer (merge doc 16 S-12). Quick glance only —
 * the full profile with relationships and admin actions lives at
 * /workforce/employees/[userId] (Sprint 2 / WP-105C).
 */
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { EmployeeDirectoryEntry } from "../types";
import { EmployeeStatusBadge, employeeInitials, formatEmploymentType } from "./employee-badges";

function DetailRow({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value ?? "—"}</span>
    </div>
  );
}

export function EmployeeDetailSheet({
  employee,
  onClose,
}: Readonly<{
  employee: EmployeeDirectoryEntry | null;
  onClose: () => void;
}>) {
  return (
    <Sheet open={employee !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-md">
        {employee ? (
          <>
            <SheetHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 border border-border">
                  <AvatarImage
                    src={employee.avatarUrl ?? undefined}
                    alt={`${employee.firstName} ${employee.lastName}`}
                  />
                  <AvatarFallback className="bg-primary/5 font-semibold text-primary">
                    {employeeInitials(employee)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <SheetTitle>
                    {employee.firstName} {employee.lastName}
                  </SheetTitle>
                  <SheetDescription>{employee.designation ?? employee.email}</SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-1 px-4">
              <DetailRow label="Employee code" value={employee.employeeCode} />
              <DetailRow label="Email" value={employee.email} />
              <DetailRow label="Department" value={employee.departmentName} />
              <DetailRow label="Manager" value={employee.managerName} />
              <DetailRow label="Location" value={employee.location} />
              <DetailRow
                label="Employment type"
                value={formatEmploymentType(employee.employmentType)}
              />
              <Separator className="my-2" />
              <DetailRow
                label="Status"
                value={<EmployeeStatusBadge status={employee.entityStatus} />}
              />
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
              <Separator className="my-2" />
              <Button
                variant="outline"
                className="w-full"
                render={
                  <Link href={`/workforce/employees/${employee.userId}`} />
                }
              >
                Open full profile
              </Button>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
