"use client";

import React, { useState, useTransition } from "react";
import {
  Activity,
  RefreshCw,
  Printer,
  ShieldCheck,
  Calendar,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExecutivePulseSection } from "./executive-pulse-section";
import { ActionQueueSection } from "./action-queue-section";
import { ExecutiveHealthSection } from "./executive-health-section";
import { RiskRadarSection } from "./risk-radar-section";
import { DeliveryIntelligenceSection } from "./delivery-intelligence-section";
import { ProjectIntelligenceSection } from "./project-intelligence-section";
import { ClientIntelligenceSection } from "./client-intelligence-section";
import { WorkloadIntelligenceSection } from "./workload-intelligence-section";
import { TrendsSection } from "./trends-section";
import { ActivityIntelligenceSection } from "./activity-intelligence-section";
import { getExecutiveIntelligence } from "../actions";
import type { ExecutiveIntelligenceDto } from "../types";

interface ExecutiveIntelligenceDashboardProps {
  initialData: ExecutiveIntelligenceDto;
}

export function ExecutiveIntelligenceDashboard({
  initialData,
}: ExecutiveIntelligenceDashboardProps) {
  const [data, setData] = useState<ExecutiveIntelligenceDto>(initialData);
  const [timeWindow, setTimeWindow] = useState<"7d" | "30d" | "90d">("30d");
  const [isPending, startTransition] = useTransition();

  const handleTimeWindowChange = (tw: "7d" | "30d" | "90d") => {
    setTimeWindow(tw);
    startTransition(async () => {
      try {
        const fresh = await getExecutiveIntelligence(tw);
        setData(fresh);
      } catch (err) {
        console.error("Failed to refresh executive intelligence:", err);
      }
    });
  };

  const handleRefresh = () => {
    startTransition(async () => {
      try {
        const fresh = await getExecutiveIntelligence(timeWindow);
        setData(fresh);
      } catch (err) {
        console.error("Failed to refresh executive intelligence:", err);
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Top Header Command Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground-heading">
              Executive Intelligence
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-brand-primary/30 bg-brand-primary/10 px-2 py-0.5 text-[11px] font-mono font-medium text-brand-primary">
              <span className="size-1.5 rounded-full bg-brand-primary animate-pulse" />
              Decision Support Active
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {data.organizationName} · Operational Telemetry & Threat Surface · Generated:{" "}
            {new Date(data.generatedAt).toLocaleTimeString()}
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Window Selector */}
          <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-lg border border-border-subtle">
            {(["7d", "30d", "90d"] as const).map((tw) => (
              <button
                key={tw}
                onClick={() => handleTimeWindowChange(tw)}
                disabled={isPending}
                className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all ${
                  timeWindow === tw
                    ? "bg-brand-primary text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tw}
              </button>
            ))}
          </div>

          <Button
            onClick={handleRefresh}
            disabled={isPending}
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <RefreshCw className={`size-3.5 ${isPending ? "animate-spin text-brand-primary" : ""}`} />
            <span>{isPending ? "Computing…" : "Refresh"}</span>
          </Button>

          <Button
            onClick={handlePrint}
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hidden sm:flex"
          >
            <Printer className="size-3.5" />
            <span>Export View</span>
          </Button>
        </div>
      </div>

      {/* Layer 1: Executive Pulse */}
      <ExecutivePulseSection pulse={data.pulse} />

      {/* Layer 10: "What Needs My Attention?" Action Queue */}
      <ActionQueueSection actionQueue={data.actionQueue} />

      {/* Layer 2: Executive Health (Explainable Deterministic Scoring) */}
      <ExecutiveHealthSection health={data.health} />

      {/* Layer 3: Risk Radar (Prioritized Intervention Matrix) */}
      <RiskRadarSection risks={data.risks} />

      {/* Layer 4: Delivery Intelligence */}
      <DeliveryIntelligenceSection delivery={data.delivery} />

      {/* Layer 6: Project Portfolio Intelligence */}
      <ProjectIntelligenceSection projects={data.projects} />

      {/* Layer 5: Client Intelligence */}
      <ClientIntelligenceSection clients={data.clients} />

      {/* Layer 7: Workload Intelligence */}
      <WorkloadIntelligenceSection workload={data.workload} />

      {/* Layer 9: Trend Intelligence */}
      <TrendsSection
        trends={data.trends}
        timeWindow={timeWindow}
        onTimeWindowChange={handleTimeWindowChange}
      />

      {/* Layer 8: Activity Intelligence */}
      <ActivityIntelligenceSection activity={data.activity} />

      {/* Operational Security Footer Note */}
      <div className="pt-4 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between text-[11px] text-muted-foreground font-mono gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-emerald-400" />
          <span>Strict Multi-Tenant RLS Active · Internal Executive Console</span>
        </div>
        <div>AI NEX OS · Phase 4H Enterprise Decision-Support Layer</div>
      </div>
    </div>
  );
}
