import { Badge } from "@/components/ui/badge";
import type { EmployeeDirectoryEntry } from "../types";

export function employeeInitials(employee: EmployeeDirectoryEntry): string {
  return `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}`.toUpperCase();
}

export function formatEmploymentType(employmentType: string | null): string | null {
  if (!employmentType) return null;
  return employmentType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const STATUS_LABELS: Record<EmployeeDirectoryEntry["entityStatus"], string> = {
  active: "Active",
  inactive: "Inactive",
  archived: "Archived",
};

export function EmployeeStatusBadge({
  status,
}: Readonly<{ status: EmployeeDirectoryEntry["entityStatus"] }>) {
  return (
    <Badge
      variant={
        status === "active"
          ? "default"
          : status === "archived"
            ? "outline"
            : "secondary"
      }
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}
