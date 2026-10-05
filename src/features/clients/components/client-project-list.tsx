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
      <div className="text-foreground-muted flex items-center justify-between px-1 text-xs">
        <span>
          {projects.length} linked{" "}
          {projects.length === 1 ? "engagement" : "engagements"}
        </span>
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
            ? `${project.manager.firstName || ""} ${project.manager.lastName || ""}`.trim() ||
              project.manager.email
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
              className="group border-border-subtle bg-surface-2 hover:border-brand-primary/40 hover:bg-surface-3 relative flex flex-col justify-between gap-4 rounded-lg border p-4 transition-all duration-150 md:flex-row md:items-center"
            >
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-surface-1 border-border text-brand-primary rounded-[4px] border px-2 py-0.5 font-mono text-xs font-semibold">
                    {project.projectCode}
                  </span>
                  <Link
                    href={`/projects/${project.projectId}`}
                    className="font-heading text-foreground group-hover:text-brand-primary-soft truncate text-sm font-semibold transition-colors"
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

                <div className="text-foreground-muted flex flex-wrap items-center gap-4 text-xs">
                  {managerName && (
                    <div className="flex items-center gap-1.5">
                      <User className="text-foreground-subtle size-3.5" />
                      <span>{managerName}</span>
                    </div>
                  )}

                  {endDateFormatted && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="text-foreground-subtle size-3.5" />
                      <span>Due {endDateFormatted}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-border-subtle flex shrink-0 items-center gap-4 border-t pt-2 md:border-t-0 md:pt-0">
                <div className="w-28 space-y-1">
                  <div className="text-foreground-muted flex justify-between font-mono text-[11px]">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="bg-surface-1 h-1.5 w-full overflow-hidden rounded-full">
                    <div
                      className="bg-brand-primary h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(0, progress))}%`,
                      }}
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
