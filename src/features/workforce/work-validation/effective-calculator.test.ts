import { describe, expect, it } from "vitest";
import {
  calculateEffective,
  verifyInvariant,
  verifyMinuteInvariant,
} from "./effective-calculator";
import { InvariantViolationError } from "./errors";
import type { Interval } from "./value-objects";

const MIN = 60_000;
const at = (m: number) => m * MIN;
const iv = (s: number, e: number): Interval => ({ start: at(s), end: at(e) });

describe("calculateEffective", () => {
  it("carves break and idle out of the session", () => {
    const r = calculateEffective([iv(0, 540)], [iv(180, 240)], [iv(300, 330)]);
    expect(r.effectiveMs).toBe(at(450)); // 540 − 60 − 30
  });

  it("returns the whole session when there is no break or idle", () => {
    const r = calculateEffective([iv(0, 480)], [], []);
    expect(r.effectiveMs).toBe(at(480));
  });
});

describe("verifyInvariant", () => {
  it("accepts a valid partition", () => {
    expect(() => verifyInvariant(at(540), at(450), at(30), at(60))).not.toThrow();
  });

  it("throws when the parts do not sum to the session", () => {
    expect(() => verifyInvariant(at(540), at(450), at(30), at(59))).toThrow(InvariantViolationError);
  });
});

describe("verifyMinuteInvariant", () => {
  it("throws on a broken minute partition", () => {
    expect(() => verifyMinuteInvariant(540, 450, 30, 61)).toThrow(InvariantViolationError);
  });
});
