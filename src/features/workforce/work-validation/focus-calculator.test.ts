import { describe, expect, it } from "vitest";
import { calculateFocus } from "./focus-calculator";
import { buildSession } from "./session-builder";
import { DEFAULT_ENGINE_CONFIG, resolveConfig } from "./config";
import type { Interval, TimePeriod } from "./value-objects";

const MIN = 60_000;
const at = (m: number) => m * MIN;
const cfg = DEFAULT_ENGINE_CONFIG;
const session = () => buildSession([{ clockIn: 0, clockOut: at(540) }], at(600), cfg);
const period = (s: number, e: number | null): TimePeriod => ({ startAt: at(s), endAt: e === null ? null : at(e) });
const iv = (s: number, e: number): Interval => ({ start: at(s), end: at(e) });

describe("calculateFocus", () => {
  it("excludes breaks from focus (focus paused on break)", () => {
    const r = calculateFocus([period(0, 180)], session(), [iv(60, 120)], [], at(600), cfg);
    expect(r.focusMs).toBe(at(120)); // 180 total − 60 break
  });

  it("excludes idle from focus", () => {
    const r = calculateFocus([period(0, 180)], session(), [], [iv(60, 90)], at(600), cfg);
    expect(r.focusMs).toBe(at(150));
  });

  it("excludes non-working time (outside the session)", () => {
    const r = calculateFocus([period(500, 600)], session(), [], [], at(600), cfg);
    expect(r.focusMs).toBe(at(40)); // only 500–540 is inside the session
  });

  it("drops focus blocks below the sustained-focus minimum", () => {
    const strict = resolveConfig({ minFocusBlockMs: at(10) });
    const r = calculateFocus([period(0, 5), period(100, 130)], session(), [], [], at(600), strict);
    expect(r.focusMs).toBe(at(30));
    expect(r.intervals).toHaveLength(1);
  });
});
