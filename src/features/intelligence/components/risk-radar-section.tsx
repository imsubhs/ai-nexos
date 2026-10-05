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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2
            id="risk-radar-heading"
            className="text-foreground-muted text-sm font-semibold tracking-wider uppercase"
          >
            Risk Radar · Threat Matrix
          </h2>
          <span className="bg-surface-2 border-border-subtle text-foreground-secondary inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[11px] font-medium">
            {risks.length}{" "}
            {risks.length === 1 ? "Threat Detected" : "Threats Detected"}
          </span>
        </div>

        {/* Severity Filter Pills */}
        <div
          role="group"
          aria-label="Filter risks by severity"
          className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0"
        >
          <span className="text-muted-foreground mr-1 flex items-center gap-1 text-[11px]">
            <Filter className="size-3" aria-hidden="true" />
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
                aria-pressed={isSelected}
                className={`focus-visible:ring-brand-primary rounded border px-2 py-0.5 font-mono text-[11px] transition-colors outline-none focus-visible:ring-2 ${
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
          <CardContent className="flex items-center justify-center gap-3 p-6 text-center">
            <CheckCircle2 className="size-5 text-emerald-400" />
            <p className="text-muted-foreground text-sm">
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
                className="bg-surface-1/70 border-border-subtle hover:border-border-strong hover:bg-surface-2/60 transition-all duration-150"
              >
                <CardContent className="flex flex-col justify-between gap-3 p-3.5 md:flex-row md:items-center">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`py-0.2 inline-flex items-center rounded border px-1.5 font-mono text-[10px] font-bold tracking-wider uppercase ${getSeverityStyle(
                          risk.severity,
                        )}`}
                      >
                        {risk.severity}
                      </span>
                      <span
                        className={`py-0.2 inline-flex items-center rounded border px-1.5 font-mono text-[10px] font-medium ${getEntityTypeBadge(
                          risk.entityType,
                        )}`}
                      >
                        {risk.entityType}
                      </span>
                      <span className="text-foreground-heading truncate text-sm font-semibold">
                        {risk.entityTitle}
                      </span>
                    </div>

                    <p className="text-foreground-secondary text-xs leading-relaxed">
                      {risk.explanation}
                    </p>

                    <div className="text-muted-foreground flex items-center gap-2 pt-0.5 text-[11px]">
                      <span className="text-foreground-muted font-medium">
                        Recommended Action:
                      </span>
                      <span className="text-foreground-secondary italic">
                        &ldquo;{risk.recommendedAction}&rdquo;
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3 self-end md:self-center">
                    <span className="text-muted-foreground hidden font-mono text-[11px] sm:inline">
                      {new Date(risk.detectedAt).toLocaleDateString()}
                    </span>
                    <Button
                      render={<Link href={risk.navigationTarget} />}
                      size="sm"
                      variant="outline"
                      aria-label={`Investigate ${risk.entityTitle} (${risk.severity} risk)`}
                      className="border-border-subtle hover:border-brand-primary/50 h-7 gap-1.5 px-2.5 text-xs"
                    >
                      <span>Investigate</span>
                      <ArrowRight
                        className="text-brand-primary size-3"
                        aria-hidden="true"
                      />
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
