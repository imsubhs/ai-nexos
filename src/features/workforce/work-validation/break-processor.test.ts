import { describe, expect, it } from "vitest";
import { processBreaks } from "./break-processor";
import { buildSession } from "./session-builder";
import { DEFAULT_ENGINE_CONFIG } from "./config";
import type { TimePeriod } from "./value-objects";

const MIN = 60_000;
const at = (m: number) => m * MIN;
const cfg = DEFAULT_ENGINE_CONFIG;
const session = (endMin = 540) =>
  buildSession([{ clockIn: 0, clockOut: at(endMin) }], at(600), cfg);
const period = (s: number, e: number | null): TimePeriod => ({
  startAt: at(s),
  endAt: e === null ? null : at(e),
});

describe("processBreaks", () => {
  it("keeps a normal in-session break", () => {
    const r = processBreaks([period(180, 240)], session(), at(600), cfg);
    expect(r.breakMs).toBe(at(60));
    expect(r.findings).toHaveLength(0);
  });

  it("merges overlapping breaks and flags the overlap", () => {
    const r = processBreaks(
      [period(180, 240), period(220, 300)],
      session(),
      at(600),
      cfg,
    );
    expect(r.breakMs).toBe(at(120)); // 180–300 merged
    expect(r.intervals).toHaveLength(1);
    expect(r.findings.some((f) => f.code === "overlapping-breaks")).toBe(true);
  });

  it("drops a zero-length break as invalid", () => {
    const r = processBreaks([period(100, 100)], session(), at(600), cfg);
    expect(r.breakMs).toBe(0);
    expect(r.findings.some((f) => f.code === "invalid-break")).toBe(true);
  });

  it("clamps a break that extends past clock-out (clock-out before break end)", () => {
    // session ends at 540; break 500–600 → only 500–540 counts.
    const r = processBreaks([period(500, 600)], session(540), at(600), cfg);
    expect(r.breakMs).toBe(at(40));
    expect(
      r.findings.some((f) => f.code === "clock-out-before-break-end"),
    ).toBe(true);
  });

  it("drops a break entirely outside the session", () => {
    const r = processBreaks([period(600, 660)], session(540), at(700), cfg);
    expect(r.breakMs).toBe(0);
    expect(r.findings.some((f) => f.code === "break-outside-session")).toBe(
      true,
    );
  });

  it("closes an open break against now", () => {
    const r = processBreaks([period(200, null)], session(), at(260), cfg);
    expect(r.breakMs).toBe(at(60)); // 200 → now(260)
  });
});
