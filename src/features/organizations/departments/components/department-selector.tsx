"use client";

/**
 * Searchable department selector (Sprint 2 / WP-105A). Client-side search
 * over the pre-fetched department list (orgs are well under the 100-row
 * page); reuses the dropdown-menu primitive like the directory filters.
 */
import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { DepartmentEntry } from "../types";

export function DepartmentSelector({
  departments,
  value,
  onChange,
  placeholder = "Select department",
  allowNone = true,
  disabled = false,
}: Readonly<{
  departments: DepartmentEntry[];
  value: string | null;
  onChange: (departmentId: string | null) => void;
  placeholder?: string;
  allowNone?: boolean;
  disabled?: boolean;
}>) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return departments;
    return departments.filter((d) => d.name.toLowerCase().includes(needle));
  }, [departments, search]);

  const selected = departments.find((d) => d.departmentId === value) ?? null;

  return (
    <DropdownMenu onOpenChange={(open) => !open && setSearch("")}>
      <DropdownMenuTrigger
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between font-normal"
          >
            <span className={selected ? "" : "text-muted-foreground"}>
              {selected ? selected.name : placeholder}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" aria-hidden="true" />
          </Button>
        }
      />
      <DropdownMenuContent
        align="start"
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
      >
        <div className="relative p-1" onKeyDown={(e) => e.stopPropagation()}>
          <Search
            className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search departments…"
            className="h-8 pl-8"
          />
        </div>
        <DropdownMenuSeparator />
        {allowNone ? (
          <DropdownMenuItem onClick={() => onChange(null)}>
            <span className="text-muted-foreground">No department</span>
            {value === null ? <Check className="ml-auto h-4 w-4" /> : null}
          </DropdownMenuItem>
        ) : null}
        {filtered.length === 0 ? (
          <div className="text-muted-foreground px-2 py-3 text-center text-sm">
            No departments match
          </div>
        ) : (
          filtered.map((d) => (
            <DropdownMenuItem
              key={d.departmentId}
              onClick={() => onChange(d.departmentId)}
            >
              <span>{d.name}</span>
              <span className="text-muted-foreground ml-2 text-xs">
                {d.memberCount} member{d.memberCount === 1 ? "" : "s"}
              </span>
              {value === d.departmentId ? (
                <Check className="ml-auto h-4 w-4" />
              ) : null}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
