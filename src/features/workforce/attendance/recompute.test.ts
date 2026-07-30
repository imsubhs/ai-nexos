/**
 * Sprint 4B — attendance ⇄ engine integration (clock-service recompute path).
 * Asserts every attendance calculation flows through the frozen engine and
 * that the canonical invariant survives the AttendanceMetrics projection.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_WORKFORCE_POLICY } from "../shared/types";
import {
  finalizeMetrics,
  recomputeDay,
  runValidation,
  toAttendanceMetrics,
} from "./clock-service";

const policy = DEFAULT_WORKFORCE_POLICY;

function iso(h: number, m = 0): string {
  return `2026-07-10T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00.000Z`;
}

describe("runValidation → engine", () => {
  it("partitions the session exactly (session = effective + idle + break)", () => {
    const result = runValidation({
      clockInIso: iso(9),
      clockOutIso: iso(17),
      breaks: [
        {
          startAt: new Date(iso(12)).getTime(),
          endAt: new Date(iso(13)).getTime(),
        },
      ],
      policy,
    });
    expect(result.sessionMinutes).toBe(
      result.effectiveMinutes + result.idleMinutes + result.breakMinutes,
    );
    expect(result.sessionMinutes).toBe(480);
    expect(result.breakMinutes).toBe(60);
    expect(result.effectiveMinutes).toBe(420);
    expect(result.idleMinutes).toBe(0); // no tracker yet (policy 10.9)
  });
});

describe("toAttendanceMetrics", () => {
  it("projects engine output and derives overtime as a policy step", () => {
    const result = runValidation({
      clockInIso: iso(8),
      clockOutIso: iso(19), // 11h session, no breaks → 660 effective
      breaks: [],
      policy,
    });
    const metrics = toAttendanceMetrics(result, policy);
    expect(metrics.workingMinutes).toBe(result.sessionMinutes);
    expect(metrics.effectiveMinutes).toBe(result.effectiveMinutes);
    // 660 effective − 480 standard = 180 > 30 threshold → overtime = 180.
    expect(metrics.overtimeMinutes).toBe(180);
  });

  it("emits no overtime under the threshold", () => {
    const result = runValidation({
      clockInIso: iso(9),
      clockOutIso: iso(17),
      breaks: [],
      policy,
    });
    expect(toAttendanceMetrics(result, policy).overtimeMinutes).toBe(0);
  });

  it("finalizeMetrics equals toAttendanceMetrics(runValidation) — one path", () => {
    const input = {
      clockInIso: iso(9),
      clockOutIso: iso(17),
      breaks: [],
      policy,
    };
    expect(finalizeMetrics(input)).toEqual(
      toAttendanceMetrics(runValidation(input), policy),
    );
  });
});

describe("recomputeDay", () => {
  it("returns metrics + status + validation from a single engine pass", () => {
    const out = recomputeDay({
      clockInIso: iso(9, 30),
      clockOutIso: iso(17),
      breaks: [],
      policy,
      isLate: true,
      wfh: false,
    });
    expect(out.status).toBe("LATE"); // isLate wins
    expect(out.metrics.workingMinutes).toBe(out.validation.sessionMinutes);
    expect(out.validation.sessionMinutes).toBe(
      out.validation.effectiveMinutes +
        out.validation.idleMinutes +
        out.validation.breakMinutes,
    );
  });

  it("derives HALF_DAY for a short session", () => {
    const out = recomputeDay({
      clockInIso: iso(9),
      clockOutIso: iso(12), // 3h < 4h half-day threshold
      breaks: [],
      policy,
      isLate: false,
      wfh: false,
    });
    expect(out.status).toBe("HALF_DAY");
  });
});
