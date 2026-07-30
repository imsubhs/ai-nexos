"use client";

/**
 * "Add employee" entry point (Sprint 2 / WP-105D). Rendered by the
 * directory page only when the viewer holds `users.create`.
 */
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DepartmentEntry } from "@/features/organizations/departments/types";
import { EmployeeFormDialog, type ManagerOption } from "./employee-form-dialog";

export function EmployeeCreateButton({
  departments,
  managerOptions,
}: Readonly<{
  departments: DepartmentEntry[];
  managerOptions: ManagerOption[];
}>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        Add employee
      </Button>
      <EmployeeFormDialog
        open={open}
        onOpenChange={setOpen}
        employee={null}
        departments={departments}
        managerOptions={managerOptions}
      />
    </>
  );
}
