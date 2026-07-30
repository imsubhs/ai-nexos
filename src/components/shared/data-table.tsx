"use client";

/**
 * Minimal DataTable (merge doc 16 K-1, WP-105 fallback clause): a generic,
 * server-driven list table on the shadcn table primitives. Data, filtering,
 * and pagination are owned by the caller (URL is the source of view state,
 * doc 16 global rules); this component renders rows and the pager.
 *
 * The full TanStack port (sort/visibility/selection/export slot) remains a
 * Phase 1.11 deliverable and replaces this file's internals, not its API.
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface DataTableColumn<Row> {
  key: string;
  header: string;
  className?: string;
  cell: (row: Row) => React.ReactNode;
}

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  total,
  page,
  pageSize,
  onPageChange,
  onRowClick,
  emptyState,
  ariaLabel,
}: Readonly<{
  columns: DataTableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onRowClick?: (row: Row) => void;
  emptyState: React.ReactNode;
  /** Accessible name for the table, e.g. "Deliverables". */
  ariaLabel: string;
}>) {
  if (total === 0) return <>{emptyState}</>;

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border">
        <Table aria-label={ariaLabel}>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              // A clickable row must also be reachable and activatable from
              // the keyboard, otherwise the row's drawer is mouse-only.
              <TableRow
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? "button" : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                className={
                  onRowClick
                    ? "focus-visible:ring-ring cursor-pointer focus-visible:ring-2 focus-visible:outline-none"
                    : undefined
                }
              >
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="text-muted-foreground flex items-center justify-between text-sm">
        <span>
          Showing {from}–{to} of {total}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span>
            Page {page} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
