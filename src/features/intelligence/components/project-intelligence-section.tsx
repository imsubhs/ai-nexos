import React from "react";
import Link from "next/link";
import {
  FolderKanban,
  ArrowRight,
  AlertCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import type { ProjectIntelligenceDto } from "../types";

interface ProjectIntelligenceSectionProps {
  projects: ProjectIntelligenceDto;
}

export function ProjectIntelligenceSection({
  projects,
}: ProjectIntelligenceSectionProps) {
  const {
    projects: items,
    criticalCount,
    atRiskCount,
    overdueCount,
    healthyCount,
  } = projects;

  return (
    <section
      className="space-y-3"
      aria-labelledby="project-intelligence-heading"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2
            id="project-intelligence-heading"
            className="text-foreground-muted text-sm font-semibold tracking-wider uppercase"
          >
            Project Portfolio Intelligence
          </h2>
          <span className="text-muted-foreground font-mono text-xs">
            {items.length} Active Accounts
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          {criticalCount > 0 && (
            <span className="text-destructive font-medium">
              {criticalCount} Critical
            </span>
          )}
          {atRiskCount > 0 && (
            <span className="font-medium text-amber-400">
              {atRiskCount} At Risk
            </span>
          )}
          {overdueCount > 0 && (
            <span className="text-destructive font-medium">
              {overdueCount} Overdue
            </span>
          )}
          <span className="font-medium text-emerald-400">
            {healthyCount} On Track
          </span>
          <Button
            render={<Link href="/projects" />}
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-xs"
          >
            <span>All Projects</span>
            <ArrowRight className="size-3" />
          </Button>
        </div>
      </div>

      <Card className="bg-surface-1/60 border-border-subtle overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table
              aria-label="Project portfolio intelligence"
              className="w-full border-collapse text-left text-xs"
            >
              <thead>
                <tr className="border-border-subtle bg-surface-2/70 text-foreground-muted border-b font-mono text-[10px] tracking-wider uppercase">
                  <th className="px-3 py-2.5">Project / Client</th>
                  <th className="px-3 py-2.5">Status & Health</th>
                  <th className="px-3 py-2.5">Completion</th>
                  <th className="px-3 py-2.5">Target Date</th>
                  <th className="px-3 py-2.5 text-center">Tasks (Overdue)</th>
                  <th className="px-3 py-2.5 text-center">Deliverables</th>
                  <th className="px-3 py-2.5">Executive Flags</th>
                  <th className="px-3 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-border-subtle/60 divide-y">
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-muted-foreground py-8 text-center"
                    >
                      No projects currently active.
                    </td>
                  </tr>
                ) : (
                  items.map((proj) => {
                    const isUrgent = proj.urgencyScore >= 70;
                    const isAtRisk =
                      proj.urgencyScore >= 50 && proj.urgencyScore < 70;

                    return (
                      <tr
                        key={proj.projectId}
                        className={`hover:bg-surface-2/40 transition-colors ${
                          isUrgent
                            ? "bg-destructive/5"
                            : isAtRisk
                              ? "bg-amber-500/5"
                              : ""
                        }`}
                      >
                        <td className="max-w-[220px] px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-brand-primary font-mono text-xs font-semibold">
                              {proj.projectCode}
                            </span>
                            <Link
                              href={`/projects/${proj.projectId}`}
                              className="text-foreground hover:text-brand-primary truncate font-medium hover:underline"
                            >
                              {proj.projectName}
                            </Link>
                          </div>
                          {proj.clientName && (
                            <div className="text-muted-foreground mt-0.5 truncate text-[11px]">
                              Client: {proj.clientName}
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <StatusBadge
                              status={proj.healthStatus ?? proj.status}
                            />
                          </div>
                        </td>

                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="w-24 space-y-1">
                            <div className="text-muted-foreground flex justify-between font-mono text-[10px]">
                              <span>Progress</span>
                              <span>{proj.completionPercentage}%</span>
                            </div>
                            <div
                              role="progressbar"
                              aria-valuenow={proj.completionPercentage}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`${proj.projectName} completion progress: ${proj.completionPercentage} percent`}
                              className="bg-surface-3 h-1.5 w-full overflow-hidden rounded-full"
                            >
                              <div
                                className="bg-brand-primary h-full rounded-full"
                                style={{
                                  width: `${Math.min(100, Math.max(0, proj.completionPercentage))}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3 font-mono text-[11px] whitespace-nowrap">
                          {proj.dueDate ? (
                            <span
                              className={
                                proj.isOverdue
                                  ? "text-destructive flex items-center gap-1 font-semibold"
                                  : "text-foreground-secondary"
                              }
                            >
                              {proj.isOverdue && (
                                <Clock className="size-3 shrink-0" />
                              )}
                              {new Date(proj.dueDate).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              Unscheduled
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-3 text-center font-mono whitespace-nowrap">
                          <span className="text-foreground-secondary">
                            {proj.openTasksCount}
                          </span>
                          {proj.overdueTasksCount > 0 ? (
                            <span className="text-destructive ml-1.5 font-bold">
                              ({proj.overdueTasksCount})
                            </span>
                          ) : (
                            <span className="text-muted-foreground ml-1.5">
                              (0)
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-3 text-center font-mono whitespace-nowrap">
                          <span className="text-foreground-secondary">
                            {proj.openDeliverablesCount}
                          </span>
                          {proj.pendingReviewsCount > 0 && (
                            <span
                              className="ml-1.5 text-amber-400"
                              title="Awaiting Review"
                            >
                              [{proj.pendingReviewsCount} rev]
                            </span>
                          )}
                        </td>

                        <td className="max-w-[200px] px-3 py-3">
                          {proj.keyIssues.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {proj.keyIssues.map((issue, idx) => (
                                <span
                                  key={idx}
                                  className="bg-surface-3 text-foreground-secondary border-border-subtle inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px]"
                                >
                                  <AlertCircle className="size-2.5 text-amber-400" />
                                  <span className="max-w-[140px] truncate">
                                    {issue}
                                  </span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-400">
                              <CheckCircle2 className="size-3" />
                              On Track
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          <Button
                            render={
                              <Link href={`/projects/${proj.projectId}`} />
                            }
                            variant="ghost"
                            size="sm"
                            aria-label={`Inspect ${proj.projectName} details`}
                            className="text-brand-primary h-7 gap-1 px-2 text-xs"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="size-3" aria-hidden="true" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
