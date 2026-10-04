"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ProjectHealthBadge,
  ProjectPriorityBadge,
  ProjectStatusBadge,
} from "@/features/projects/components/project-badges";
import { Button } from "@/components/ui/button";
import { Calendar, User, ArrowUpRight } from "lucide-react";
import { NoProjectsEmptyState } from "./client-empty-state";

export interface ClientProjectItem {
  projectId: string;
  projectName: string;
  projectCode: string;
  status: string;
  healthStatus?: string;
  priority?: string;
  completionPercentage?: number;
  startDate?: Date | string | null;
  estimatedEndDate?: Date | string | null;
  manager?: {
    userId?: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
}

interface ClientProjectListProps {
  projects: ClientProjectItem[];
  clientId: string;
  canCreateProject?: boolean;
}

export function ClientProjectList({
  projects,
  clientId,
  canCreateProject = true,
}: ClientProjectListProps) {
  const router = useRouter();

  if (projects.length === 0) {
    return (
      <NoProjectsEmptyState
        onCreateProject={
          canCreateProject
            ? () => {
                router.push(`/projects?create=true&clientId=${clientId}`);
              }
            : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-foreground-muted px-1">
        <span>{projects.length} linked {projects.length === 1 ? "engagement" : "engagements"}</span>
        {canCreateProject && (
          <Button
            size="xs"
            variant="outline"
            render={
              <Link href={`/projects?create=true&clientId=${clientId}`}>
                + New Project
              </Link>
            }
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {projects.map((project) => {
          const managerName = project.manager
            ? `${project.manager.firstName || ""} ${project.manager.lastName || ""}`.trim() || project.manager.email
            : null;

          const endDateFormatted = project.estimatedEndDate
            ? new Date(project.estimatedEndDate).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : null;

          const progress = project.completionPercentage ?? 0;

          return (
            <div
              key={project.projectId}
              className="group relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg border border-border-subtle bg-surface-2 hover:border-brand-primary/40 hover:bg-surface-3 transition-all duration-150"
            >
              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-[4px] bg-surface-1 border border-border text-brand-primary">
                    {project.projectCode}
                  </span>
                  <Link
                    href={`/projects/${project.projectId}`}
                    className="font-heading text-sm font-semibold text-foreground group-hover:text-brand-primary-soft transition-colors truncate"
                  >
                    {project.projectName}
                  </Link>
                  <ProjectStatusBadge status={project.status} />
                  {project.healthStatus && (
                    <ProjectHealthBadge health={project.healthStatus} />
                  )}
                  {project.priority && (
                    <ProjectPriorityBadge priority={project.priority} />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-foreground-muted">
                  {managerName && (
                    <div className="flex items-center gap-1.5">
                      <User className="size-3.5 text-foreground-subtle" />
                      <span>{managerName}</span>
                    </div>
                  )}

                  {endDateFormatted && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-foreground-subtle" />
                      <span>Due {endDateFormatted}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border-subtle">
                <div className="w-28 space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-foreground-muted">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-surface-1 overflow-hidden">
                    <div
                      className="h-full bg-brand-primary rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                    />
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  render={
                    <Link
                      href={`/projects/${project.projectId}`}
                      aria-label={`Open project ${project.projectName}`}
                    >
                      <ArrowUpRight className="size-4" />
                    </Link>
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
