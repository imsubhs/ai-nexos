import Link from "next/link";
import {
  CALENDAR_SOURCE_LABEL,
  type CalendarEntry,
  type CalendarMonth,
} from "../types";
import { formatDate } from "@/features/workforce/shared/format";

const WEEKDAY_HEADS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SOURCE_STYLE: Record<CalendarEntry["source"], string> = {
  meeting: "border-sky-500/40 bg-sky-500/10",
  milestone: "border-violet-500/40 bg-violet-500/10",
  task: "border-amber-500/40 bg-amber-500/10",
};

const SOURCE_DOT: Record<CalendarEntry["source"], string> = {
  meeting: "bg-sky-500",
  milestone: "bg-violet-500",
  task: "bg-amber-500",
};

/**
 * The month grid. Every entry is a link into the module that owns the record —
 * the calendar shows *when*, and hands off to the owner for *what*.
 *
 * A server component: nothing here is interactive beyond navigation, and the
 * month lives in the URL, so this ships no client JavaScript.
 */
export function CalendarMonthGrid({
  month,
}: Readonly<{ month: CalendarMonth }>) {
  return (
    <div className="bg-card overflow-x-auto rounded-xl border p-4">
      <table className="w-full min-w-[48rem] table-fixed border-separate border-spacing-1">
        <caption className="sr-only">
          Scheduled meetings, milestones and task due dates by day
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
          {month.weeks.map((week) => (
            <tr key={week[0].date}>
              {week.map((day) => (
                <td
                  key={day.date}
                  className={[
                    "h-28 rounded-lg border p-1.5 align-top",
                    day.inMonth ? "" : "bg-muted/30",
                    day.isToday ? "ring-primary ring-2" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div
                    className={[
                      "mb-1 text-xs tabular-nums",
                      day.inMonth ? "" : "text-muted-foreground/60",
                    ].join(" ")}
                  >
                    {Number(day.date.slice(8, 10))}
                  </div>
                  <ul className="space-y-1">
                    {day.entries.map((entry) => (
                      <li key={entry.entryId}>
                        <Link
                          href={entry.href}
                          className={[
                            "block truncate rounded border px-1.5 py-0.5 text-xs",
                            SOURCE_STYLE[entry.source],
                            "focus-visible:ring-ring hover:underline focus-visible:ring-2 focus-visible:outline-none",
                          ].join(" ")}
                          // The visible text is a bare title; the accessible name
                          // carries what kind of thing it is and when.
                          aria-label={`${CALENDAR_SOURCE_LABEL[entry.source]}: ${entry.title}, ${formatDate(entry.date)}${
                            entry.at ? ` at ${entry.at.slice(11, 16)}` : ""
                          }`}
                        >
                          <span
                            className={`mr-1 inline-block size-1.5 rounded-full align-middle ${SOURCE_DOT[entry.source]}`}
                            aria-hidden="true"
                          />
                          {entry.at ? (
                            <span className="tabular-nums">
                              {entry.at.slice(11, 16)}{" "}
                            </span>
                          ) : null}
                          {entry.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
