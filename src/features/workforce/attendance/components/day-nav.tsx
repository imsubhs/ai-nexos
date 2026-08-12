import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "../../shared/format";

function shiftDay(isoDate: string, days: number): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/**
 * Day stepper for the team page — links, so `?date=` stays the view state and a
 * particular day is shareable (doc 18 F-06 param naming).
 */
export function DayNav({
  basePath,
  date,
  extraParams,
}: Readonly<{
  basePath: string;
  date: string;
  extraParams?: Record<string, string>;
}>) {
  const href = (next: string) =>
    `${basePath}?${new URLSearchParams({ ...extraParams, date: next }).toString()}`;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        render={
          <Link href={href(shiftDay(date, -1))} aria-label="Previous day" />
        }
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-48 text-center text-sm font-medium">
        {formatDate(date)}
      </span>
      <Button
        variant="outline"
        size="sm"
        render={<Link href={href(shiftDay(date, 1))} aria-label="Next day" />}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
