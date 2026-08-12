import { formatMinutes } from "../../shared/format";
import type { HistoryGridDay } from "../read-models";

const WEEKDAY_HEADS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_DOT: Record<string, string> = {
  PRESENT: "bg-primary",
  WORKING: "bg-primary",
  LATE: "bg-amber-500",
  WFH: "bg-sky-500",
  HALF_DAY: "bg-amber-400",
  ABSENT: "bg-destructive",
  LEAVE: "bg-muted-foreground",
  HOLIDAY: "bg-muted-foreground",
};

/**
 * The calendar rendering of the same month the table shows (doc 16 S-5 toggle).
 *
 * It receives the grid built from the identical `rows` array, so the two views
 * cannot disagree — the parity the WP-113 acceptance criterion asks for is
 * structural here, not a thing to keep in sync by hand.
 */
export function HistoryMonthGrid({
  weeks,
}: Readonly<{ weeks: HistoryGridDay[][] }>) {
  return (
    <div className="bg-card overflow-x-auto rounded-xl border p-4">
      <table className="w-full min-w-[42rem] table-fixed border-separate border-spacing-1">
        <caption className="sr-only">
          My attendance for the month, by day
        </caption>
        <thead>
          <tr>
            {WEEKDAY_HEADS.map((day) => (
              <th
                key={day}
                scope="col"
                className="text-muted-foreground pb-2 text-xs font-medium"
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0].date}>
              {week.map((day) => (
                <td
                  key={day.date}
                  className={[
                    "h-20 rounded-lg border p-2 align-top text-xs",
                    day.inMonth ? "" : "bg-muted/30 text-muted-foreground/60",
                    day.isToday ? "ring-primary ring-2" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="flex items-center justify-between">
                    <span className="tabular-nums">
                      {Number(day.date.slice(8, 10))}
                    </span>
                    {day.row ? (
                      <span
                        className={`size-2 rounded-full ${
                          STATUS_DOT[day.row.status] ?? "bg-muted-foreground"
                        }`}
                        // The dot is decorative — the status word below carries
                        // the same information as text.
                        aria-hidden="true"
                      />
                    ) : null}
                  </div>
                  {day.row ? (
                    <div className="mt-1 space-y-0.5">
                      <p className="truncate font-medium">
                        {day.row.status.replace("_", " ")}
                      </p>
                      {day.row.metrics.workingMinutes > 0 ? (
                        <p className="text-muted-foreground tabular-nums">
                          {formatMinutes(day.row.metrics.workingMinutes)}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
