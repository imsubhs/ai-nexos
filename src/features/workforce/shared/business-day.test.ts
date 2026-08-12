/**
 * The attendance business-day kernel. Every assertion here is a fact the old
 * server-UTC derivation got wrong for any organization whose clock is not UTC.
 */
import { describe, expect, it } from "vitest";
import {
  businessDayIn,
  currentBusinessDay,
  instantAtWallClock,
  resolveTimeZone,
  timeZoneLabel,
  wallClockTimeIn,
  zonedParts,
} from "./business-day";

const IST = "Asia/Kolkata";

describe("businessDayIn", () => {
  it("is the UTC date for a UTC organization", () => {
    const at = new Date("2026-08-12T19:16:52.252Z");
    expect(businessDayIn(at, "UTC")).toBe("2026-08-12");
  });

  it("has already turned over for an IST organization at 19:16 UTC", () => {
    // The exact instant of the production walkthrough's clock-in: 00:46 IST on
    // the 13th, which UTC still calls the 12th. This one line is the whole bug.
    const at = new Date("2026-08-12T19:16:52.252Z");
    expect(businessDayIn(at, IST)).toBe("2026-08-13");
  });

  it("has not yet turned over for an IST organization at 18:29 UTC", () => {
    // 23:59 IST on the 12th — the last minute of that business day.
    expect(businessDayIn(new Date("2026-08-12T18:29:00Z"), IST)).toBe(
      "2026-08-12",
    );
  });

  it("is still the previous day for a zone behind UTC", () => {
    // 20:00 on the 12th in New York is 00:00 on the 13th in UTC.
    expect(
      businessDayIn(new Date("2026-08-13T00:00:00Z"), "America/New_York"),
    ).toBe("2026-08-12");
  });

  it("crosses the year boundary on the organization's clock", () => {
    expect(businessDayIn(new Date("2026-12-31T18:31:00Z"), IST)).toBe(
      "2027-01-01",
    );
  });

  it("reads the current instant when asked for today", () => {
    const now = new Date("2026-08-12T19:16:52.252Z");
    expect(currentBusinessDay(IST, now)).toBe("2026-08-13");
    expect(currentBusinessDay("UTC", now)).toBe("2026-08-12");
  });
});

describe("instantAtWallClock", () => {
  it("resolves a shift start in a whole-hour zone", () => {
    expect(instantAtWallClock("2026-08-13", "09:00", "UTC")).toBe(
      Date.parse("2026-08-13T09:00:00Z"),
    );
  });

  it("resolves a shift start in a half-hour offset zone", () => {
    // 09:00 IST is 03:30 UTC.
    expect(instantAtWallClock("2026-08-13", "09:00", IST)).toBe(
      Date.parse("2026-08-13T03:30:00Z"),
    );
  });

  it("uses the offset in force on that date, not today's", () => {
    // New York is UTC-5 in January and UTC-4 in July; one formula must give
    // both, which is why the offset is read at the candidate instant.
    expect(instantAtWallClock("2026-01-15", "09:00", "America/New_York")).toBe(
      Date.parse("2026-01-15T14:00:00Z"),
    );
    expect(instantAtWallClock("2026-07-15", "09:00", "America/New_York")).toBe(
      Date.parse("2026-07-15T13:00:00Z"),
    );
  });

  it("resolves a spring-forward gap deterministically, on the right day", () => {
    // 8 March 2026, US DST start: clocks jump 02:00 → 03:00, so 02:30 has no
    // instant at all. It resolves one offset-step earlier — 01:30 local — and,
    // critically, stays on the 8th rather than throwing or landing a day out.
    const ms = instantAtWallClock("2026-03-08", "02:30", "America/New_York");
    expect(businessDayIn(new Date(ms), "America/New_York")).toBe("2026-03-08");
    expect(wallClockTimeIn(new Date(ms), "America/New_York")).toBe("01:30");
  });

  it("resolves an autumn fall-back hour, which happens twice", () => {
    // 1 November 2026: 01:30 occurs once at EDT and again at EST. Either is a
    // defensible reading; the requirement is that one of them is chosen and
    // the date is right.
    const ms = instantAtWallClock("2026-11-01", "01:30", "America/New_York");
    expect(businessDayIn(new Date(ms), "America/New_York")).toBe("2026-11-01");
    expect(wallClockTimeIn(new Date(ms), "America/New_York")).toBe("01:30");
  });

  it("round-trips a wall clock through the day it belongs to", () => {
    for (const zone of [IST, "UTC", "America/New_York", "Pacific/Auckland"]) {
      const ms = instantAtWallClock("2026-08-13", "09:00", zone);
      expect(businessDayIn(new Date(ms), zone)).toBe("2026-08-13");
      expect(wallClockTimeIn(new Date(ms), zone)).toBe("09:00");
    }
  });
});

describe("wallClockTimeIn", () => {
  it("reports the clock the employee actually reads", () => {
    const at = new Date("2026-08-12T19:16:52.252Z");
    expect(wallClockTimeIn(at, "UTC")).toBe("19:16");
    expect(wallClockTimeIn(at, IST)).toBe("00:46");
  });

  it("renders midnight as 00:00, never 24:00", () => {
    expect(wallClockTimeIn(new Date("2026-08-12T18:30:00Z"), IST)).toBe(
      "00:00",
    );
  });
});

describe("resolveTimeZone", () => {
  it("keeps a real IANA zone", () => {
    expect(resolveTimeZone(IST)).toBe(IST);
    expect(resolveTimeZone("UTC")).toBe("UTC");
  });

  it("falls back to UTC rather than throwing on an unusable value", () => {
    // organizations.timezone is shape-validated on write, which admits
    // well-formed names no IANA database contains. An attendance page must not
    // 500 because of one bad settings row.
    expect(resolveTimeZone("Mars/Olympus")).toBe("UTC");
    expect(resolveTimeZone(null)).toBe("UTC");
    expect(resolveTimeZone("")).toBe("UTC");
  });

  it("keeps zonedParts working through the fallback", () => {
    const parts = zonedParts(new Date("2026-08-12T19:16:52Z"), "Mars/Olympus");
    expect(parts).toMatchObject({ year: 2026, month: 8, day: 12, hour: 19 });
  });
});

describe("timeZoneLabel", () => {
  it("names the clock a screen is quoting", () => {
    expect(timeZoneLabel("UTC", new Date("2026-08-12T19:16:52Z"))).toBe("UTC");
    expect(timeZoneLabel(IST, new Date("2026-08-12T19:16:52Z"))).toMatch(
      /GMT\+5:30|IST/,
    );
  });
});
