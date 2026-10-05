import React from "react";
import Link from "next/link";
import {
  Building2,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ClientIntelligenceDto } from "../types";

interface ClientIntelligenceSectionProps {
  clients: ClientIntelligenceDto;
}

export function ClientIntelligenceSection({
  clients,
}: ClientIntelligenceSectionProps) {
  const { clients: items, bottleneckClientsCount } = clients;

  return (
    <section
      className="space-y-3"
      aria-labelledby="client-intelligence-heading"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2
            id="client-intelligence-heading"
            className="text-foreground-muted text-sm font-semibold tracking-wider uppercase"
          >
            Client Account Intelligence · Internal Operational Radar
          </h2>
          <span className="text-muted-foreground font-mono text-[11px]">
            Strictly Internal Lens
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          {bottleneckClientsCount > 0 && (
            <span className="font-medium text-amber-400">
              {bottleneckClientsCount} Approval Bottleneck(s)
            </span>
          )}
          <Button
            render={<Link href="/clients" />}
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-xs"
          >
            <span>Clients Directory</span>
            <ArrowRight className="size-3" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 ? (
          <Card className="bg-surface-1/40 border-border-subtle text-muted-foreground col-span-full p-6 text-center text-sm">
            No active client accounts found.
          </Card>
        ) : (
          items.map((client) => {
            const isCritical = client.healthStatus === "critical";
            const isAtRisk = client.healthStatus === "at_risk";

            return (
              <Card
                key={client.clientId}
                className={`bg-surface-1/60 hover:border-border-strong border transition-colors ${
                  isCritical
                    ? "border-destructive/30"
                    : isAtRisk
                      ? "border-amber-500/25"
                      : "border-border-subtle"
                }`}
              >
                <CardHeader className="space-y-1 p-3.5 pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <Building2 className="text-brand-primary size-3.5 shrink-0" />
                      <CardTitle className="text-foreground-heading truncate text-sm font-semibold">
                        {client.clientName}
                      </CardTitle>
                    </div>
                    <span
                      className={`py-0.2 inline-flex items-center rounded border px-1.5 font-mono text-[10px] font-medium uppercase ${
                        isCritical
                          ? "bg-destructive/15 text-destructive border-destructive/30"
                          : isAtRisk
                            ? "border-amber-500/30 bg-amber-500/15 text-amber-400"
                            : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      {client.healthStatus}
                    </span>
                  </div>

                  {client.industry && (
                    <CardDescription className="text-muted-foreground font-mono text-[11px]">
                      {client.industry}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="space-y-2.5 p-3.5 pt-2">
                  <div className="bg-surface-2/60 border-border-subtle/50 grid grid-cols-3 gap-2 rounded border px-2 py-1.5 text-center font-mono">
                    <div>
                      <div className="text-muted-foreground text-[10px]">
                        Projects
                      </div>
                      <div className="text-foreground-heading text-sm font-bold">
                        {client.activeProjectsCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-[10px]">
                        In Review
                      </div>
                      <div className="text-foreground-heading text-sm font-bold">
                        {client.pendingApprovalsCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-[10px]">
                        Changes
                      </div>
                      <div className="text-foreground-heading text-sm font-bold">
                        {client.revisionRequestsCount}
                      </div>
                    </div>
                  </div>

                  {client.attentionFlags.length > 0 ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 font-mono text-[10px] tracking-wider text-amber-400 uppercase">
                        <AlertTriangle className="size-3" />
                        Executive Attention Signals:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {client.attentionFlags.map((flag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-400"
                          >
                            {flag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 font-mono text-[11px] text-emerald-400">
                      <CheckCircle2 className="size-3" />
                      Seamless collaboration velocity
                    </div>
                  )}

                  <div className="border-border-subtle/60 flex items-center justify-between border-t pt-2">
                    <span className="text-muted-foreground font-mono text-[10px]">
                      {client.lastActivityAt
                        ? `Active: ${new Date(client.lastActivityAt).toLocaleDateString()}`
                        : "No recent updates"}
                    </span>
                    <Button
                      render={<Link href={`/clients/${client.clientId}`} />}
                      variant="ghost"
                      size="sm"
                      aria-label={`View CRM profile for ${client.clientName}`}
                      className="text-brand-primary h-6 gap-1 px-2 text-xs"
                    >
                      <span>Account CRM</span>
                      <ArrowRight className="size-3" aria-hidden="true" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </section>
  );
}
