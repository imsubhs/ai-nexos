import { describe, expect, it } from "vitest";
import { buildSession } from "./session-builder";
import { DEFAULT_ENGINE_CONFIG } from "./config";

const MIN = 60_000;
const at = (m: number) => m * MIN;
const cfg = DEFAULT_ENGINE_CONFIG;

describe("buildSession", () => {
  it("builds a single closed session", () => {
    const s = buildSession(
      [{ clockIn: at(0), clockOut: at(540) }],
      at(600),
      cfg,
    );
    expect(s.sessionMs).toBe(at(540));
    expect(s.isOngoing).toBe(false);
    expect(s.startedAt).toBe(0);
    expect(s.endedAt).toBe(at(540));
  });

  it("bounds an open session at now and flags it ongoing", () => {
    const s = buildSession([{ clockIn: at(0), clockOut: null }], at(120), cfg);
    expect(s.sessionMs).toBe(at(120));
    expect(s.isOngoing).toBe(true);
    expect(s.findings.some((f) => f.code === "open-session")).toBe(true);
  });

  it("drops a segment whose clock-out precedes clock-in and flags it", () => {
    const s = buildSession(
      [{ clockIn: at(100), clockOut: at(40) }],
      at(100),
      cfg,
    );
    expect(s.sessionMs).toBe(0);
    expect(
      s.findings.some(
        (f) => f.code === "negative-session" && f.severity === "violation",
      ),
    ).toBe(true);
  });

  it("handles a cross-midnight session with epoch bounds", () => {
    const dayMs = 24 * 60 * MIN;
    const s = buildSession(
      [{ clockIn: dayMs - at(60), clockOut: dayMs + at(120) }],
      dayMs + at(200),
      cfg,
    );
    expect(s.sessionMs).toBe(at(180));
  });

  it("merges overlapping re-clocks so time is not double-counted", () => {
    const s = buildSession(
      [
        { clockIn: at(0), clockOut: at(300) },
        { clockIn: at(240), clockOut: at(420) },
      ],
      at(500),
      cfg,
    );
    expect(s.sessionMs).toBe(at(420)); // union 0–420, not 300+180
    expect(s.intervals).toHaveLength(1);
  });

  it("sums disjoint sessions", () => {
    const s = buildSession(
      [
        { clockIn: at(0), clockOut: at(120) },
        { clockIn: at(300), clockOut: at(420) },
      ],
      at(500),
      cfg,
    );
    expect(s.sessionMs).toBe(at(240));
    expect(s.intervals).toHaveLength(2);
  });
});
