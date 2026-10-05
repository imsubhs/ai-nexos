import { cn } from "@/lib/utils";

/**
 * Generic status → Badge mapping shared by enterprise workspace pages.
 * Turns snake_case enum values into title-cased labels with calibrated
 * 6px status dots and translucent chip surfaces.
 */
const POSITIVE = new Set([
  "approved",
  "delivered",
  "ready",
  "published",
  "completed",
  "live",
  "active",
  "on_track",
]);

const NEGATIVE = new Set([
  "rejected",
  "cancelled",
  "archived",
  "deleted",
  "blocked",
  "critical",
]);

const WARNING = new Set([
  "in_review",
  "at_risk",
  "pending",
  "delayed",
  "paused",
  "needs_revision",
]);

const INFO = new Set(["in_progress", "draft", "planned", "reviewing", "open"]);

function humanize(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function StatusBadge({
  status,
  className,
}: Readonly<{ status: string; className?: string }>) {
  const norm = status.toLowerCase();

  let chipClasses = "bg-slate-500/10 text-slate-300 border-slate-500/20";
  let dotClasses = "bg-slate-400";

  if (POSITIVE.has(norm)) {
    chipClasses = "bg-emerald-500/10 text-emerald-400 border-emerald-500/25";
    dotClasses = "bg-emerald-400";
  } else if (NEGATIVE.has(norm)) {
    chipClasses = "bg-rose-500/10 text-rose-400 border-rose-500/25";
    dotClasses = "bg-rose-400";
  } else if (WARNING.has(norm)) {
    chipClasses = "bg-amber-500/10 text-amber-400 border-amber-500/25";
    dotClasses = "bg-amber-400";
  } else if (INFO.has(norm)) {
    chipClasses = "bg-sky-500/10 text-sky-400 border-sky-500/25";
    dotClasses = "bg-sky-400";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        chipClasses,
        className,
      )}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", dotClasses)}
        aria-hidden="true"
      />
      {humanize(status)}
    </span>
  );
}
