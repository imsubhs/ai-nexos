import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ClientStatusBadge({
  status,
}: {
  status: "active" | "prospect" | "archived";
}) {
  const styles = {
    active:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25",
    prospect:
      "bg-blue-500/15 text-blue-700 dark:text-blue-400 hover:bg-blue-500/25",
    archived:
      "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 hover:bg-zinc-500/25",
  };

  const labels = {
    active: "Active",
    prospect: "Prospect",
    archived: "Archived",
  };

  return (
    <Badge
      variant="outline"
      className={cn("border-transparent font-medium", styles[status])}
    >
      {labels[status]}
    </Badge>
  );
}

export function ClientHealthBadge({
  health,
}: {
  health: "good" | "at_risk" | "critical" | null;
}) {
  if (!health) return null;

  const styles = {
    good: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 border-emerald-500/30",
    at_risk:
      "bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25 border-amber-500/30",
    critical:
      "bg-red-500/15 text-red-700 dark:text-red-400 hover:bg-red-500/25 border-red-500/30",
  };

  const labels = {
    good: "Good",
    at_risk: "At Risk",
    critical: "Critical",
  };

  return (
    <Badge variant="outline" className={cn("font-medium", styles[health])}>
      {labels[health]}
    </Badge>
  );
}
