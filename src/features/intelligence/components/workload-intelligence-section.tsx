import React from "react";
import Link from "next/link";
import { Users, AlertTriangle, ArrowRight, ShieldCheck, CheckCircle2, UserX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { WorkloadIntelligenceDto } from "../types";

interface WorkloadIntelligenceSectionProps {
  workload: WorkloadIntelligenceDto;
}

export function WorkloadIntelligenceSection({
  workload,
}: WorkloadIntelligenceSectionProps) {
  const {
    totalTeamMembers,
    activeAssigneesCount,
    unassignedTasksCount,
    capacitySignal,
    isConcentrated,
    distribution,
  } = workload;

  return (
    <section className="space-y-3" aria-labelledby="workload-heading">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 id="workload-heading" className="text-sm font-semibold tracking-wider uppercase text-foreground-muted">
            Workload & Operational Capacity
          </h2>
          <span className="text-[11px] font-mono text-muted-foreground">
            Capacity Signal · Non-Punitive
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span>{totalTeamMembers} Total Staff</span>
          <span>·</span>
          <span>{activeAssigneesCount} Active Assignees</span>
          {unassignedTasksCount > 0 && (
            <>
              <span>·</span>
              <span className="text-amber-400 font-medium">
                {unassignedTasksCount} Unassigned Tasks
              </span>
            </>
          )}
          <Button render={<Link href="/tasks" />} variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1">
            <span>Tasks Queue</span>
            <ArrowRight className="size-3" />
          </Button>
        </div>
      </div>

      {/* Capacity Banner */}
      <Card
        className={`border ${
          isConcentrated
            ? "border-amber-500/30 bg-amber-500/5"
            : "border-border-subtle bg-surface-1/50"
        }`}
      >
        <CardContent className="p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {isConcentrated ? (
              <AlertTriangle className="size-4 text-amber-400 shrink-0" aria-hidden="true" />
            ) : (
              <ShieldCheck className="size-4 text-emerald-400 shrink-0" aria-hidden="true" />
            )}
            <div>
              <div className="text-xs font-semibold text-foreground-heading">
                {isConcentrated
                  ? "Workload Concentration Alert"
                  : "Balanced Production Distribution"}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {capacitySignal}
              </p>
            </div>
          </div>

          {unassignedTasksCount > 0 && (
            <div className="flex items-center gap-1.5 shrink-0 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono">
              <UserX className="size-3.5" aria-hidden="true" />
              <span>{unassignedTasksCount} tasks need owner</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Distribution Grid */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {distribution.slice(0, 8).map((member) => (
          <Card key={member.userId} className="bg-surface-1/60 border-border-subtle">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="truncate pr-1">
                  <div className="text-xs font-semibold text-foreground truncate">
                    {member.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate font-mono">
                    {member.designation ?? "Team Member"}
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-xs font-bold text-foreground-heading">
                    {member.openTasksCount}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {member.taskSharePercentage}% share
                  </div>
                </div>
              </div>

              {/* Share visual bar */}
              <div
                className="h-1 w-full rounded-full bg-surface-3 overflow-hidden"
                role="progressbar"
                aria-valuenow={member.taskSharePercentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Task share for ${member.name}: ${member.taskSharePercentage}%`}
              >
                <div
                  className={`h-full rounded-full ${
                    member.taskSharePercentage > 30
                      ? "bg-amber-400"
                      : "bg-brand-primary"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, member.taskSharePercentage))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-1 border-t border-border-subtle/50">
                <span>In Progress: {member.inProgressTasksCount}</span>
                {member.overdueTasksCount > 0 ? (
                  <span className="text-destructive font-semibold">
                    {member.overdueTasksCount} overdue
                  </span>
                ) : (
                  <span className="text-emerald-400 font-medium">0 overdue</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
