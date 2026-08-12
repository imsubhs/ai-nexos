import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CORRECTION_STATUSES } from "../../shared/enums";
import { humanizeEnum } from "../../shared/format";
import type { CorrectionStatusCounts } from "../types";

/**
 * Status tabs as links, so the filter lives in the URL rather than in component
 * state (doc 13 §2 note 2). Enum params are lowercase in the URL and normalized
 * server-side, which is the convention the other deep-linked screens follow.
 *
 * Counts come from the repository's own GROUP BY over the unfiltered set, so the
 * tab badges do not change as the active filter narrows the rows.
 */
export function StatusFilterTabs({
  basePath,
  active,
  counts,
  total,
}: Readonly<{
  basePath: string;
  /** Uppercase status, or null for "all". */
  active: string | null;
  counts: CorrectionStatusCounts;
  total: number;
}>) {
  const tabs = [
    { label: "All", value: null as string | null, count: total },
    ...CORRECTION_STATUSES.map((status) => ({
      label: humanizeEnum(status),
      value: status,
      count: counts[status] ?? 0,
    })),
  ];

  return (
    <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isActive = tab.value === active;
        const href = tab.value
          ? `${basePath}?status=${tab.value.toLowerCase()}`
          : basePath;
        return (
          <Link
            key={tab.label}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={[
              "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm",
              isActive
                ? "bg-primary text-primary-foreground border-transparent"
                : "hover:bg-muted",
            ].join(" ")}
          >
            {tab.label}
            <Badge variant={isActive ? "secondary" : "outline"}>
              {tab.count}
            </Badge>
          </Link>
        );
      })}
    </nav>
  );
}

/** URL status param → the uppercase enum, or null when absent/unrecognised. */
export function parseStatusParam(value: string | undefined): string | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  return (CORRECTION_STATUSES as readonly string[]).includes(upper)
    ? upper
    : null;
}
