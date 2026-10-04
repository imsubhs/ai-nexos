import React from "react";
import Link from "next/link";
import { Building2, AlertTriangle, ArrowRight, CheckCircle2, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    <section className="space-y-3" aria-labelledby="client-intelligence-heading">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 id="client-intelligence-heading" className="text-sm font-semibold tracking-wider uppercase text-foreground-muted">
            Client Account Intelligence · Internal Operational Radar
          </h2>
          <span className="text-[11px] font-mono text-muted-foreground">
            Strictly Internal Lens
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          {bottleneckClientsCount > 0 && (
            <span className="text-amber-400 font-medium">
              {bottleneckClientsCount} Approval Bottleneck(s)
            </span>
          )}
          <Button render={<Link href="/clients" />} variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1">
            <span>Clients Directory</span>
            <ArrowRight className="size-3" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 ? (
          <Card className="col-span-full bg-surface-1/40 border-border-subtle p-6 text-center text-muted-foreground text-sm">
            No active client accounts found.
          </Card>
        ) : (
          items.map((client) => {
            const isCritical = client.healthStatus === "critical";
            const isAtRisk = client.healthStatus === "at_risk";

            return (
              <Card
                key={client.clientId}
                className={`bg-surface-1/60 border transition-colors hover:border-border-strong ${
                  isCritical
                    ? "border-destructive/30"
                    : isAtRisk
                    ? "border-amber-500/25"
                    : "border-border-subtle"
                }`}
              >
                <CardHeader className="p-3.5 pb-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <Building2 className="size-3.5 text-brand-primary shrink-0" />
                      <CardTitle className="text-sm font-semibold text-foreground-heading truncate">
                        {client.clientName}
                      </CardTitle>
                    </div>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-medium uppercase border ${
                        isCritical
                          ? "bg-destructive/15 text-destructive border-destructive/30"
                          : isAtRisk
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      }`}
                    >
                      {client.healthStatus}
                    </span>
                  </div>

                  {client.industry && (
                    <CardDescription className="text-[11px] text-muted-foreground font-mono">
                      {client.industry}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="p-3.5 pt-2 space-y-2.5">
                  <div className="grid grid-cols-3 gap-2 py-1.5 px-2 bg-surface-2/60 rounded border border-border-subtle/50 text-center font-mono">
                    <div>
                      <div className="text-[10px] text-muted-foreground">Projects</div>
                      <div className="text-sm font-bold text-foreground-heading">
                        {client.activeProjectsCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">In Review</div>
                      <div className="text-sm font-bold text-foreground-heading">
                        {client.pendingApprovalsCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">Changes</div>
                      <div className="text-sm font-bold text-foreground-heading">
                        {client.revisionRequestsCount}
                      </div>
                    </div>
                  </div>

                  {client.attentionFlags.length > 0 ? (
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="size-3" />
                        Executive Attention Signals:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {client.attentionFlags.map((flag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          >
                            {flag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                      <CheckCircle2 className="size-3" />
                      Seamless collaboration velocity
                    </div>
                  )}

                  <div className="pt-2 border-t border-border-subtle/60 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {client.lastActivityAt
                        ? `Active: ${new Date(client.lastActivityAt).toLocaleDateString()}`
                        : "No recent updates"}
                    </span>
                    <Button
                      render={<Link href={`/clients/${client.clientId}`} />}
                      variant="ghost"
                      size="sm"
                      aria-label={`View CRM profile for ${client.clientName}`}
                      className="h-6 text-xs px-2 gap-1 text-brand-primary"
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
