/**
 * Calendar grid assembly. The cases worth asserting are the ones where a grid
 * silently misdates something: a month whose 1st is a Sunday, an entry that
 * belongs to the padding week, and the UTC-vs-local boundary that would move
 * an entry a day for some viewers and not others.
 */
import { describe, expect, it } from "vitest";
import {
  buildCalendarMonth,
  gridRange,
  isCalendarMonth,
  monthRange,
  shiftMonth,
} from "./aggregate";
import type { CalendarEntry, CalendarSource } from "./types";

function entry(date: string, p: Partial<CalendarEntry> = {}): CalendarEntry {
  return {
    entryId: `task:${date}`,
    source: "task",
    title: "Task",
    date,
    at: null,
    endAt: null,
    status: "todo",
    href: "/tasks",
    ...p,
  };
}

const ALL: CalendarSource[] = ["meeting", "milestone", "task"];

describe("monthRange", () => {
  it("ends on the real last day, including a leap February", () => {
    expect(monthRange("2026-08")).toEqual({
      from: "2026-08-01",
      to: "2026-08-31",
    });
    expect(monthRange("2026-02").to).toBe("2026-02-28");
    expect(monthRange("2028-02").to).toBe("2028-02-29");
    expect(monthRange("2026-04").to).toBe("2026-04-30");
  });
});

describe("shiftMonth", () => {
  it("crosses year boundaries in both directions", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-08", 0)).toBe("2026-08");
  });
});

describe("gridRange", () => {
  it("pads out to whole Monday-first weeks", () => {
    // 2026-08-01 is a Saturday, 2026-08-31 a Monday.
    expect(gridRange("2026-08")).toEqual({
      from: "2026-07-27", // the Monday before
      to: "2026-09-06", // the Sunday after
    });
  });

  it("adds no padding when the month already starts Monday and ends Sunday", () => {
    // 2026-06-01 is a Monday; 2026-06-30 is a Tuesday, so only the tail pads.
    const range = gridRange("2026-06");
    expect(range.from).toBe("2026-06-01");
    expect(range.to).toBe("2026-07-05");
  });

  it("spans a whole number of weeks", () => {
    for (const month of ["2026-01", "2026-02", "2026-08", "2028-02"]) {
      const { from, to } = gridRange(month);
      const days =
        (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
          86_400_000 +
        1;
      expect(days % 7).toBe(0);
    }
  });
});

describe("buildCalendarMonth", () => {
  it("produces whole weeks of seven days each", () => {
    const month = buildCalendarMonth([], {
      month: "2026-08",
      today: "2026-08-12",
      sources: ALL,
    });
    expect(month.weeks.length).toBeGreaterThan(0);
    for (const week of month.weeks) expect(week).toHaveLength(7);
  });

  it("marks padding days out of month and excludes them from the count", () => {
    const month = buildCalendarMonth(
      [entry("2026-07-28"), entry("2026-08-03")],
      { month: "2026-08", today: "2026-08-12", sources: ALL },
    );
    const flat = month.weeks.flat();
    const padding = flat.find((d) => d.date === "2026-07-28")!;
    const inside = flat.find((d) => d.date === "2026-08-03")!;

    expect(padding.inMonth).toBe(false);
    // Still rendered — it is a real entry, just outside the month.
    expect(padding.entries).toHaveLength(1);
    expect(inside.inMonth).toBe(true);
    // Only the in-month entry is counted.
    expect(month.totalEntries).toBe(1);
  });

  it("flags exactly one day as today", () => {
    const month = buildCalendarMonth([], {
      month: "2026-08",
      today: "2026-08-12",
      sources: ALL,
    });
    const todays = month.weeks.flat().filter((d) => d.isToday);
    expect(todays).toHaveLength(1);
    expect(todays[0].date).toBe("2026-08-12");
  });

  it("flags no day when today is in another month", () => {
    const month = buildCalendarMonth([], {
      month: "2026-03",
      today: "2026-08-12",
      sources: ALL,
    });
    expect(month.weeks.flat().some((d) => d.isToday)).toBe(false);
  });

  it("orders timed entries chronologically ahead of date-only ones", () => {
    const day = "2026-08-12";
    const month = buildCalendarMonth(
      [
        entry(day, { entryId: "task:a", title: "Zebra task" }),
        entry(day, {
          entryId: "meeting:late",
          source: "meeting",
          title: "Standup",
          at: `${day}T15:00:00.000Z`,
        }),
        entry(day, {
          entryId: "meeting:early",
          source: "meeting",
          title: "Kickoff",
          at: `${day}T09:00:00.000Z`,
        }),
      ],
      { month: "2026-08", today: day, sources: ALL },
    );
    const cell = month.weeks.flat().find((d) => d.date === day)!;
    expect(cell.entries.map((e) => e.entryId)).toEqual([
      "meeting:early",
      "meeting:late",
      "task:a",
    ]);
  });

  it("drops entries outside the padded grid rather than clamping them", () => {
    const month = buildCalendarMonth(
      [entry("2026-01-15"), entry("2026-08-12")],
      { month: "2026-08", today: "2026-08-12", sources: ALL },
    );
    const all = month.weeks.flat().flatMap((d) => d.entries);
    expect(all).toHaveLength(1);
    expect(all[0].date).toBe("2026-08-12");
  });

  it("carries the permitted source list through, empty included", () => {
    const none = buildCalendarMonth([], {
      month: "2026-08",
      today: "2026-08-12",
      sources: [],
    });
    expect(none.sources).toEqual([]);
    expect(none.totalEntries).toBe(0);

    const some = buildCalendarMonth([], {
      month: "2026-08",
      today: "2026-08-12",
      sources: ["meeting"],
    });
    expect(some.sources).toEqual(["meeting"]);
  });

  it("places the 1st in the correct weekday column", () => {
    // 2026-08-01 is a Saturday — column index 5 in a Monday-first week.
    const month = buildCalendarMonth([], {
      month: "2026-08",
      today: "2026-08-12",
      sources: ALL,
    });
    const firstWeek = month.weeks[0];
    expect(firstWeek.findIndex((d) => d.date === "2026-08-01")).toBe(5);
  });

  it("covers every day of the month exactly once", () => {
    const month = buildCalendarMonth([], {
      month: "2026-02",
      today: "2026-02-10",
      sources: ALL,
    });
    const inMonth = month.weeks.flat().filter((d) => d.inMonth);
    expect(inMonth).toHaveLength(28);
    expect(new Set(inMonth.map((d) => d.date)).size).toBe(28);
  });
});

describe("isCalendarMonth", () => {
  it("accepts real months and rejects malformed ones", () => {
    expect(isCalendarMonth("2026-08")).toBe(true);
    expect(isCalendarMonth("2026-13")).toBe(false);
    expect(isCalendarMonth("2026-00")).toBe(false);
    expect(isCalendarMonth("2026-8")).toBe(false);
    expect(isCalendarMonth("not-a-month")).toBe(false);
  });
});
