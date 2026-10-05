"use client";

/**
 * Deliverables workspace directory.
 * Phase 4F: Search, Project / Type / Status filtering, project mapping,
 * detail sheet with attached creative assets and download capabilities.
 */
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, FileText, FolderOpen, Search } from "lucide-react";
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
import {
  DELIVERABLE_STATUSES,
  DELIVERABLE_TYPES,
  humanizeToken,
} from "../constants";
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

  const activeProjectId = searchParams.get("projectId");
  const activeType = searchParams.get("type");
  const activeStatus = searchParams.get("status");

  const activeProjectName = projects.find(
    (p) => p.projectId === activeProjectId,
  )?.projectName;

  const columns: DataTableColumn<Deliverable>[] = [
    {
      key: "title",
      header: "Deliverable Title",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <FileText className="text-brand-primary size-4 shrink-0" />
          <span className="text-foreground font-medium">{row.title}</span>
        </div>
      ),
    },
    {
      key: "project",
      header: "Project",
      cell: (row) => {
        const proj = projects.find((p) => p.projectId === row.projectId);
        return (
          <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <FolderOpen className="size-3.5 shrink-0 opacity-70" />
            <span className="truncate">{proj?.projectName || "—"}</span>
          </span>
        );
      },
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
      cell: (row) => (
        <span className="text-muted-foreground text-xs">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-[280px] flex-1 flex-wrap items-center gap-2">
          {/* Search bar */}
          <div className="relative w-full max-w-xs">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search deliverables by title…"
              className="h-9 pl-8"
              aria-label="Search deliverables"
            />
          </div>

          {/* Project Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" className="h-9">
                  <span className="max-w-[130px] truncate">
                    {activeProjectName ? activeProjectName : "All Projects"}
                  </span>
                  <ChevronDown className="ml-1 h-4 w-4 opacity-70" />
                </Button>
              }
            />
            <DropdownMenuContent
              align="start"
              className="max-h-64 overflow-y-auto"
            >
              <DropdownMenuItem
                onClick={() => setParams({ projectId: null, page: null })}
              >
                All Projects
              </DropdownMenuItem>
              {projects.map((proj) => (
                <DropdownMenuItem
                  key={proj.projectId}
                  onClick={() =>
                    setParams({ projectId: proj.projectId, page: null })
                  }
                >
                  {proj.projectName}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Type Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" className="h-9">
                  <span>
                    {activeType ? humanizeToken(activeType) : "All Types"}
                  </span>
                  <ChevronDown className="ml-1 h-4 w-4 opacity-70" />
                </Button>
              }
            />
            <DropdownMenuContent
              align="start"
              className="max-h-64 overflow-y-auto"
            >
              <DropdownMenuItem
                onClick={() => setParams({ type: null, page: null })}
              >
                All Types
              </DropdownMenuItem>
              {DELIVERABLE_TYPES.map((t) => (
                <DropdownMenuItem
                  key={t}
                  onClick={() => setParams({ type: t, page: null })}
                >
                  {humanizeToken(t)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" className="h-9">
                  <span>
                    {activeStatus
                      ? humanizeToken(activeStatus)
                      : "All Statuses"}
                  </span>
                  <ChevronDown className="ml-1 h-4 w-4 opacity-70" />
                </Button>
              }
            />
            <DropdownMenuContent
              align="start"
              className="max-h-64 overflow-y-auto"
            >
              <DropdownMenuItem
                onClick={() => setParams({ status: null, page: null })}
              >
                All Statuses
              </DropdownMenuItem>
              {DELIVERABLE_STATUSES.map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => setParams({ status, page: null })}
                >
                  {humanizeToken(status)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear Filters (if active) */}
          {(activeProjectId || activeType || activeStatus || search) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground h-9 text-xs"
              onClick={() =>
                setParams({
                  projectId: null,
                  type: null,
                  status: null,
                  search: null,
                  page: null,
                })
              }
            >
              Reset filters
            </Button>
          )}
        </div>

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
            description={
              search || activeProjectId || activeType || activeStatus
                ? "No deliverables match the current search and filters. Clear a filter to see everything."
                : "No deliverables have been created in this organization yet."
            }
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
