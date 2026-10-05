"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "./project-card";
import { Search, X, FolderKanban } from "lucide-react";

export type ProjectRow = Record<string, unknown> & {
  projectId: string;
  projectName: string;
  projectCode: string;
  description?: string | null;
  status: string;
  healthStatus: string;
  priority: string;
  estimatedEndDate?: Date | string | null;
  completionPercentage: number;
  clientId?: string | null;
  client?: { clientId?: string; companyName: string } | null;
  manager?: { name?: string | null } | null;
};

interface ProjectDirectoryFiltersProps {
  projects: ProjectRow[];
  onCreateClick?: () => void;
}

export function ProjectDirectoryFilters({
  projects,
  onCreateClick,
}: ProjectDirectoryFiltersProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [healthFilter, setHealthFilter] = useState<string>("all");

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Search match
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !query ||
        project.projectName.toLowerCase().includes(query) ||
        (project.projectCode &&
          project.projectCode.toLowerCase().includes(query)) ||
        (project.client?.companyName &&
          project.client.companyName.toLowerCase().includes(query)) ||
        (project.description &&
          project.description.toLowerCase().includes(query)) ||
        (project.manager?.name &&
          project.manager.name.toLowerCase().includes(query));

      // Status match
      const pStatus = (project.status || "").toLowerCase();
      let matchesStatus = true;
      if (statusFilter === "planning") {
        matchesStatus =
          pStatus === "planning" ||
          pStatus === "research" ||
          pStatus === "brief_received";
      } else if (statusFilter === "in_progress") {
        matchesStatus = pStatus === "in_progress";
      } else if (statusFilter === "review") {
        matchesStatus =
          pStatus === "internal_review" ||
          pStatus === "client_review" ||
          pStatus === "revision";
      } else if (statusFilter === "completed") {
        matchesStatus = pStatus === "completed" || pStatus === "approved";
      } else if (statusFilter === "on_hold") {
        matchesStatus = pStatus === "on_hold";
      }

      // Health match
      let matchesHealth = true;
      const pHealth = (project.healthStatus || "").toLowerCase();
      if (healthFilter !== "all") {
        matchesHealth = pHealth === healthFilter;
      }

      return matchesSearch && matchesStatus && matchesHealth;
    });
  }, [projects, searchTerm, statusFilter, healthFilter]);

  const counts = useMemo(() => {
    return {
      all: projects.length,
      planning: projects.filter((p) => {
        const s = (p.status || "").toLowerCase();
        return s === "planning" || s === "research" || s === "brief_received";
      }).length,
      inProgress: projects.filter(
        (p) => (p.status || "").toLowerCase() === "in_progress",
      ).length,
      review: projects.filter((p) => {
        const s = (p.status || "").toLowerCase();
        return (
          s === "internal_review" || s === "client_review" || s === "revision"
        );
      }).length,
      completed: projects.filter((p) => {
        const s = (p.status || "").toLowerCase();
        return s === "completed" || s === "approved";
      }).length,
    };
  }, [projects]);

  const hasFiltersActive =
    searchTerm !== "" || statusFilter !== "all" || healthFilter !== "all";

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setHealthFilter("all");
  };

  return (
    <div className="space-y-6">
      {/* Filter toolbar */}
      <div className="border-border bg-surface-1 flex flex-col items-stretch justify-between gap-3 rounded-xl border p-2 sm:flex-row sm:items-center">
        {/* Search input */}
        <div className="relative min-w-[200px] flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search projects by name, code, client, or lead..."
            className="bg-surface-2 border-border/80 text-foreground h-8 pr-8 pl-8.5 text-xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer"
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
                : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
            }`}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("planning")}
            className={`cursor-pointer rounded-[4px] px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === "planning"
                ? "bg-surface-3 font-semibold text-sky-400 shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
            }`}
          >
            Planning ({counts.planning})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("in_progress")}
            className={`cursor-pointer rounded-[4px] px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === "in_progress"
                ? "bg-surface-3 text-brand-primary font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
            }`}
          >
            In Progress ({counts.inProgress})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("review")}
            className={`cursor-pointer rounded-[4px] px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === "review"
                ? "bg-surface-3 font-semibold text-amber-400 shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
            }`}
          >
            Review ({counts.review})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("completed")}
            className={`cursor-pointer rounded-[4px] px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === "completed"
                ? "bg-surface-3 font-semibold text-emerald-400 shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
            }`}
          >
            Completed ({counts.completed})
          </button>
        </div>

        {/* Health filter */}
        <div className="flex shrink-0 items-center gap-2">
          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
            className="border-border/80 bg-surface-2 text-foreground focus:ring-brand-primary h-8 cursor-pointer rounded-md border px-2 text-xs focus:ring-1 focus:outline-none"
          >
            <option value="all">All Health</option>
            <option value="on_track">On Track</option>
            <option value="at_risk">At Risk</option>
            <option value="delayed">Delayed</option>
            <option value="blocked">Blocked</option>
          </select>

          {hasFiltersActive && (
            <Button
              variant="ghost"
              size="xs"
              onClick={clearFilters}
              className="text-muted-foreground hover:text-foreground gap-1"
            >
              <X className="size-3" />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>

      {/* Grid or Empty state */}
      {filteredProjects.length === 0 ? (
        <div className="border-border bg-surface-1/40 flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
          <div className="bg-surface-2 text-muted-foreground mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl">
            <FolderKanban className="size-6" />
          </div>
          <h3 className="text-foreground mb-1 text-base font-semibold">
            {hasFiltersActive
              ? "No matching projects found"
              : "No projects yet"}
          </h3>
          <p className="text-muted-foreground mb-4 max-w-sm text-center text-xs">
            {hasFiltersActive
              ? "No creative projects match the active filters or search terms. Try clearing your filters."
              : "Get started by creating your first creative execution workspace to manage tasks, timelines, and milestones."}
          </p>
          {hasFiltersActive ? (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          ) : (
            onCreateClick && (
              <Button size="sm" onClick={onCreateClick}>
                Create First Project
              </Button>
            )
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.projectId} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
