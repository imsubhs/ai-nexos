import React from "react";
import { TrendingUp, BarChart2, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { TrendIntelligenceDto, TrendSeriesDto } from "../types";

interface TrendsSectionProps {
  trends: TrendIntelligenceDto;
  timeWindow: "7d" | "30d" | "90d";
  onTimeWindowChange?: (w: "7d" | "30d" | "90d") => void;
}

export function TrendsSection({
  trends,
  timeWindow,
  onTimeWindowChange,
}: TrendsSectionProps) {
  const seriesList: { title: string; data: TrendSeriesDto }[] = [
    { title: "Delivery Production Volume", data: trends.deliveryVolumeTrend },
    { title: "Revision Request Frequency", data: trends.revisionTrend },
    { title: "Task Execution Output", data: trends.taskCompletionTrend },
  ];

  return (
    <section className="space-y-3" aria-labelledby="trends-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2
            id="trends-heading"
            className="text-foreground-muted text-sm font-semibold tracking-wider uppercase"
          >
            Trend Intelligence · Production Momentum
          </h2>
          <span className="text-muted-foreground font-mono text-[11px]">
            Window: {timeWindow}
          </span>
        </div>

        {/* Time Window Switcher */}
        {onTimeWindowChange && (
          <div
            role="group"
            aria-label="Select trend time window"
            className="bg-surface-2 border-border-subtle flex items-center gap-1 rounded border p-0.5"
          >
            {(["7d", "30d", "90d"] as const).map((tw) => (
              <button
                key={tw}
                type="button"
                aria-pressed={timeWindow === tw}
                onClick={() => onTimeWindowChange(tw)}
                className={`focus-visible:ring-ring rounded px-2.5 py-0.5 font-mono text-xs font-medium transition-colors focus-visible:ring-1 focus-visible:outline-none ${
                  timeWindow === tw
                    ? "bg-brand-primary text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tw}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {seriesList.map(({ title, data }) => {
          const maxVal = Math.max(...data.points.map((p) => p.value), 1);

          return (
            <Card
              key={title}
              className="bg-surface-1/60 border-border-subtle flex flex-col justify-between"
            >
              <CardHeader className="space-y-1 p-3.5 pb-2">
                <CardTitle className="text-foreground-heading text-xs font-semibold">
                  {title}
                </CardTitle>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-foreground-heading font-mono text-2xl font-bold tabular-nums">
                    {data.currentValue}
                  </span>
                  <span className="text-muted-foreground font-mono text-[11px]">
                    {data.statusText ?? "Period Total"}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="border-border-subtle/50 border-t p-3.5 pt-2">
                {!data.hasSufficientData || data.points.length === 0 ? (
                  <div className="text-muted-foreground flex items-center justify-center gap-1.5 py-6 text-center font-mono text-xs">
                    <Info
                      className="text-muted-foreground size-3.5"
                      aria-hidden="true"
                    />
                    <span>Insufficient historical data for {timeWindow}</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex h-16 items-end justify-between gap-1.5 px-1">
                      {data.points.map((p, idx) => {
                        const heightPct = Math.max(
                          8,
                          Math.round((p.value / maxVal) * 100),
                        );
                        return (
                          <div
                            key={idx}
                            tabIndex={0}
                            role="img"
                            aria-label={`${p.label}: ${p.value} items`}
                            className="group focus-visible:ring-ring relative flex flex-1 flex-col items-center gap-1 rounded-sm focus-visible:ring-1 focus-visible:outline-none"
                          >
                            <div
                              className="bg-brand-primary/40 group-hover:bg-brand-primary group-focus-visible:bg-brand-primary w-full rounded-t transition-all"
                              style={{ height: `${heightPct}%` }}
                            />
                            <span className="text-muted-foreground w-full truncate text-center font-mono text-[9px]">
                              {p.label}
                            </span>

                            {/* Hover / focus tooltip */}
                            <div className="bg-surface-3 border-border text-foreground pointer-events-none absolute -top-7 z-10 rounded border px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                              {p.value} items
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
