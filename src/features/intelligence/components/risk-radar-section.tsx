"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Filter,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { RiskItemDto, RiskSeverity } from "../types";

interface RiskRadarSectionProps {
  risks: RiskItemDto[];
}

export function RiskRadarSection({ risks }: RiskRadarSectionProps) {
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");

  const filteredRisks = risks.filter((r) => {
    if (severityFilter === "ALL") return true;
    return r.severity === severityFilter;
  });

  const getSeverityStyle = (severity: RiskSeverity) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-destructive/15 text-destructive border-destructive/30";
      case "HIGH":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "MEDIUM":
        return "bg-sky-500/15 text-sky-400 border-sky-500/30";
      case "LOW":
      default:
        return "bg-surface-3 text-muted-foreground border-border-subtle";
    }
  };

  const getEntityTypeBadge = (type: string) => {
    switch (type) {
      case "PROJECT":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "DELIVERABLE":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      case "TASK":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "CLIENT":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      default:
        return "bg-surface-3 text-foreground-secondary border-border-subtle";
    }
  };

  return (
    <section className="space-y-3" aria-labelledby="risk-radar-heading">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 id="risk-radar-heading" className="text-sm font-semibold tracking-wider uppercase text-foreground-muted">
            Risk Radar · Threat Matrix
          </h2>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-surface-2 border border-border-subtle text-foreground-secondary">
            {risks.length} {risks.length === 1 ? "Threat Detected" : "Threats Detected"}
          </span>
        </div>

        {/* Severity Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] text-muted-foreground mr-1 flex items-center gap-1">
            <Filter className="size-3" />
            Filter:
          </span>
          {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((level) => {
            const count =
              level === "ALL"
                ? risks.length
                : risks.filter((r) => r.severity === level).length;
            const isSelected = severityFilter === level;

            return (
              <button
                key={level}
                onClick={() => setSeverityFilter(level)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors border ${
                  isSelected
                    ? "bg-brand-primary/20 text-brand-primary border-brand-primary/40 font-semibold"
                    : "bg-surface-2 text-muted-foreground border-border-subtle hover:text-foreground"
                }`}
              >
                {level} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {filteredRisks.length === 0 ? (
        <Card className="border-border-subtle bg-surface-1/40">
          <CardContent className="flex items-center gap-3 p-6 text-center justify-center">
            <CheckCircle2 className="size-5 text-emerald-400" />
            <p className="text-sm text-muted-foreground">
              {severityFilter === "ALL"
                ? "No operational risks detected across the business. All projects and deliverables on schedule."
                : `No active risks categorized with ${severityFilter} severity.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredRisks.map((risk) => {
            return (
              <Card
                key={risk.id}
                className="bg-surface-1/70 border-border-subtle transition-all duration-150 hover:border-border-strong hover:bg-surface-2/60"
              >
                <CardContent className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${getSeverityStyle(
                          risk.severity,
                        )}`}
                      >
                        {risk.severity}
                      </span>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-medium border ${getEntityTypeBadge(
                          risk.entityType,
                        )}`}
                      >
                        {risk.entityType}
                      </span>
                      <span className="text-sm font-semibold text-foreground-heading truncate">
                        {risk.entityTitle}
                      </span>
                    </div>

                    <p className="text-xs text-foreground-secondary leading-relaxed">
                      {risk.explanation}
                    </p>

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-0.5">
                      <span className="font-medium text-foreground-muted">
                        Recommended Action:
                      </span>
                      <span className="text-foreground-secondary italic">
                        &ldquo;{risk.recommendedAction}&rdquo;
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
                      {new Date(risk.detectedAt).toLocaleDateString()}
                    </span>
                    <Button
                      render={<Link href={risk.navigationTarget} />}
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-2.5 gap-1.5 border-border-subtle hover:border-brand-primary/50"
                    >
                      <span>Investigate</span>
                      <ArrowRight className="size-3 text-brand-primary" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
