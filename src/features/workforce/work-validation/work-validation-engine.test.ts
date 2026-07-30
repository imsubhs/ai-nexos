import { describe, expect, it } from "vitest";
import { computeWorkValidation, validateWorkDay } from "./work-validation-engine";
import type { TimePeriod } from "./value-objects";
import type { ValidationResult, WorkValidationInput } from "./types";

const MIN = 60_000;
const at = (m: number) => m * MIN;
const period = (s: number, e: number | null): TimePeriod => ({ startAt: at(s), endAt: e === null ? null : at(e) });

function day(overrides: Partial<WorkValidationInput> = {}): WorkValidationInput {
  return {
    segments: [{ clockIn: at(0), clockOut: at(540) }],
    breaks: [],
    idlePeriods: [],
    focusPeriods: [],
    ...overrides,
  };
}

/** Assert every invariant the engine guarantees, on any result. */
function assertInvariants(r: ValidationResult): void {
  expect(r.effectiveMs + r.idleMs + r.breakMs).toBe(r.sessionMs);
  expect(r.effectiveMinutes + r.idleMinutes + r.breakMinutes).toBe(r.sessionMinutes);
  for (const value of [r.sessionMs, r.effectiveMs, r.idleMs, r.breakMs, r.focusMs]) {
    expect(value).toBeGreaterThanOrEqual(0);
  }
  for (const value of [r.effectiveMinutes, r.idleMinutes, r.breakMinutes, r.focusMinutes]) {
    expect(value).toBeGreaterThanOrEqual(0);
  }
  expect(r.focusMs).toBeLessThanOrEqual(r.sessionMs);

  // Timeline slices partition the session: ordered, non-overlapping, exact
  // total. (Gaps between DISJOINT clock segments are non-working and correctly
  // absent, so slices need not be contiguous — only ordered & non-overlapping.)
  let cursor = -Infinity;
  let sum = 0;
  for (const entry of r.timeline) {
    expect(entry.start).toBeGreaterThanOrEqual(cursor); // ordered, non-overlapping
    expect(entry.end).toBeGreaterThan(entry.start);
    expect(entry.durationMs).toBe(entry.end - entry.start);
    cursor = entry.end;
    sum += entry.durationMs;
  }
  expect(sum).toBe(r.sessionMs);
}

describe("validateWorkDay — canonical scenarios", () => {
  it("simple day: no breaks or idle is fully effective", () => {
    const r = validateWorkDay(day(), at(540));
    expect(r.sessionMinutes).toBe(540);
    expect(r.effectiveMinutes).toBe(540);
    expect(r.isOngoing).toBe(false);
    assertInvariants(r);
  });

  it("multiple breaks", () => {
    const r = validateWorkDay(
      day({ breaks: [period(120, 150), period(300, 360)] }),
      at(540),
    );
    expect(r.breakMinutes).toBe(90);
    expect(r.effectiveMinutes).toBe(450);
    assertInvariants(r);
  });

  it("overlapping breaks merge and count once", () => {
    const r = validateWorkDay(
      day({ breaks: [period(180, 240), period(220, 300)] }),
      at(540),
    );
    expect(r.breakMinutes).toBe(120);
    expect(r.warnings.some((f) => f.code === "overlapping-breaks")).toBe(true);
    assertInvariants(r);
  });

  it("clock out before break ends: break is clamped to the session", () => {
    const r = validateWorkDay(
      { ...day({ segments: [{ clockIn: at(0), clockOut: at(300) }] }), breaks: [period(280, 360)] },
      at(400),
    );
    expect(r.breakMinutes).toBe(20); // 280–300 only
    expect(r.violations.some((f) => f.code === "clock-out-before-break-end")).toBe(true);
    assertInvariants(r);
  });

  it("missing clock out: bounded at now and reported ongoing", () => {
    const r = validateWorkDay(
      day({ segments: [{ clockIn: at(0), clockOut: null }], idlePeriods: [period(60, null)] }),
      at(120),
    );
    expect(r.sessionMinutes).toBe(120);
    expect(r.idleMinutes).toBe(60);
    expect(r.effectiveMinutes).toBe(60);
    expect(r.isOngoing).toBe(true);
    expect(r.warnings.some((f) => f.code === "open-session")).toBe(true);
    assertInvariants(r);
  });

  it("cross-midnight session", () => {
    const dayMs = 24 * 60 * MIN;
    const r = validateWorkDay(
      { segments: [{ clockIn: dayMs - at(60), clockOut: dayMs + at(120) }], breaks: [], idlePeriods: [], focusPeriods: [] },
      dayMs + at(200),
    );
    expect(r.sessionMinutes).toBe(180);
    assertInvariants(r);
  });

  it("duplicate intervals are idempotent", () => {
    const r = validateWorkDay(
      day({ breaks: [period(180, 240), period(180, 240), period(180, 240)] }),
      at(540),
    );
    expect(r.breakMinutes).toBe(60);
    assertInvariants(r);
  });

  it("idle threshold reclassifies short idle to effective", () => {
    const r = validateWorkDay(
      day({ idlePeriods: [period(100, 103), period(200, 230)], config: { minIdleBlockMs: at(5) } }),
      at(540),
    );
    expect(r.idleMinutes).toBe(30);
    assertInvariants(r);
  });

  it("focus calculation excludes break and idle", () => {
    const r = validateWorkDay(
      day({
        breaks: [period(60, 120)],
        idlePeriods: [period(200, 230)],
        focusPeriods: [period(0, 300)],
      }),
      at(540),
    );
    expect(r.focusMinutes).toBe(210); // 300 − 60 break − 30 idle
    assertInvariants(r);
  });

  it("does not double-count idle overlapping a break", () => {
    const r = validateWorkDay(
      day({ breaks: [period(180, 240)], idlePeriods: [period(210, 270)] }),
      at(540),
    );
    expect(r.breakMinutes).toBe(60);
    expect(r.idleMinutes).toBe(30);
    expect(r.effectiveMinutes).toBe(450);
    assertInvariants(r);
  });

  it("derived metrics expose ratios and focus stats", () => {
    const r = validateWorkDay(
      day({ breaks: [period(180, 240)], focusPeriods: [period(0, 120), period(300, 420)] }),
      at(540),
    );
    expect(r.derived.breakRatio).toBeCloseTo(60 / 540, 5);
    expect(r.derived.focusBlockCount).toBe(2);
    expect(r.derived.longestFocusMs).toBe(at(120));
    expect(r.derived.idleThresholdMs).toBe(10 * MIN);
  });
});

