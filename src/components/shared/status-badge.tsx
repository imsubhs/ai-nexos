import { Badge } from "@/components/ui/badge";

/**
 * Generic status → Badge variant mapping shared by the enterprise workspace
 * pages (Deliverables/Files/Meetings/Timeline). Purely presentational: turns
 * a snake_case enum value into a title-cased label and a color that reflects
 * where the value sits in its lifecycle (terminal-positive/negative/neutral).
 */
const POSITIVE = new Set([
  "approved",
  "delivered",
  "ready",
  "published",
  "completed",
  "live",
]);
const NEGATIVE = new Set([
  "rejected",
  "cancelled",
  "archived",
  "deleted",
  "blocked",
]);

function humanize(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function StatusBadge({ status }: Readonly<{ status: string }>) {
  const variant = POSITIVE.has(status)
    ? "default"
    : NEGATIVE.has(status)
      ? "destructive"
      : "secondary";

  return <Badge variant={variant}>{humanize(status)}</Badge>;
}
