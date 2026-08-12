/**
 * Workforce presentation formatting.
 *
 * Two of these pin the exact strings the production walkthrough saw: six metric
 * cards reading "—" for a session whose metrics were a measured zero, and a
 * clock-in reading 19:16 on a card headed "Wed 12 Aug 2026" for a session that
 * began at 00:46 on the 13th.
 */
import { describe, expect, it } from "vitest";
import { formatDate, formatMinutes, formatTime } from "./format";

const IST = "Asia/Kolkata";

describe("formatMinutes", () => {
  it("renders a measured zero as 0m, not as missing", () => {
    // The engine rounds to whole minutes, so a 17-second session is genuinely
    // 0. Rendering that as "—" claimed the calculation had failed.
    expect(formatMinutes(0)).toBe("0m");
  });

  it("renders nothing at all as —", () => {
    expect(formatMinutes(null)).toBe("—");
    expect(formatMinutes(undefined)).toBe("—");
    expect(formatMinutes(Number.NaN)).toBe("—");
    expect(formatMinutes(Number.POSITIVE_INFINITY)).toBe("—");
  });

  it("renders hours and minutes", () => {
    expect(formatMinutes(45)).toBe("45m");
    expect(formatMinutes(60)).toBe("1h");
    expect(formatMinutes(480)).toBe("8h");
    expect(formatMinutes(495)).toBe("8h 15m");
    expect(formatMinutes(540)).toBe("9h");
  });

  it("clamps a negative value rather than printing one", () => {
    expect(formatMinutes(-5)).toBe("0m");
  });
});

describe("formatTime", () => {
  it("quotes the organization's clock, not UTC", () => {
    const at = "2026-08-12T19:16:52.252Z";
    expect(formatTime(at, "UTC")).toBe("19:16");
    expect(formatTime(at, IST)).toBe("00:46");
  });

  it("still renders — for an absent or unparsable instant", () => {
    expect(formatTime(null, IST)).toBe("—");
    expect(formatTime("not a date", IST)).toBe("—");
  });

  it("agrees with the day the card is headed with", () => {
    // The pair that disagreed in production: the row's date came from the
    // organization's zone and the time came from UTC, so one card showed a
    // clock-in that belonged to the day after the date above it.
    const at = "2026-08-12T19:16:52.252Z";
    expect(formatDate("2026-08-13")).toBe("Thu 13 Aug 2026");
    expect(formatTime(at, IST)).toBe("00:46");
  });
});
