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
          <CheckCircle2 className="size-5 text-emerald-400 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-foreground-heading">
              What Needs My Attention? · Queue Clear
            </h3>
            <p className="text-xs text-muted-foreground">
              Everything is currently operating on track. Zero critical bottlenecks or SLA breaches detected.
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
          <h2 id="action-queue-heading" className="text-sm font-semibold tracking-wider uppercase text-foreground-muted">
            What Needs My Attention? · Executive Action Queue
          </h2>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-amber-500/10 border border-amber-500/20 text-amber-400">
            {actionQueue.length} {actionQueue.length === 1 ? "Item" : "Items"} Requiring Decision
          </span>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
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
              className={`flex flex-col justify-between transition-colors bg-surface-1/70 border ${
                isCritical
                  ? "border-destructive/40 shadow-sm shadow-destructive/5"
                  : isHigh
                  ? "border-amber-500/30 shadow-sm shadow-amber-500/5"
                  : "border-border-subtle"
              }`}
            >
              <CardHeader className="p-4 pb-2 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                        isCritical
                          ? "bg-destructive/15 text-destructive border border-destructive/30"
                          : isHigh
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          : "bg-surface-3 text-muted-foreground border border-border-subtle"
                      }`}
                    >
                      {item.priority}
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground bg-surface-2 border border-border-subtle">
                      <CategoryIcon className="size-3" />
                      {item.category}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono truncate max-w-[120px]">
                    {item.context}
                  </span>
                </div>

                <CardTitle className="text-sm font-semibold text-foreground-heading leading-snug">
                  {item.title}
                </CardTitle>

                <p className="text-xs text-foreground-secondary leading-relaxed">
                  {item.reason}
                </p>
              </CardHeader>

              <CardContent className="p-4 pt-2">
                <div className="pt-2 border-t border-border-subtle/60 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-foreground-muted">
                    Recommended Action:
                  </span>
                  <Button
                    render={<Link href={item.navigationTarget} />}
                    size="sm"
                    variant={isCritical ? "default" : "outline"}
                    className="h-7 text-xs px-2.5 gap-1.5 font-medium"
                  >
                    <span>{item.recommendedAction}</span>
                    <ArrowRight className="size-3" />
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
