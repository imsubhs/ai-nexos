import React from "react";
import Link from "next/link";
import {
  Users,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  UserX,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2
            id="workload-heading"
            className="text-foreground-muted text-sm font-semibold tracking-wider uppercase"
          >
            Workload & Operational Capacity
          </h2>
          <span className="text-muted-foreground font-mono text-[11px]">
            Capacity Signal · Non-Punitive
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <span>{totalTeamMembers} Total Staff</span>
          <span>·</span>
          <span>{activeAssigneesCount} Active Assignees</span>
          {unassignedTasksCount > 0 && (
            <>
              <span>·</span>
              <span className="font-medium text-amber-400">
                {unassignedTasksCount} Unassigned Tasks
              </span>
            </>
          )}
          <Button
            render={<Link href="/tasks" />}
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-xs"
          >
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
        <CardContent className="flex items-center justify-between gap-3 p-3.5">
          <div className="flex items-center gap-2.5">
            {isConcentrated ? (
              <AlertTriangle
                className="size-4 shrink-0 text-amber-400"
                aria-hidden="true"
              />
            ) : (
              <ShieldCheck
                className="size-4 shrink-0 text-emerald-400"
                aria-hidden="true"
              />
            )}
            <div>
              <div className="text-foreground-heading text-xs font-semibold">
                {isConcentrated
                  ? "Workload Concentration Alert"
                  : "Balanced Production Distribution"}
              </div>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {capacitySignal}
              </p>
            </div>
          </div>

          {unassignedTasksCount > 0 && (
            <div className="flex shrink-0 items-center gap-1.5 rounded border border-amber-500/20 bg-amber-500/10 px-2 py-1 font-mono text-xs text-amber-400">
              <UserX className="size-3.5" aria-hidden="true" />
              <span>{unassignedTasksCount} tasks need owner</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Distribution Grid */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {distribution.slice(0, 8).map((member) => (
          <Card
            key={member.userId}
            className="bg-surface-1/60 border-border-subtle"
          >
            <CardContent className="space-y-2 p-3">
              <div className="flex items-center justify-between">
                <div className="truncate pr-1">
                  <div className="text-foreground truncate text-xs font-semibold">
                    {member.name}
                  </div>
                  <div className="text-muted-foreground truncate font-mono text-[10px]">
                    {member.designation ?? "Team Member"}
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-foreground-heading text-xs font-bold">
                    {member.openTasksCount}
                  </div>
                  <div className="text-muted-foreground text-[10px]">
                    {member.taskSharePercentage}% share
                  </div>
                </div>
              </div>

              {/* Share visual bar */}
              <div
                className="bg-surface-3 h-1 w-full overflow-hidden rounded-full"
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
                  style={{
                    width: `${Math.min(100, Math.max(5, member.taskSharePercentage))}%`,
                  }}
                />
              </div>

              <div className="text-muted-foreground border-border-subtle/50 flex items-center justify-between border-t pt-1 font-mono text-[11px]">
                <span>In Progress: {member.inProgressTasksCount}</span>
                {member.overdueTasksCount > 0 ? (
                  <span className="text-destructive font-semibold">
                    {member.overdueTasksCount} overdue
                  </span>
                ) : (
                  <span className="font-medium text-emerald-400">
                    0 overdue
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
