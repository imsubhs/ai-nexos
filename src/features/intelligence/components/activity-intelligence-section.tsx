import React from "react";
import Link from "next/link";
import { History, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ExecutiveActivityItemDto } from "../types";

interface ActivityIntelligenceSectionProps {
  activity: ExecutiveActivityItemDto[];
}

export function ActivityIntelligenceSection({
  activity,
}: ActivityIntelligenceSectionProps) {
  return (
    <section className="space-y-3" aria-labelledby="activity-heading">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 id="activity-heading" className="text-sm font-semibold tracking-wider uppercase text-foreground-muted">
            Activity & Change Intelligence
          </h2>
          <span className="text-[11px] font-mono text-muted-foreground">
            Filtered Operational Feed
          </span>
        </div>
      </div>

      <Card className="bg-surface-1/60 border-border-subtle overflow-hidden">
        <CardContent className="p-0">
          {activity.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground font-mono">
              No recent high-level operational events recorded.
            </div>
          ) : (
            <div className="divide-y divide-border-subtle/50">
              {activity.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="p-3 flex items-center justify-between gap-3 text-xs transition-colors hover:bg-surface-2/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0 w-16">
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>

                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono bg-surface-3 text-foreground-secondary border border-border-subtle shrink-0">
                      {item.entityType}
                    </span>

                    <div className="truncate">
                      <span className="font-medium text-foreground">
                        {item.description}
                      </span>
                      <span className="text-muted-foreground ml-1.5">
                        · {item.actorName}
                      </span>
                    </div>
                  </div>

                  {item.navigationTarget && (
                    <Button
                      render={<Link href={item.navigationTarget} />}
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2 gap-1 text-brand-primary shrink-0"
                    >
                      <span>View</span>
                      <ArrowRight className="size-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
