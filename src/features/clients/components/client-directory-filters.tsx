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

export function ClientDirectoryFilters({ clients }: ClientDirectoryFiltersProps) {
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
      active: clients.filter((c) => (c.status || "").toLowerCase() === "active").length,
      prospect: clients.filter(
        (c) =>
          (c.status || "").toLowerCase() === "prospect" ||
          (c.status || "").toLowerCase() === "lead",
      ).length,
      archived: clients.filter((c) => (c.status || "").toLowerCase() === "archived").length,
    };
  }, [clients]);

  const hasFiltersActive = searchTerm !== "" || statusFilter !== "all" || healthFilter !== "all";

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setHealthFilter("all");
  };

  return (
    <div className="space-y-6">
      {/* Filter toolbar: search bar + status pills + health selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 rounded-lg border border-border-subtle bg-surface-1">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-foreground-muted pointer-events-none" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter clients by name, industry, or region..."
            className="pl-8.5 pr-8 h-8 text-xs bg-surface-2 border-border-subtle"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground cursor-pointer"
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
            className={`px-2.5 py-1 rounded-[4px] text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
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
            className={`px-2.5 py-1 rounded-[4px] text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
              statusFilter === "active"
                ? "bg-surface-3 text-emerald-400 font-semibold shadow-xs"
                : "text-foreground-muted hover:text-foreground hover:bg-surface-2"
            }`}
          >
            Active ({counts.active})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("prospect")}
            className={`px-2.5 py-1 rounded-[4px] text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
              statusFilter === "prospect"
                ? "bg-surface-3 text-sky-400 font-semibold shadow-xs"
                : "text-foreground-muted hover:text-foreground hover:bg-surface-2"
            }`}
          >
            Prospects ({counts.prospect})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("archived")}
            className={`px-2.5 py-1 rounded-[4px] text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
              statusFilter === "archived"
                ? "bg-surface-3 text-foreground font-semibold shadow-xs"
                : "text-foreground-muted hover:text-foreground hover:bg-surface-2"
            }`}
          >
            Archived ({counts.archived})
          </button>
        </div>

        {/* Health filter */}
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
            className="h-8 px-2 rounded-md border border-border-subtle bg-surface-2 text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer"
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
          title={hasFiltersActive ? "No matching clients found" : "No clients yet"}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <ClientCard key={client.clientId} client={client} />
          ))}
        </div>
      )}
    </div>
  );
}
