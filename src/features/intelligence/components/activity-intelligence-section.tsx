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
          <h2
            id="activity-heading"
            className="text-foreground-muted text-sm font-semibold tracking-wider uppercase"
          >
            Activity & Change Intelligence
          </h2>
          <span className="text-muted-foreground font-mono text-[11px]">
            Filtered Operational Feed
          </span>
        </div>
      </div>

      <Card className="bg-surface-1/60 border-border-subtle overflow-hidden">
        <CardContent className="p-0">
          {activity.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center font-mono text-xs">
              No recent high-level operational events recorded.
            </div>
          ) : (
            <div className="divide-border-subtle/50 divide-y">
              {activity.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="hover:bg-surface-2/30 flex items-center justify-between gap-3 p-3 text-xs transition-colors"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="text-muted-foreground w-16 shrink-0 font-mono text-[10px]">
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>

                    <span className="py-0.2 bg-surface-3 text-foreground-secondary border-border-subtle inline-flex shrink-0 items-center rounded border px-1.5 font-mono text-[10px]">
                      {item.entityType}
                    </span>

                    <div className="truncate">
                      <span className="text-foreground font-medium">
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
                      className="text-brand-primary h-6 shrink-0 gap-1 px-2 text-xs"
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
