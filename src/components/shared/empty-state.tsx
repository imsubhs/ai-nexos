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
    <div
      role="status"
      className="bg-surface-2/40 border-border-strong flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center"
    >
      <div
        className="border-border bg-surface-3/80 text-brand-primary mb-3.5 flex size-12 items-center justify-center rounded-full border"
        aria-hidden="true"
      >
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <h2 className="text-foreground-heading text-base font-semibold tracking-tight">
        {title}
      </h2>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
