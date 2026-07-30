"use client";

/**
 * Employees directory (merge doc 16 S-12): server-driven DataTable + detail
 * drawer over the E-1 read model. The URL query string is the single source
 * of view state — search/filter/page changes round-trip through the server
 * component, so `?search=&departmentId=` deep links work by construction.
 */
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, ContactRound, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import type { EmployeeDirectoryEntry } from "../types";
import { EmployeeDetailSheet } from "./employee-detail-sheet";
import { EmployeeStatusBadge, employeeInitials } from "./employee-badges";

const SEARCH_DEBOUNCE_MS = 300;

export interface DepartmentOption {
  departmentId: string;
  name: string;
}

export function EmployeesDirectory({
  rows,
  total,
  page,
  pageSize,
  departmentOptions,
}: Readonly<{
  rows: EmployeeDirectoryEntry[];
  total: number;
  page: number;
  pageSize: number;
  departmentOptions: DepartmentOption[];
}>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [selected, setSelected] = useState<EmployeeDirectoryEntry | null>(null);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    startTransition(() => {
      router.replace(`/workforce/employees?${params.toString()}`, {
        scroll: false,
      });
    });
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const onSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setParams({ search: value, page: null });
    }, SEARCH_DEBOUNCE_MS);
  };

  const activeDepartmentId = searchParams.get("departmentId");
  const activeDepartment = departmentOptions.find(
    (d) => d.departmentId === activeDepartmentId,
  );
  const activeStatus = searchParams.get("status");

  const columns: DataTableColumn<EmployeeDirectoryEntry>[] = [
    {
      key: "employee",
      header: "Employee",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="border-border h-8 w-8 border">
            <AvatarImage
              src={row.avatarUrl ?? undefined}
              alt={`${row.firstName} ${row.lastName}`}
            />
            <AvatarFallback className="bg-primary/5 text-primary text-xs font-semibold">
              {employeeInitials(row)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">
              {row.firstName} {row.lastName}
            </p>
            <p className="text-muted-foreground text-xs">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "employeeCode",
      header: "Code",
      cell: (row) => row.employeeCode ?? "—",
    },
    {
      key: "department",
      header: "Department",
      cell: (row) => row.departmentName ?? "—",
    },
    {
      key: "designation",
      header: "Designation",
      cell: (row) => row.designation ?? "—",
    },
    {
      key: "manager",
      header: "Manager",
      cell: (row) => row.managerName ?? "—",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <EmployeeStatusBadge status={row.entityStatus} />,
    },
    {
      key: "today",
      header: "Today",
      cell: (row) =>
        row.todayStatus ? (
          <Badge variant="secondary">{row.todayStatus}</Badge>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search name, email, or code…"
            className="pl-8"
            aria-label="Search employees"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm">
                {activeDepartment ? activeDepartment.name : "All departments"}
                <ChevronDown className="h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => setParams({ departmentId: null, page: null })}
            >
              All departments
            </DropdownMenuItem>
            {departmentOptions.map((department) => (
              <DropdownMenuItem
                key={department.departmentId}
                onClick={() =>
                  setParams({
                    departmentId: department.departmentId,
                    page: null,
                  })
                }
              >
                {department.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm">
                {activeStatus === "active"
                  ? "Active"
                  : activeStatus === "inactive"
                    ? "Inactive"
                    : activeStatus === "archived"
                      ? "Archived"
                      : "All statuses"}
                <ChevronDown className="h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => setParams({ status: null, page: null })}
            >
              All statuses
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setParams({ status: "active", page: null })}
            >
              Active
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setParams({ status: "inactive", page: null })}
            >
              Inactive
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setParams({ status: "archived", page: null })}
            >
              Archived
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DataTable
        columns={columns}
        ariaLabel="Employees"
        rows={rows}
        rowKey={(row) => row.userId}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={(nextPage) => setParams({ page: String(nextPage) })}
        onRowClick={(row) => setSelected(row)}
        emptyState={
          <EmptyState
            icon={ContactRound}
            title="No employees found"
            description="No one in the directory matches the current search and filters. Clear a filter to see the full directory."
          />
        }
      />

      <EmployeeDetailSheet
        employee={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
