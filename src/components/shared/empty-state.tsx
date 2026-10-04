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
    <div className="bg-surface-2/40 flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong p-10 text-center">
      <div className="mb-3.5 flex size-12 items-center justify-center rounded-full border border-border bg-surface-3/80 text-brand-primary">
        <Icon className="size-6" />
      </div>
      <h2 className="text-base font-semibold tracking-tight text-foreground-heading">{title}</h2>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
