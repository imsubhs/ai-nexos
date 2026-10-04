import { Badge } from "@/components/ui/badge";

export function ProjectStatusBadge({ status }: { status: string }) {
  const labelMap: Record<string, string> = {
    planning: "Planning",
    research: "Research",
    brief_received: "Brief Received",
    in_progress: "In Progress",
    internal_review: "Internal Review",
    client_review: "Client Review",
    revision: "Revision",
    approved: "Approved",
    completed: "Completed",
    on_hold: "On Hold",
    cancelled: "Cancelled",
    archived: "Archived",
  };

  return (
    <Badge
      variant="outline"
      className="bg-surface-2/80 text-foreground-secondary border-border/80 text-xs font-normal"
    >
      {labelMap[status] || status.replace("_", " ")}
    </Badge>
  );
}

export function ProjectHealthBadge({ health }: { health: string }) {
  const colorMap: Record<string, string> = {
    on_track: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    at_risk: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    delayed: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    blocked: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    completed: "bg-surface-3 text-muted-foreground border-border",
  };

  const labelMap: Record<string, string> = {
    on_track: "On Track",
    at_risk: "At Risk",
    delayed: "Delayed",
    blocked: "Blocked",
    completed: "Completed",
  };

  return (
    <Badge
      variant="outline"
      className={`text-xs font-normal ${colorMap[health] || "bg-surface-2 text-muted-foreground border-border"}`}
    >
      {labelMap[health] || health.replace("_", " ")}
    </Badge>
  );
}

export function ProjectPriorityBadge({ priority }: { priority: string }) {
  const colorMap: Record<string, string> = {
    critical: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    high: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    medium: "bg-brand-primary/10 text-brand-primary border-brand-primary/30",
    low: "bg-surface-3 text-muted-foreground border-border",
  };

  return (
    <Badge
      variant="outline"
      className={`text-xs font-normal capitalize ${colorMap[priority] || "bg-surface-2 text-muted-foreground border-border"}`}
    >
      {priority}
    </Badge>
  );
}

