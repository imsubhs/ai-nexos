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

  return <Badge variant="outline">{labelMap[status] || status}</Badge>;
}

export function ProjectHealthBadge({ health }: { health: string }) {
  const colorMap: Record<string, string> = {
    on_track: "bg-green-100 text-green-800",
    at_risk: "bg-yellow-100 text-yellow-800",
    delayed: "bg-orange-100 text-orange-800",
    blocked: "bg-red-100 text-red-800",
    completed: "bg-gray-100 text-gray-800",
  };

  const labelMap: Record<string, string> = {
    on_track: "On Track",
    at_risk: "At Risk",
    delayed: "Delayed",
    blocked: "Blocked",
    completed: "Completed",
  };

  return (
    <Badge variant="outline" className={colorMap[health] || ""}>
      {labelMap[health] || health}
    </Badge>
  );
}

export function ProjectPriorityBadge({ priority }: { priority: string }) {
  const colorMap: Record<string, string> = {
    critical: "bg-red-100 text-red-800 border-red-200",
    high: "bg-orange-100 text-orange-800 border-orange-200",
    medium: "bg-blue-100 text-blue-800 border-blue-200",
    low: "bg-gray-100 text-gray-800 border-gray-200",
  };

  return (
    <Badge variant="outline" className={colorMap[priority] || ""}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  );
}
