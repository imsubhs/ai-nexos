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
      <div className="text-foreground-muted text-xs">
        {activities.length} logged{" "}
        {activities.length === 1 ? "event" : "events"}
      </div>

      <div className="border-border-subtle relative ml-3 space-y-6 border-l py-2 pl-6">
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
            <div
              key={item.activityId || item.id || idx}
              className="group relative"
            >
              {/* Timeline marker */}
              <div className="border-border bg-surface-2 group-hover:border-brand-primary/50 absolute top-1 -left-[31px] flex size-6 items-center justify-center rounded-full border transition-all group-hover:scale-105">
                <Icon className="text-brand-primary size-3" />
              </div>

              <div className="border-border-subtle bg-surface-2 hover:border-brand-primary/30 rounded-lg border p-3.5 transition-colors">
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-[3px] px-1.5 py-0.5 font-mono text-[10px] uppercase",
                        config.style,
                      )}
                    >
                      {config.badge}
                    </Badge>
                    <span className="text-foreground text-xs font-semibold">
                      {item.action}
                    </span>
                  </div>
                  <div className="text-foreground-muted font-mono text-[11px]">
                    {formattedDate} at {formattedTime}
                  </div>
                </div>

                <p className="text-foreground-secondary text-xs leading-relaxed">
                  {item.description}
                </p>

                {item.metadata && Object.keys(item.metadata).length > 0 && (
                  <div className="border-border-subtle/50 mt-2.5 border-t pt-2">
                    <details className="text-foreground-muted cursor-pointer text-[11px]">
                      <summary className="hover:text-foreground font-mono">
                        View event details
                      </summary>
                      <pre className="bg-surface-1 border-border-subtle text-foreground-subtle mt-1.5 overflow-x-auto rounded border p-2 font-mono text-[10px]">
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
