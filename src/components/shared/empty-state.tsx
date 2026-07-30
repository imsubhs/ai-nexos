import type { LucideIcon } from "lucide-react";

/**
 * Shared empty-state block (merge doc 16 K-3 minimal port; full StatCard/
 * charts kit lands with Phase 1.11).
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: Readonly<{
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card p-12 text-center">
      <Icon className="mb-4 h-12 w-12 text-muted-foreground/50" />
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
