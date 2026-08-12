import { CALENDAR_SOURCE_LABEL, type CalendarSource } from "../types";

const SOURCE_DOT: Record<CalendarSource, string> = {
  meeting: "bg-sky-500",
  milestone: "bg-violet-500",
  task: "bg-amber-500",
};

const SOURCE_OWNER: Record<CalendarSource, string> = {
  meeting: "Meetings",
  milestone: "Timelines",
  task: "Tasks",
};

/**
 * The legend doubles as a statement of provenance: it names the module each
 * colour comes from, so the page never reads as if the calendar owned any of it.
 * It lists only the sources this viewer was permitted to read.
 */
export function CalendarLegend({
  sources,
}: Readonly<{ sources: CalendarSource[] }>) {
  if (sources.length === 0) return null;

  return (
    <ul className="text-muted-foreground flex flex-wrap items-center gap-4 text-xs">
      {sources.map((source) => (
        <li key={source} className="flex items-center gap-1.5">
          <span
            className={`size-2 rounded-full ${SOURCE_DOT[source]}`}
            aria-hidden="true"
          />
          {CALENDAR_SOURCE_LABEL[source]}
          <span className="opacity-70">· from {SOURCE_OWNER[source]}</span>
        </li>
      ))}
    </ul>
  );
}
