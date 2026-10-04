import React from "react";
import { TrendingUp, BarChart2, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 id="trends-heading" className="text-sm font-semibold tracking-wider uppercase text-foreground-muted">
            Trend Intelligence · Production Momentum
          </h2>
          <span className="text-[11px] font-mono text-muted-foreground">
            Window: {timeWindow}
          </span>
        </div>

        {/* Time Window Switcher */}
        {onTimeWindowChange && (
          <div className="flex items-center gap-1 bg-surface-2 p-0.5 rounded border border-border-subtle">
            {(["7d", "30d", "90d"] as const).map((tw) => (
              <button
                key={tw}
                onClick={() => onTimeWindowChange(tw)}
                className={`px-2.5 py-0.5 rounded text-xs font-mono font-medium transition-colors ${
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
            <Card key={title} className="bg-surface-1/60 border-border-subtle flex flex-col justify-between">
              <CardHeader className="p-3.5 pb-2 space-y-1">
                <CardTitle className="text-xs font-semibold text-foreground-heading">
                  {title}
                </CardTitle>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-2xl font-bold font-mono text-foreground-heading tabular-nums">
                    {data.currentValue}
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {data.statusText ?? "Period Total"}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-3.5 pt-2 border-t border-border-subtle/50">
                {!data.hasSufficientData || data.points.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5 font-mono">
                    <Info className="size-3.5 text-muted-foreground" />
                    <span>Insufficient historical data for {timeWindow}</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-2">
                    <div className="h-16 flex items-end gap-1.5 justify-between px-1">
                      {data.points.map((p, idx) => {
                        const heightPct = Math.max(8, Math.round((p.value / maxVal) * 100));
                        return (
                          <div
                            key={idx}
                            className="flex-1 flex flex-col items-center gap-1 group relative"
                          >
                            <div
                              className="w-full bg-brand-primary/40 rounded-t transition-all group-hover:bg-brand-primary"
                              style={{ height: `${heightPct}%` }}
                            />
                            <span className="text-[9px] font-mono text-muted-foreground truncate w-full text-center">
                              {p.label}
                            </span>

                            {/* Hover tooltip */}
                            <div className="absolute -top-7 px-1.5 py-0.5 rounded bg-surface-3 border border-border text-[10px] font-mono text-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
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
