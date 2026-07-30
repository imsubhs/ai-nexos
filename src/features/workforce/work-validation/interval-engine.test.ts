import { describe, expect, it } from "vitest";
import { IntervalEngine } from "./interval-engine";
import type { Interval } from "./value-objects";

const iv = (start: number, end: number): Interval => ({ start, end });

describe("IntervalEngine.normalize", () => {
  it("drops zero/negative-length intervals and sorts by start", () => {
    const out = IntervalEngine.normalize([iv(10, 5), iv(3, 3), iv(8, 12), iv(1, 4)]);
    expect(out).toEqual([iv(1, 4), iv(8, 12)]);
  });
});

describe("IntervalEngine.merge", () => {
  it("collapses overlapping and touching intervals", () => {
    const out = IntervalEngine.merge([iv(0, 5), iv(5, 8), iv(4, 6), iv(20, 25)]);
    expect(out).toEqual([iv(0, 8), iv(20, 25)]);
  });

  it("joins intervals within the configured gap", () => {
    expect(IntervalEngine.merge([iv(0, 5), iv(7, 10)], 2)).toEqual([iv(0, 10)]);
    expect(IntervalEngine.merge([iv(0, 5), iv(8, 10)], 2)).toEqual([iv(0, 5), iv(8, 10)]);
  });

  it("is idempotent (merging a merged set changes nothing)", () => {
    const once = IntervalEngine.merge([iv(0, 5), iv(3, 9), iv(11, 12)]);
    expect(IntervalEngine.merge(once)).toEqual(once);
  });
});

describe("IntervalEngine.intersect", () => {
  it("returns spans covered by both sets", () => {
    const out = IntervalEngine.intersect([iv(0, 10), iv(20, 30)], [iv(5, 25)]);
    expect(out).toEqual([iv(5, 10), iv(20, 25)]);
  });

  it("returns empty when there is no overlap", () => {
    expect(IntervalEngine.intersect([iv(0, 5)], [iv(10, 15)])).toEqual([]);
  });
});

describe("IntervalEngine.subtract", () => {
  it("removes holes from the base", () => {
    const out = IntervalEngine.subtract([iv(0, 100)], [iv(10, 20), iv(50, 60)]);
    expect(out).toEqual([iv(0, 10), iv(20, 50), iv(60, 100)]);
  });

  it("handles holes that fully cover the base", () => {
    expect(IntervalEngine.subtract([iv(0, 10)], [iv(0, 10)])).toEqual([]);
  });

  it("is unaffected by holes outside the base", () => {
    expect(IntervalEngine.subtract([iv(0, 10)], [iv(20, 30)])).toEqual([iv(0, 10)]);
  });
});

describe("IntervalEngine.split", () => {
  it("cuts intervals at interior instants and preserves total duration", () => {
    const out = IntervalEngine.split([iv(0, 10)], [3, 7, 20]);
    expect(out).toEqual([iv(0, 3), iv(3, 7), iv(7, 10)]);
    expect(IntervalEngine.totalDuration(out)).toBe(10);
  });
});

describe("IntervalEngine.totalDuration", () => {
  it("counts overlapping time once", () => {
    expect(IntervalEngine.totalDuration([iv(0, 10), iv(5, 15)])).toBe(15);
  });
});

describe("IntervalEngine.findOverlaps / isDisjointSorted", () => {
  it("detects overlapping pairs", () => {
    expect(IntervalEngine.findOverlaps([iv(0, 5), iv(3, 8)])).toHaveLength(1);
    expect(IntervalEngine.findOverlaps([iv(0, 5), iv(5, 8)])).toHaveLength(0);
  });

  it("recognizes canonical merged form", () => {
    expect(IntervalEngine.isDisjointSorted([iv(0, 5), iv(6, 8)])).toBe(true);
    expect(IntervalEngine.isDisjointSorted([iv(0, 5), iv(4, 8)])).toBe(false);
  });
});
