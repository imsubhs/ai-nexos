import React from "react";
import Link from "next/link";
import {
  PackageCheck,
  ClockAlert,
  Target,
  Repeat,
  Timer,
  FileSignature,
  ArrowRight,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DeliveryIntelligenceDto } from "../types";

interface DeliveryIntelligenceSectionProps {
  delivery: DeliveryIntelligenceDto;
}

export function DeliveryIntelligenceSection({
  delivery,
}: DeliveryIntelligenceSectionProps) {
  const metrics = [
    {
      title: "Completed Deliverables",
      value: delivery.deliverablesCompleted.toString(),
      subtext: "Delivered or signed off",
      icon: PackageCheck,
      color: "text-emerald-400",
    },
    {
      title: "Overdue Deliverables",
      value: delivery.deliverablesOverdue.toString(),
      subtext: "Past review SLA deadline",
      icon: ClockAlert,
      color: delivery.deliverablesOverdue > 0 ? "text-destructive" : "text-foreground-heading",
    },
    {
      title: "On-Time Delivery Rate",
      value:
        delivery.onTimeDeliveryRate !== null
          ? `${delivery.onTimeDeliveryRate}%`
          : "N/A",
      subtext: delivery.onTimeDeliveryStatusText,
      icon: Target,
      color:
        delivery.onTimeDeliveryRate !== null && delivery.onTimeDeliveryRate >= 80
          ? "text-emerald-400"
          : "text-amber-400",
    },
    {
      title: "Avg Revision Cycles",
      value:
        delivery.averageRevisionCycles !== null
          ? `${delivery.averageRevisionCycles}x`
          : "N/A",
      subtext: delivery.averageRevisionStatusText,
      icon: Repeat,
      color: "text-sky-400",
    },
    {
      title: "Approval Turnaround",
      value:
        delivery.approvalTurnaroundHours !== null
          ? `${delivery.approvalTurnaroundHours}h`
          : "N/A",
      subtext: delivery.approvalTurnaroundStatusText,
      icon: Timer,
      color: "text-purple-400",
    },
    {
      title: "Revision Request Volume",
      value: delivery.changeRequestCount.toString(),
      subtext:
        delivery.revisionFrequencyRate !== null
          ? `${delivery.revisionFrequencyRate}% frequency rate`
          : "Active change requests",
      icon: FileSignature,
      color: delivery.changeRequestCount > 0 ? "text-amber-400" : "text-foreground-heading",
    },
  ];

  return (
    <section className="space-y-3" aria-labelledby="delivery-heading">
      <div className="flex items-center justify-between">
        <h2 id="delivery-heading" className="text-sm font-semibold tracking-wider uppercase text-foreground-muted">
          Delivery Intelligence · Throughput & Velocity
        </h2>
        <Button render={<Link href="/deliverables" />} variant="ghost" size="sm" className="h-7 text-xs gap-1">
          <span>Deliverables Hub</span>
          <ArrowRight className="size-3" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.title} className="bg-surface-1/60 border-border-subtle">
              <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-[11px] font-medium text-foreground-secondary truncate pr-1">
                  {m.title}
                </CardTitle>
                <Icon className={`size-3.5 shrink-0 ${m.color}`} />
              </CardHeader>
              <CardContent className="p-3.5 pt-1 space-y-1">
                <div className={`text-2xl font-bold font-mono tracking-tight tabular-nums ${m.color}`}>
                  {m.value}
                </div>
                <CardDescription className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                  <span>{m.subtext}</span>
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
