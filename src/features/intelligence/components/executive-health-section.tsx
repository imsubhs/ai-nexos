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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { ExecutiveHealthDto, HealthDimensionDto } from "../types";

interface ExecutiveHealthSectionProps {
  health: ExecutiveHealthDto;
}

export function ExecutiveHealthSection({
  health,
}: ExecutiveHealthSectionProps) {
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

  const dimensions: {
    title: string;
    icon: React.ElementType;
    data: HealthDimensionDto;
  }[] = [
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2
            id="health-heading"
            className="text-foreground-muted text-sm font-semibold tracking-wider uppercase"
          >
            Executive Health · Explainable Scoring
          </h2>
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold ${getBadgeStyle(
              health.overallLevel,
            )}`}
          >
            {health.overallLevel.replace("_", " ")} ({health.overallScore}/100)
          </span>
        </div>
        <p className="text-muted-foreground font-mono text-xs">
          Weighted: 30% Projects · 30% Delivery · 20% Reviews · 20% Tasks
        </p>
      </div>

      {/* Primary Banner Card */}
      <Card className="bg-surface-1/50 border-border-subtle">
        <CardContent className="flex flex-col justify-between gap-4 p-4 md:flex-row md:items-center">
          <div className="flex items-start gap-3.5">
            <div className="bg-surface-3 border-border text-brand-primary flex size-9 shrink-0 items-center justify-center rounded-lg border">
              <Activity className="size-5" />
            </div>
            <div>
              <h3 className="text-foreground-heading text-sm font-semibold">
                Operational Velocity Status
              </h3>
              <p className="text-muted-foreground mt-0.5 max-w-2xl text-xs">
                {health.summary}
              </p>
            </div>
          </div>

          <div className="border-border-subtle flex shrink-0 items-center gap-6 border-t pt-3 md:border-t-0 md:border-l md:pt-0 md:pl-6">
            <div className="space-y-1">
              <div className="text-foreground-muted font-mono text-[11px] tracking-wider uppercase">
                Composite Index
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-foreground-heading font-mono text-3xl font-bold tabular-nums">
                  {health.overallScore}
                </span>
                <span className="text-muted-foreground font-mono text-xs">
                  /100
                </span>
              </div>
            </div>
            <div className="w-28 space-y-1.5">
              <div className="text-muted-foreground text-right font-mono text-[10px]">
                SLA Confidence
              </div>
              <div
                role="progressbar"
                aria-valuenow={health.overallScore}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Overall operational health index: ${health.overallScore} out of 100`}
                className="bg-surface-3 h-2 w-full overflow-hidden rounded-full"
              >
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
            <Card
              key={dim.title}
              className="bg-surface-1/60 border-border-subtle flex flex-col justify-between"
            >
              <CardHeader className="space-y-1.5 p-3.5 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="text-brand-primary size-4" />
                    <CardTitle className="text-foreground-heading text-xs font-semibold">
                      {dim.title}
                    </CardTitle>
                  </div>
                  <span
                    className={`py-0.2 inline-flex items-center rounded border px-1.5 font-mono text-[10px] font-medium ${getBadgeStyle(
                      level,
                    )}`}
                  >
                    {dim.data.statusText}
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-foreground-heading font-mono text-2xl font-bold tabular-nums">
                    {score}%
                  </span>
                  <div
                    role="progressbar"
                    aria-valuenow={score}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${dim.title}: ${score} percent (${dim.data.statusText})`}
                    className="bg-surface-3 h-1.5 w-20 overflow-hidden rounded-full"
                  >
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

              <CardContent className="border-border-subtle/50 flex-1 space-y-1.5 border-t p-3.5 pt-2">
                <CardDescription className="text-foreground-muted flex items-center gap-1 font-mono text-[10px] tracking-wider uppercase">
                  <Info className="size-3" />
                  Deterministic Reasons:
                </CardDescription>
                <ul className="space-y-1">
                  {dim.data.reasons.map((r, i) => (
                    <li
                      key={i}
                      className="text-foreground-secondary flex items-start gap-1.5 text-xs leading-relaxed"
                    >
                      <span className="text-brand-primary mt-1 shrink-0 leading-none">
                        ▪
                      </span>
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
