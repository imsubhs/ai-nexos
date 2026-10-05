"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ClientCard } from "./client-card";
import { ClientEmptyState } from "./client-empty-state";
import { Search, X, Building2 } from "lucide-react";
import type { clients } from "@/db/schema";

type ClientRow = typeof clients.$inferSelect & {
  activeProjectsCount?: number;
  primaryContact?: {
    name: string;
    email?: string | null;
  } | null;
};

interface ClientDirectoryFiltersProps {
  clients: ClientRow[];
}

export function ClientDirectoryFilters({
  clients,
}: ClientDirectoryFiltersProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [healthFilter, setHealthFilter] = useState<string>("all");

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      // Search match
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !query ||
        client.companyName.toLowerCase().includes(query) ||
        (client.industry && client.industry.toLowerCase().includes(query)) ||
        (client.country && client.country.toLowerCase().includes(query)) ||
        (client.website && client.website.toLowerCase().includes(query));

      // Status match
      const clientStatus = (client.status || "").toLowerCase();
      let matchesStatus = true;
      if (statusFilter === "active") {
        matchesStatus = clientStatus === "active";
      } else if (statusFilter === "prospect") {
        matchesStatus = clientStatus === "prospect" || clientStatus === "lead";
      } else if (statusFilter === "archived") {
        matchesStatus = clientStatus === "archived";
      }

      // Health match
      let matchesHealth = true;
      const clientHealth = (client.clientHealth || "").toLowerCase();
      if (healthFilter === "good") {
        matchesHealth = clientHealth === "good" || clientHealth === "excellent";
      } else if (healthFilter === "at_risk") {
        matchesHealth = clientHealth === "at_risk" || clientHealth === "fair";
      } else if (healthFilter === "critical") {
        matchesHealth = clientHealth === "critical" || clientHealth === "poor";
      }

      return matchesSearch && matchesStatus && matchesHealth;
    });
  }, [clients, searchTerm, statusFilter, healthFilter]);

  const counts = useMemo(() => {
    return {
      all: clients.length,
      active: clients.filter((c) => (c.status || "").toLowerCase() === "active")
        .length,
      prospect: clients.filter(
        (c) =>
          (c.status || "").toLowerCase() === "prospect" ||
          (c.status || "").toLowerCase() === "lead",
      ).length,
      archived: clients.filter(
        (c) => (c.status || "").toLowerCase() === "archived",
      ).length,
    };
  }, [clients]);

  const hasFiltersActive =
    searchTerm !== "" || statusFilter !== "all" || healthFilter !== "all";

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setHealthFilter("all");
  };

  return (
    <div className="space-y-6">
      {/* Filter toolbar: search bar + status pills + health selector */}
      <div className="border-border-subtle bg-surface-1 flex flex-col items-stretch justify-between gap-3 rounded-lg border p-2 sm:flex-row sm:items-center">
        {/* Search input */}
        <div className="relative min-w-[200px] flex-1">
          <Search className="text-foreground-muted pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter clients by name, industry, or region..."
            className="bg-surface-2 border-border-subtle h-8 pr-8 pl-8.5 text-xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="text-foreground-muted hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`cursor-pointer rounded-[4px] px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === "all"
                ? "bg-surface-3 text-foreground font-semibold shadow-xs"
                : "text-foreground-muted hover:text-foreground hover:bg-surface-2"
            }`}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`cursor-pointer rounded-[4px] px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === "active"
                ? "bg-surface-3 font-semibold text-emerald-400 shadow-xs"
                : "text-foreground-muted hover:text-foreground hover:bg-surface-2"
            }`}
          >
            Active ({counts.active})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("prospect")}
            className={`cursor-pointer rounded-[4px] px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === "prospect"
                ? "bg-surface-3 font-semibold text-sky-400 shadow-xs"
                : "text-foreground-muted hover:text-foreground hover:bg-surface-2"
            }`}
          >
            Prospects ({counts.prospect})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("archived")}
            className={`cursor-pointer rounded-[4px] px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === "archived"
                ? "bg-surface-3 text-foreground font-semibold shadow-xs"
                : "text-foreground-muted hover:text-foreground hover:bg-surface-2"
            }`}
          >
            Archived ({counts.archived})
          </button>
        </div>

        {/* Health filter */}
        <div className="flex shrink-0 items-center gap-2">
          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
            className="border-border-subtle bg-surface-2 text-foreground focus:ring-brand-primary h-8 cursor-pointer rounded-md border px-2 text-xs focus:ring-1 focus:outline-none"
          >
            <option value="all">All Health</option>
            <option value="good">Good Health</option>
            <option value="at_risk">At Risk</option>
            <option value="critical">Critical</option>
          </select>

          {hasFiltersActive && (
            <Button
              variant="ghost"
              size="xs"
              onClick={clearFilters}
              className="text-foreground-muted hover:text-foreground gap-1"
            >
              <X className="size-3" />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>

      {/* Grid or Empty state */}
      {filteredClients.length === 0 ? (
        <ClientEmptyState
          icon={Building2}
          title={
            hasFiltersActive ? "No matching clients found" : "No clients yet"
          }
          description={
            hasFiltersActive
              ? "No client accounts match the active search or status filters. Try clearing your filters."
              : "Get started by adding your first client to manage accounts, project assignments, and brand assets."
          }
          action={
            hasFiltersActive
              ? { label: "Clear Filters", onClick: clearFilters }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <ClientCard key={client.clientId} client={client} />
          ))}
        </div>
      )}
    </div>
  );
}
