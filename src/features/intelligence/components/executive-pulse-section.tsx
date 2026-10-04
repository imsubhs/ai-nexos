import React from "react";
import Link from "next/link";
import {
  FolderKanban,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  FileCheck,
  FilePenLine,
  ClipboardCheck,
  AlertCircle,
  CheckSquare,
  Building2,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ExecutivePulseDto } from "../types";

interface ExecutivePulseSectionProps {
  pulse: ExecutivePulseDto;
}

export function ExecutivePulseSection({ pulse }: ExecutivePulseSectionProps) {
  const cards = [
    {
      title: "Active Projects",
      value: pulse.activeProjects,
      description: `${pulse.projectsOnTrack} on track · ${pulse.projectsAtRisk} at risk`,
      icon: FolderKanban,
      href: "/projects",
      highlight: pulse.projectsAtRisk > 0 ? "warning" : "default",
    },
    {
      title: "Projects At Risk",
      value: pulse.projectsAtRisk,
      description: pulse.projectsOverdue > 0 ? `${pulse.projectsOverdue} overdue` : "Deadline / SLA pressure",
      icon: AlertTriangle,
      href: "/projects",
      highlight: pulse.projectsAtRisk > 0 ? "destructive" : "default",
    },
    {
      title: "Projects On Track",
      value: pulse.projectsOnTrack,
      description: "Meeting target timelines",
      icon: CheckCircle2,
      href: "/projects",
      highlight: "success",
    },
    {
      title: "Projects Overdue",
      value: pulse.projectsOverdue,
      description: "Past estimated completion",
      icon: Clock,
      href: "/projects",
      highlight: pulse.projectsOverdue > 0 ? "destructive" : "default",
    },
    {
      title: "Active Deliverables",
      value: pulse.activeDeliverables,
      description: "In production or review",
      icon: FileText,
      href: "/deliverables",
      highlight: "default",
    },
    {
      title: "Awaiting Client Review",
      value: pulse.deliverablesAwaitingClientReview,
      description: "Pending client sign-off",
      icon: FileCheck,
      href: "/deliverables",
      highlight: pulse.deliverablesAwaitingClientReview > 3 ? "warning" : "default",
    },
    {
      title: "Requiring Changes",
      value: pulse.deliverablesRequiringChanges,
      description: "Client requested revisions",
      icon: FilePenLine,
      href: "/deliverables",
      highlight: pulse.deliverablesRequiringChanges > 0 ? "warning" : "default",
    },
    {
      title: "Pending Approvals",
      value: pulse.pendingApprovals,
      description: "Awaiting stage sign-offs",
      icon: ClipboardCheck,
      href: "/deliverables",
      highlight: "default",
    },
    {
      title: "Overdue Deliverables",
      value: pulse.overdueDeliverables,
      description: "Past review SLA deadline",
      icon: AlertCircle,
      href: "/deliverables",
      highlight: pulse.overdueDeliverables > 0 ? "destructive" : "default",
    },
    {
      title: "Open Tasks",
      value: pulse.openTasks,
      description: `${pulse.overdueTasks} overdue items`,
      icon: CheckSquare,
      href: "/tasks",
      highlight: pulse.overdueTasks > 0 ? "warning" : "default",
    },
    {
      title: "Overdue Tasks",
      value: pulse.overdueTasks,
      description: "Require immediate catch-up",
      icon: Clock,
      href: "/tasks",
      highlight: pulse.overdueTasks > 0 ? "destructive" : "default",
    },
    {
      title: "Active Clients",
      value: pulse.activeClients,
      description: "Managed client accounts",
      icon: Building2,
      href: "/clients",
      highlight: "default",
    },
  ];

  return (
    <section className="space-y-3" aria-labelledby="pulse-heading">
      <div className="flex items-center justify-between">
        <h2 id="pulse-heading" className="text-sm font-semibold tracking-wider uppercase text-foreground-muted">
          Executive Pulse · Operational Snapshot
        </h2>
        <span className="text-xs text-muted-foreground font-mono">
          Deterministic 12-Factor Gauge
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {cards.map((c) => {
          const Icon = c.icon;
          const isDestructive = c.highlight === "destructive" && c.value > 0;
          const isWarning = c.highlight === "warning" && c.value > 0;
          const isSuccess = c.highlight === "success" && c.value > 0;

          return (
            <Link
              key={c.title}
              href={c.href}
              className="group block focus-visible:outline-none"
            >
              <Card
                className={`transition-all duration-150 hover:border-border-strong group-focus-visible:ring-2 group-focus-visible:ring-brand-primary/50 bg-surface-1/60 ${
                  isDestructive
                    ? "border-destructive/30 bg-destructive/5 hover:border-destructive/60"
                    : isWarning
                    ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60"
                    : isSuccess
                    ? "border-emerald-500/20 hover:border-emerald-500/40"
                    : "border-border-subtle"
                }`}
              >
                <CardContent className="p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-[11px] font-medium tracking-tight text-foreground-secondary truncate pr-1">
                      {c.title}
                    </span>
                    <Icon
                      className={`size-3.5 shrink-0 ${
                        isDestructive
                          ? "text-destructive"
                          : isWarning
                          ? "text-amber-400"
                          : isSuccess
                          ? "text-emerald-400"
                          : "text-foreground-muted"
                      }`}
                    />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span
                      className={`text-2xl font-bold font-mono tracking-tight tabular-nums ${
                        isDestructive
                          ? "text-destructive"
                          : isWarning
                          ? "text-amber-400"
                          : "text-foreground-heading"
                      }`}
                    >
                      {c.value}
                    </span>
                    <ArrowUpRight className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 text-brand-primary" />
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {c.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
