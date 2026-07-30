"use client";

/**
 * Employee create/edit form (Sprint 2 / WP-105D) — shared Dialog pattern.
 * Submits to the Identity admin actions (merge doc 14 §13.1: employee
 * administration writes platform users); org-aware invariants (email
 * uniqueness, department/manager membership, manager cycles) are enforced
 * server-side and surfaced as inline errors here.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ChevronDown } from "lucide-react";
import { DepartmentSelector } from "@/features/organizations/departments/components/department-selector";
import type { DepartmentEntry } from "@/features/organizations/departments/types";
import {
  createEmployeeAction,
  updateEmployeeAction,
} from "@/features/users/admin/actions";
import {
  EMPLOYMENT_TYPES,
  type EmploymentType,
} from "@/features/users/admin/schemas";
import { formatEmploymentType } from "./employee-badges";
import type { EmployeeDirectoryEntry } from "../types";

export interface ManagerOption {
  userId: string;
  name: string;
}

type FormState = {
  email: string;
  firstName: string;
  lastName: string;
  designation: string;
  location: string;
  hireDate: string;
  employmentType: EmploymentType;
  departmentId: string | null;
  managerId: string | null;
};

function initialState(employee: EmployeeDirectoryEntry | null): FormState {
  return {
    email: employee?.email ?? "",
    firstName: employee?.firstName ?? "",
    lastName: employee?.lastName ?? "",
    designation: employee?.designation ?? "",
    location: employee?.location ?? "",
    hireDate: employee?.hireDate ?? "",
    employmentType: (EMPLOYMENT_TYPES as readonly string[]).includes(
      employee?.employmentType ?? "",
    )
      ? (employee?.employmentType as EmploymentType)
      : "full_time",
    departmentId: employee?.departmentId ?? null,
    managerId: employee?.managerId ?? null,
  };
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  departments,
  managerOptions,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null → create mode; entry → edit mode. */
  employee: EmployeeDirectoryEntry | null;
  departments: DepartmentEntry[];
  managerOptions: ManagerOption[];
}>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(() => initialState(employee));
  const [error, setError] = useState<string | null>(null);

  const isEdit = employee !== null;
  const eligibleManagers = managerOptions.filter(
    (m) => m.userId !== employee?.userId,
  );
  const selectedManager =
    eligibleManagers.find((m) => m.userId === form.managerId) ?? null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setForm(initialState(employee));
      setError(null);
    }
    onOpenChange(next);
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const shared = {
        firstName: form.firstName,
        lastName: form.lastName || undefined,
        designation: form.designation || undefined,
        location: form.location || undefined,
        hireDate: form.hireDate || undefined,
        employmentType: form.employmentType,
        departmentId: form.departmentId,
        managerId: form.managerId,
      };
      const result = isEdit
        ? await updateEmployeeAction({ userId: employee.userId, ...shared })
        : await createEmployeeAction({ email: form.email, ...shared });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit employee" : "Add employee"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update employment details. Email and role administration stay in Settings ▸ Members."
              : "New employees join as platform users with the team-member role."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {!isEdit ? (
            <div className="grid gap-2">
              <Label htmlFor="employee-email">Email</Label>
              <Input
                id="employee-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="person@company.com"
              />
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="employee-first-name">First name</Label>
              <Input
                id="employee-first-name"
                required
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="employee-last-name">Last name</Label>
              <Input
                id="employee-last-name"
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="employee-designation">Designation</Label>
              <Input
                id="employee-designation"
                value={form.designation}
                onChange={(e) => set("designation", e.target.value)}
                placeholder="e.g. Designer"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="employee-location">Location</Label>
              <Input
                id="employee-location"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="e.g. Remote"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="employee-hire-date">Hire date</Label>
              <Input
                id="employee-hire-date"
                type="date"
                value={form.hireDate}
                onChange={(e) => set("hireDate", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Employment type</Label>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className="justify-between font-normal"
                    >
                      {formatEmploymentType(form.employmentType)}
                      <ChevronDown
                        className="h-4 w-4 opacity-50"
                        aria-hidden="true"
                      />
                    </Button>
                  }
                />
                <DropdownMenuContent align="start">
                  {EMPLOYMENT_TYPES.map((type) => (
                    <DropdownMenuItem
                      key={type}
                      onClick={() => set("employmentType", type)}
                    >
                      {formatEmploymentType(type)}
                      {form.employmentType === type ? (
                        <Check className="ml-auto h-4 w-4" />
                      ) : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Department</Label>
            <DepartmentSelector
              departments={departments}
              value={form.departmentId}
              onChange={(departmentId) => set("departmentId", departmentId)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Manager</Label>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between font-normal"
                  >
                    <span
                      className={selectedManager ? "" : "text-muted-foreground"}
                    >
                      {selectedManager ? selectedManager.name : "No manager"}
                    </span>
                    <ChevronDown
                      className="h-4 w-4 opacity-50"
                      aria-hidden="true"
                    />
                  </Button>
                }
              />
              <DropdownMenuContent
                align="start"
                className="max-h-64 w-(--radix-dropdown-menu-trigger-width) overflow-y-auto"
              >
                <DropdownMenuItem onClick={() => set("managerId", null)}>
                  <span className="text-muted-foreground">No manager</span>
                  {form.managerId === null ? (
                    <Check className="ml-auto h-4 w-4" />
                  ) : null}
                </DropdownMenuItem>
                {eligibleManagers.map((m) => (
                  <DropdownMenuItem
                    key={m.userId}
                    onClick={() => set("managerId", m.userId)}
                  >
                    {m.name}
                    {form.managerId === m.userId ? (
                      <Check className="ml-auto h-4 w-4" />
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? "Saving…"
                : isEdit
                  ? "Save changes"
                  : "Add employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
