import React from "react";
import Link from "next/link";
import { FolderKanban, ArrowRight, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import type { ProjectIntelligenceDto } from "../types";

interface ProjectIntelligenceSectionProps {
  projects: ProjectIntelligenceDto;
}

export function ProjectIntelligenceSection({
  projects,
}: ProjectIntelligenceSectionProps) {
  const { projects: items, criticalCount, atRiskCount, overdueCount, healthyCount } = projects;

  return (
    <section className="space-y-3" aria-labelledby="project-intelligence-heading">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 id="project-intelligence-heading" className="text-sm font-semibold tracking-wider uppercase text-foreground-muted">
            Project Portfolio Intelligence
          </h2>
          <span className="text-xs text-muted-foreground font-mono">
            {items.length} Active Accounts
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          {criticalCount > 0 && (
            <span className="text-destructive font-medium">
              {criticalCount} Critical
            </span>
          )}
          {atRiskCount > 0 && (
            <span className="text-amber-400 font-medium">
              {atRiskCount} At Risk
            </span>
          )}
          {overdueCount > 0 && (
            <span className="text-destructive font-medium">
              {overdueCount} Overdue
            </span>
          )}
          <span className="text-emerald-400 font-medium">
            {healthyCount} On Track
          </span>
          <Button render={<Link href="/projects" />} variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1">
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
              className="w-full text-left border-collapse text-xs"
            >
              <thead>
                <tr className="border-b border-border-subtle bg-surface-2/70 text-foreground-muted font-mono uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Project / Client</th>
                  <th className="py-2.5 px-3">Status & Health</th>
                  <th className="py-2.5 px-3">Completion</th>
                  <th className="py-2.5 px-3">Target Date</th>
                  <th className="py-2.5 px-3 text-center">Tasks (Overdue)</th>
                  <th className="py-2.5 px-3 text-center">Deliverables</th>
                  <th className="py-2.5 px-3">Executive Flags</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/60">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      No projects currently active.
                    </td>
                  </tr>
                ) : (
                  items.map((proj) => {
                    const isUrgent = proj.urgencyScore >= 70;
                    const isAtRisk = proj.urgencyScore >= 50 && proj.urgencyScore < 70;

                    return (
                      <tr
                        key={proj.projectId}
                        className={`transition-colors hover:bg-surface-2/40 ${
                          isUrgent
                            ? "bg-destructive/5"
                            : isAtRisk
                            ? "bg-amber-500/5"
                            : ""
                        }`}
                      >
                        <td className="py-3 px-3 max-w-[220px]">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-brand-primary">
                              {proj.projectCode}
                            </span>
                            <Link
                              href={`/projects/${proj.projectId}`}
                              className="font-medium text-foreground hover:text-brand-primary hover:underline truncate"
                            >
                              {proj.projectName}
                            </Link>
                          </div>
                          {proj.clientName && (
                            <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                              Client: {proj.clientName}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <StatusBadge status={proj.healthStatus ?? proj.status} />
                          </div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="w-24 space-y-1">
                            <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                              <span>Progress</span>
                              <span>{proj.completionPercentage}%</span>
                            </div>
                            <div
                              role="progressbar"
                              aria-valuenow={proj.completionPercentage}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`${proj.projectName} completion progress: ${proj.completionPercentage} percent`}
                              className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden"
                            >
                              <div
                                className="h-full bg-brand-primary rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, proj.completionPercentage))}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px]">
                          {proj.dueDate ? (
                            <span
                              className={
                                proj.isOverdue
                                  ? "text-destructive font-semibold flex items-center gap-1"
                                  : "text-foreground-secondary"
                              }
                            >
                              {proj.isOverdue && <Clock className="size-3 shrink-0" />}
                              {new Date(proj.dueDate).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Unscheduled</span>
                          )}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap text-center font-mono">
                          <span className="text-foreground-secondary">
                            {proj.openTasksCount}
                          </span>
                          {proj.overdueTasksCount > 0 ? (
                            <span className="text-destructive font-bold ml-1.5">
                              ({proj.overdueTasksCount})
                            </span>
                          ) : (
                            <span className="text-muted-foreground ml-1.5">(0)</span>
                          )}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap text-center font-mono">
                          <span className="text-foreground-secondary">
                            {proj.openDeliverablesCount}
                          </span>
                          {proj.pendingReviewsCount > 0 && (
                            <span className="text-amber-400 ml-1.5" title="Awaiting Review">
                              [{proj.pendingReviewsCount} rev]
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 max-w-[200px]">
                          {proj.keyIssues.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {proj.keyIssues.map((issue, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface-3 text-foreground-secondary border border-border-subtle"
                                >
                                  <AlertCircle className="size-2.5 text-amber-400" />
                                  <span className="truncate max-w-[140px]">{issue}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                              <CheckCircle2 className="size-3" />
                              On Track
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <Button
                            render={<Link href={`/projects/${proj.projectId}`} />}
                            variant="ghost"
                            size="sm"
                            aria-label={`Inspect ${proj.projectName} details`}
                            className="h-7 text-xs px-2 gap-1 text-brand-primary"
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
