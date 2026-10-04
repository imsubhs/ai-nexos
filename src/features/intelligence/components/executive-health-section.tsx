import React from "react";
import {
  Activity,
  FolderKanban,
  FileCheck2,
  Users2,
  CheckCircle,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { ExecutiveHealthDto, HealthDimensionDto } from "../types";

interface ExecutiveHealthSectionProps {
  health: ExecutiveHealthDto;
}

export function ExecutiveHealthSection({ health }: ExecutiveHealthSectionProps) {
  const getBadgeStyle = (level: string) => {
    switch (level) {
      case "EXCELLENT":
        return "bg-emerald-500/10 border-emerald-500/25 text-emerald-400";
      case "HEALTHY":
        return "bg-sky-500/10 border-sky-500/25 text-sky-400";
      case "AT_RISK":
        return "bg-amber-500/10 border-amber-500/25 text-amber-400";
      case "CRITICAL":
      default:
        return "bg-destructive/10 border-destructive/25 text-destructive";
    }
  };

  const dimensions: { title: string; icon: React.ElementType; data: HealthDimensionDto }[] = [
    {
      title: "Project Health",
      icon: FolderKanban,
      data: health.projectHealth,
    },
    {
      title: "Delivery Health",
      icon: FileCheck2,
      data: health.deliveryHealth,
    },
    {
      title: "Client Review Health",
      icon: Users2,
      data: health.clientReviewHealth,
    },
    {
      title: "Task Execution Health",
      icon: CheckCircle,
      data: health.taskExecutionHealth,
    },
  ];

  return (
    <section className="space-y-4" aria-labelledby="health-heading">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 id="health-heading" className="text-sm font-semibold tracking-wider uppercase text-foreground-muted">
            Executive Health · Explainable Scoring
          </h2>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${getBadgeStyle(
              health.overallLevel,
            )}`}
          >
            {health.overallLevel.replace("_", " ")} ({health.overallScore}/100)
          </span>
        </div>
        <p className="text-xs text-muted-foreground font-mono">
          Weighted: 30% Projects · 30% Delivery · 20% Reviews · 20% Tasks
        </p>
      </div>

      {/* Primary Banner Card */}
      <Card className="bg-surface-1/50 border-border-subtle">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-surface-3 border border-border text-brand-primary shrink-0">
              <Activity className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground-heading">
                Operational Velocity Status
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
                {health.summary}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 shrink-0 border-t md:border-t-0 md:border-l border-border-subtle pt-3 md:pt-0 md:pl-6">
            <div className="space-y-1">
              <div className="text-[11px] font-mono uppercase tracking-wider text-foreground-muted">
                Composite Index
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-foreground-heading tabular-nums">
                  {health.overallScore}
                </span>
                <span className="text-xs text-muted-foreground font-mono">/100</span>
              </div>
            </div>
            <div className="w-28 space-y-1.5">
              <div className="text-[10px] text-right font-mono text-muted-foreground">
                SLA Confidence
              </div>
              <div className="h-2 w-full rounded-full bg-surface-3 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    health.overallScore >= 75
                      ? "bg-emerald-400"
                      : health.overallScore >= 50
                      ? "bg-amber-400"
                      : "bg-destructive"
                  }`}
                  style={{ width: `${health.overallScore}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4 Dimension Explainability Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {dimensions.map((dim) => {
          const Icon = dim.icon;
          const score = dim.data.score;
          const level = dim.data.level;

          return (
            <Card key={dim.title} className="bg-surface-1/60 border-border-subtle flex flex-col justify-between">
              <CardHeader className="p-3.5 pb-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-brand-primary" />
                    <CardTitle className="text-xs font-semibold text-foreground-heading">
                      {dim.title}
                    </CardTitle>
                  </div>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-medium border ${getBadgeStyle(
                      level,
                    )}`}
                  >
                    {dim.data.statusText}
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-2xl font-bold font-mono tabular-nums text-foreground-heading">
                    {score}%
                  </span>
                  <div className="w-20 h-1.5 rounded-full bg-surface-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        score >= 75
                          ? "bg-emerald-400"
                          : score >= 50
                          ? "bg-amber-400"
                          : "bg-destructive"
                      }`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-3.5 pt-2 border-t border-border-subtle/50 space-y-1.5 flex-1">
                <CardDescription className="text-[10px] font-mono uppercase tracking-wider text-foreground-muted flex items-center gap-1">
                  <Info className="size-3" />
                  Deterministic Reasons:
                </CardDescription>
                <ul className="space-y-1">
                  {dim.data.reasons.map((r, i) => (
                    <li key={i} className="text-xs text-foreground-secondary flex items-start gap-1.5 leading-relaxed">
                      <span className="text-brand-primary shrink-0 leading-none mt-1">▪</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
