import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shiftMonth } from "@/features/calendar/aggregate";
import { formatMonth } from "../../shared/format";

/**
 * Month + view switcher, rendered as links rather than buttons.
 *
 * The URL is the single source of view state (doc 13 §2 note 2 / doc 16 global
 * rules), so these navigate rather than hold state: a month is shareable, it
 * survives a refresh, and Back does what it looks like it does.
 *
 * `shiftMonth` is imported from the calendar slice rather than reimplemented —
 * it is the same pure UTC month arithmetic, and two copies would eventually
 * disagree at a year boundary.
 */
export function MonthNav({
  basePath,
  month,
  view,
  extraParams,
}: Readonly<{
  basePath: string;
  month: string;
  /** Omitted on screens with a single rendering. */
  view?: "table" | "calendar";
  extraParams?: Record<string, string>;
}>) {
  const href = (params: Record<string, string>) => {
    const search = new URLSearchParams({ ...extraParams, ...params });
    return `${basePath}?${search.toString()}`;
  };

  const viewParams: Record<string, string> = view ? { view } : {};

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          render={
            <Link
              href={href({ month: shiftMonth(month, -1), ...viewParams })}
              aria-label="Previous month"
            />
          }
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-40 text-center text-sm font-medium">
          {formatMonth(month)}
        </span>
        <Button
          variant="outline"
          size="sm"
          render={
            <Link
              href={href({ month: shiftMonth(month, 1), ...viewParams })}
              aria-label="Next month"
            />
          }
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {view ? (
        <div className="flex items-center gap-2">
          {(["table", "calendar"] as const).map((option) => (
            <Button
              key={option}
              size="sm"
              variant={view === option ? "default" : "outline"}
              aria-current={view === option ? "true" : undefined}
              render={<Link href={href({ month, view: option })} />}
            >
              {option === "table" ? "Table" : "Calendar"}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
