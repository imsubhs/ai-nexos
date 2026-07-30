import { describe, expect, it } from "vitest";
import { detectIdle } from "./idle-detector";
import { buildSession } from "./session-builder";
import { DEFAULT_ENGINE_CONFIG, resolveConfig } from "./config";
import type { Interval, TimePeriod } from "./value-objects";

const MIN = 60_000;
const at = (m: number) => m * MIN;
const cfg = DEFAULT_ENGINE_CONFIG;
const session = () =>
  buildSession([{ clockIn: 0, clockOut: at(540) }], at(600), cfg);
const period = (s: number, e: number | null): TimePeriod => ({
  startAt: at(s),
  endAt: e === null ? null : at(e),
});
const iv = (s: number, e: number): Interval => ({ start: at(s), end: at(e) });

describe("detectIdle", () => {
  it("counts an in-session idle block", () => {
    const r = detectIdle([period(300, 330)], session(), [], at(600), cfg);
    expect(r.idleMs).toBe(at(30));
  });

  it("does not count idle that overlaps a break (no double-charge)", () => {
    // break 180–240; idle 210–270 → only 240–270 is idle.
    const r = detectIdle(
      [period(210, 270)],
      session(),
      [iv(180, 240)],
      at(600),
      cfg,
    );
    expect(r.idleMs).toBe(at(30));
  });

  it("clamps idle to the session", () => {
    const r = detectIdle([period(520, 600)], session(), [], at(600), cfg);
    expect(r.idleMs).toBe(at(20)); // only 520–540
  });

  it("merges adjacent idle blocks", () => {
    const r = detectIdle(
      [period(100, 130), period(130, 160)],
      session(),
      [],
      at(600),
      cfg,
    );
    expect(r.intervals).toHaveLength(1);
    expect(r.idleMs).toBe(at(60));
  });

  it("reclassifies sub-threshold idle as effective when a minimum is set", () => {
    const strict = resolveConfig({ minIdleBlockMs: at(5) });
    const r = detectIdle(
      [period(100, 103), period(200, 230)],
      session(),
      [],
      at(600),
      strict,
    );
    expect(r.idleMs).toBe(at(30)); // the 3-min block is dropped
    expect(
      r.findings.some((f) => f.code === "idle-below-threshold-reclassified"),
    ).toBe(true);
  });

  it("warns on an idle block far exceeding the idle threshold", () => {
    const r = detectIdle([period(0, 120)], session(), [], at(600), cfg); // 120 min ≫ 3×10
    expect(r.findings.some((f) => f.code === "idle-exceeds-threshold")).toBe(
      true,
    );
  });
});
