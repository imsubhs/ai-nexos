import { describe, expect, it } from "vitest";
import {
  CORRECTION_SEQUENCE_ENTITY,
  formatCorrectionCode,
} from "./correction-code";

/**
 * The defect this guards: the real repository inserted a literal "COR-PENDING"
 * for every correction, against a UNIQUE (organization_id, correction_code)
 * index. Request one succeeded; request two failed with 23505. The uniqueness
 * that matters therefore comes from the sequence value being distinct, so what
 * is asserted here is that distinct sequence values never format to the same
 * code — including past the four-digit pad, where truncation would reintroduce
 * exactly the original collision.
 */
describe("formatCorrectionCode", () => {
  it("formats the COR-#### shape, zero-padded to four digits", () => {
    expect(formatCorrectionCode(1)).toBe("COR-0001");
    expect(formatCorrectionCode(42)).toBe("COR-0042");
    expect(formatCorrectionCode(9999)).toBe("COR-9999");
  });

  it("never emits COR-PENDING", () => {
    for (let n = 1; n <= 500; n += 1) {
      expect(formatCorrectionCode(n)).not.toBe("COR-PENDING");
    }
  });

  it("widens rather than truncating past 9999, so codes stay unique", () => {
    expect(formatCorrectionCode(10_000)).toBe("COR-10000");
    expect(formatCorrectionCode(10_000)).not.toBe(formatCorrectionCode(1));
  });

  it("is injective over a run of sequence values", () => {
    const codes = new Set<string>();
    for (let n = 1; n <= 20_000; n += 1) codes.add(formatCorrectionCode(n));
    expect(codes.size).toBe(20_000);
  });

  it("rejects values a sequence can never legitimately produce", () => {
    expect(() => formatCorrectionCode(0)).toThrow(RangeError);
    expect(() => formatCorrectionCode(-1)).toThrow(RangeError);
    expect(() => formatCorrectionCode(1.5)).toThrow(RangeError);
  });

  it("names the organization_sequences entity type the repository reserves", () => {
    // A drifting entity type would silently share a counter with another module.
    expect(CORRECTION_SEQUENCE_ENTITY).toBe("correction_code");
  });
});
