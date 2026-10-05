import React from "react";
import Link from "next/link";
import {
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Users,
  Building2,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ActionQueueItemDto } from "../types";

interface ActionQueueSectionProps {
  actionQueue: ActionQueueItemDto[];
}

export function ActionQueueSection({ actionQueue }: ActionQueueSectionProps) {
  if (actionQueue.length === 0) {
    return (
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardContent className="flex items-center gap-3 p-4">
          <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
          <div>
            <h3 className="text-foreground-heading text-sm font-semibold">
              What Needs My Attention? · Queue Clear
            </h3>
            <p className="text-muted-foreground text-xs">
              Everything is currently operating on track. Zero critical
              bottlenecks or SLA breaches detected.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const categoryIcons = {
    OVERDUE: Clock,
    DEADLINE: AlertCircle,
    APPROVAL: ShieldAlert,
    WORKLOAD: Users,
    CLIENT: Building2,
  };

  return (
    <section className="space-y-3" aria-labelledby="action-queue-heading">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2
            id="action-queue-heading"
            className="text-foreground-muted text-sm font-semibold tracking-wider uppercase"
          >
            What Needs My Attention? · Executive Action Queue
          </h2>
          <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-amber-400">
            {actionQueue.length} {actionQueue.length === 1 ? "Item" : "Items"}{" "}
            Requiring Decision
          </span>
        </div>
        <span className="text-muted-foreground font-mono text-xs">
          Ranked by Business Urgency
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {actionQueue.map((item) => {
          const isCritical = item.priority === "CRITICAL";
          const isHigh = item.priority === "HIGH";
          const CategoryIcon = categoryIcons[item.category] || Layers;

          return (
            <Card
              key={item.id}
              className={`bg-surface-1/70 flex flex-col justify-between border transition-colors ${
                isCritical
                  ? "border-destructive/40 shadow-destructive/5 shadow-sm"
                  : isHigh
                    ? "border-amber-500/30 shadow-sm shadow-amber-500/5"
                    : "border-border-subtle"
              }`}
            >
              <CardHeader className="space-y-2 p-4 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider uppercase ${
                        isCritical
                          ? "bg-destructive/15 text-destructive border-destructive/30 border"
                          : isHigh
                            ? "border border-amber-500/30 bg-amber-500/15 text-amber-400"
                            : "bg-surface-3 text-muted-foreground border-border-subtle border"
                      }`}
                    >
                      {item.priority}
                    </span>
                    <span className="text-muted-foreground bg-surface-2 border-border-subtle inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px]">
                      <CategoryIcon className="size-3" />
                      {item.category}
                    </span>
                  </div>
                  <span className="text-muted-foreground max-w-[120px] truncate font-mono text-[11px]">
                    {item.context}
                  </span>
                </div>

                <CardTitle className="text-foreground-heading text-sm leading-snug font-semibold">
                  {item.title}
                </CardTitle>

                <p className="text-foreground-secondary text-xs leading-relaxed">
                  {item.reason}
                </p>
              </CardHeader>

              <CardContent className="p-4 pt-2">
                <div className="border-border-subtle/60 flex items-center justify-between border-t pt-2">
                  <span className="text-foreground-muted text-[11px] font-medium">
                    Recommended Action:
                  </span>
                  <Button
                    render={<Link href={item.navigationTarget} />}
                    size="sm"
                    variant={isCritical ? "default" : "outline"}
                    aria-label={`${item.recommendedAction}: ${item.title}`}
                    className="h-7 gap-1.5 px-2.5 text-xs font-medium"
                  >
                    <span>{item.recommendedAction}</span>
                    <ArrowRight className="size-3" aria-hidden="true" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
