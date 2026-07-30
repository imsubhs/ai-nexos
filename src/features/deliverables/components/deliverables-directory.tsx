"use client";

/**
 * Deliverables workspace directory (Sprint 11A resumed / Sprint 11B read
 * layer). Server-driven DataTable + detail drawer over getDeliverables() /
 * searchDeliverables(), mirroring the Employees directory pattern (URL query
 * string is the single source of view state).
 */
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, FileText, Search } from "lucide-react";
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
import { StatusBadge } from "@/components/shared/status-badge";
import type { deliverables } from "@/db/schema/deliverables";
import { DELIVERABLE_STATUSES, humanizeToken } from "../constants";
import {
  CreateDeliverableDialog,
  type ProjectOption,
} from "./create-deliverable-dialog";
import { DeliverableDetailSheet } from "./deliverable-detail-sheet";

export type Deliverable = typeof deliverables.$inferSelect;

const SEARCH_DEBOUNCE_MS = 300;

export function DeliverablesDirectory({
  rows,
  total,
  page,
  pageSize,
  projects,
}: Readonly<{
  rows: Deliverable[];
  total: number;
  page: number;
  pageSize: number;
  /** Targets for "New Deliverable" — createDeliverable requires a project. */
  projects: ProjectOption[];
}>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    startTransition(() => {
      router.replace(`/deliverables?${params.toString()}`, { scroll: false });
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

  const activeStatus = searchParams.get("status");

  const columns: DataTableColumn<Deliverable>[] = [
    {
      key: "title",
      header: "Title",
      cell: (row) => <span className="font-medium">{row.title}</span>,
    },
    {
      key: "type",
      header: "Type",
      cell: (row) => (
        <span className="text-muted-foreground text-sm">
          {row.type ? humanizeToken(row.type) : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (row) => new Date(row.createdAt).toLocaleDateString(),
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
            placeholder="Search deliverables by title…"
            className="pl-8"
            aria-label="Search deliverables"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm">
                {activeStatus
                  ? activeStatus.replaceAll("_", " ")
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
            {DELIVERABLE_STATUSES.map((status) => (
              <DropdownMenuItem
                key={status}
                onClick={() => setParams({ status, page: null })}
              >
                {status.replaceAll("_", " ")}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto">
          <CreateDeliverableDialog projects={projects} />
        </div>
      </div>

      <DataTable
        columns={columns}
        ariaLabel="Deliverables"
        rows={rows}
        rowKey={(row) => row.deliverableId}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={(nextPage) => setParams({ page: String(nextPage) })}
        onRowClick={(row) => setSelectedId(row.deliverableId)}
        emptyState={
          <EmptyState
            icon={FileText}
            title="No deliverables found"
            description="No deliverables match the current search and filters. Clear a filter to see everything."
          />
        }
      />

      <DeliverableDetailSheet
        deliverableId={selectedId}
        onClose={() => setSelectedId(null)}
        onChanged={() => startTransition(() => router.refresh())}
      />
    </div>
  );
}