describe("computeWorkValidation — legacy contract (ported W1)", () => {
  it("treats a full session with no breaks/idle as fully effective", () => {
    const m = computeWorkValidation(
      { loginAt: at(0), logoutAt: at(540), breaks: [], idlePeriods: [], focusPeriods: [] },
      at(540),
    );
    expect(m.sessionMinutes).toBe(540);
    expect(m.effectiveMinutes).toBe(540);
    expect(m.isOngoing).toBe(false);
  });

  it("subtracts break and idle from effective time", () => {
    const m = computeWorkValidation(
      {
        loginAt: at(0),
        logoutAt: at(540),
        breaks: [period(180, 240)],
        idlePeriods: [period(300, 330)],
        focusPeriods: [],
      },
      at(540),
    );
    expect(m.breakMinutes).toBe(60);
    expect(m.idleMinutes).toBe(30);
    expect(m.effectiveMinutes).toBe(450);
  });

  it("never produces negative durations when logout precedes login", () => {
    const m = computeWorkValidation(
      { loginAt: at(100), logoutAt: at(40), breaks: [], idlePeriods: [], focusPeriods: [] },
      at(100),
    );
    expect(m.sessionMinutes).toBe(0);
    expect(m.effectiveMinutes).toBe(0);
  });

  it("pauses the focus timer during breaks", () => {
    const m = computeWorkValidation(
      {
        loginAt: at(0),
        logoutAt: at(540),
        breaks: [period(60, 120)],
        idlePeriods: [],
        focusPeriods: [period(0, 180)],
      },
      at(540),
    );
    expect(m.focusMinutes).toBe(120);
  });
});

// ---- Randomized fuzz: the invariant must hold for ANY input. ---------------
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("validateWorkDay — randomized interval fuzz", () => {
  it("preserves session = effective + idle + break across 500 random days", () => {
    const rand = mulberry32(0x4a1c);
    const randomPeriods = (count: number, bound: number): TimePeriod[] =>
      Array.from({ length: count }, () => {
        const a = Math.floor(rand() * bound);
        const b = Math.floor(rand() * bound);
        const start = Math.min(a, b);
        const end = Math.max(a, b);
        const open = rand() < 0.1;
        return { startAt: start, endAt: open ? null : end };
      });

    for (let i = 0; i < 500; i += 1) {
      const bound = at(600);
      const clockIn = Math.floor(rand() * at(120));
      const open = rand() < 0.15;
      const clockOut = open ? null : clockIn + Math.floor(rand() * at(600));
      const now = clockIn + at(600) + Math.floor(rand() * at(60));

      const input: WorkValidationInput = {
        segments: [{ clockIn, clockOut }],
        breaks: randomPeriods(Math.floor(rand() * 4), bound),
        idlePeriods: randomPeriods(Math.floor(rand() * 4), bound),
        focusPeriods: randomPeriods(Math.floor(rand() * 4), bound),
        config: rand() < 0.5 ? { minIdleBlockMs: at(Math.floor(rand() * 5)) } : undefined,
      };

      const r = validateWorkDay(input, now);
      assertInvariants(r);
    }
  });

  it("preserves the invariant with multiple random clock segments", () => {
    const rand = mulberry32(0x99f3);
    for (let i = 0; i < 200; i += 1) {
      const segments = Array.from({ length: 1 + Math.floor(rand() * 3) }, () => {
        const clockIn = Math.floor(rand() * at(400));
        const clockOut = clockIn + Math.floor(rand() * at(200));
        return { clockIn, clockOut };
      });
      const r = validateWorkDay(
        {
          segments,
          breaks: [{ startAt: Math.floor(rand() * at(400)), endAt: Math.floor(rand() * at(400)) }],
          idlePeriods: [{ startAt: Math.floor(rand() * at(400)), endAt: Math.floor(rand() * at(400)) }],
          focusPeriods: [],
        },
        at(700),
      );
      assertInvariants(r);
    }
  });
});
