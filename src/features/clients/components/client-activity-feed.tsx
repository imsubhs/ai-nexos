import { NoActivityEmptyState } from "./client-empty-state";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Activity,
  PlusCircle,
  FileEdit,
  Archive,
  UserPlus,
  Share2,
  CheckCircle,
} from "lucide-react";

export interface ActivityItem {
  activityId?: string;
  id?: string;
  action: string;
  entityType?: string;
  entityId?: string | null;
  description: string;
  metadata?: Record<string, unknown> | null;
  createdAt: Date | string;
  userId?: string | null;
}

interface ClientActivityFeedProps {
  activities: ActivityItem[];
}

export function ClientActivityFeed({ activities }: ClientActivityFeedProps) {
  if (!activities || activities.length === 0) {
    return <NoActivityEmptyState />;
  }

  const getActionConfig = (action: string) => {
    const act = (action || "").toLowerCase();
    if (act.includes("create") || act.includes("add")) {
      return {
        icon: PlusCircle,
        style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
        badge: "Created",
      };
    }
    if (act.includes("update") || act.includes("edit")) {
      return {
        icon: FileEdit,
        style: "bg-sky-500/10 text-sky-400 border-sky-500/25",
        badge: "Updated",
      };
    }
    if (act.includes("archive") || act.includes("delete")) {
      return {
        icon: Archive,
        style: "bg-rose-500/10 text-rose-400 border-rose-500/25",
        badge: "Archived",
      };
    }
    if (act.includes("share")) {
      return {
        icon: Share2,
        style: "bg-purple-500/10 text-purple-400 border-purple-500/25",
        badge: "Shared",
      };
    }
    if (act.includes("approve")) {
      return {
        icon: CheckCircle,
        style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
        badge: "Approved",
      };
    }
    if (act.includes("contact")) {
      return {
        icon: UserPlus,
        style: "bg-brand-primary/10 text-brand-primary border-brand-primary/25",
        badge: "Contact",
      };
    }
    return {
      icon: Activity,
      style: "bg-surface-3 text-foreground-muted border-border-subtle",
      badge: action,
    };
  };

  // Sort descending by date
  const sorted = [...activities].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="space-y-4">
      <div className="text-xs text-foreground-muted">
        {activities.length} logged {activities.length === 1 ? "event" : "events"}
      </div>

      <div className="relative border-l border-border-subtle ml-3 space-y-6 pl-6 py-2">
        {sorted.map((item, idx) => {
          const config = getActionConfig(item.action);
          const Icon = config.icon;
          const date = new Date(item.createdAt);
          const formattedDate = date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          const formattedTime = date.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div key={item.activityId || item.id || idx} className="relative group">
              {/* Timeline marker */}
              <div className="absolute -left-[31px] top-1 flex size-6 items-center justify-center rounded-full border border-border bg-surface-2 group-hover:border-brand-primary/50 group-hover:scale-105 transition-all">
                <Icon className="size-3 text-brand-primary" />
              </div>

              <div className="rounded-lg border border-border-subtle bg-surface-2 p-3.5 hover:border-brand-primary/30 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-[3px]", config.style)}
                    >
                      {config.badge}
                    </Badge>
                    <span className="text-xs font-semibold text-foreground">
                      {item.action}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-foreground-muted">
                    {formattedDate} at {formattedTime}
                  </div>
                </div>

                <p className="text-xs text-foreground-secondary leading-relaxed">
                  {item.description}
                </p>

                {item.metadata && Object.keys(item.metadata).length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-border-subtle/50">
                    <details className="text-[11px] text-foreground-muted cursor-pointer">
                      <summary className="hover:text-foreground font-mono">
                        View event details
                      </summary>
                      <pre className="mt-1.5 p-2 rounded bg-surface-1 border border-border-subtle font-mono text-[10px] text-foreground-subtle overflow-x-auto">
                        {JSON.stringify(item.metadata, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
