/**
 * Sprint 11B — public read layer for Meetings. getMeetings() is new (global,
 * cross-project) and reads the DemoStore directly, unlike its sibling
 * project-scoped queries in this file which are pre-existing stubs left
 * untouched per the sprint's "do not modify existing reads" rule.
 */
import { describe, expect, it } from "vitest";
import { getMeetings } from "./mock-queries";

describe("getMeetings (mock)", () => {
  it("returns seeded meetings across all projects", async () => {
    const result = await getMeetings();
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("orders by startTime descending", async () => {
    const result = await getMeetings();
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].startTime!.getTime()).toBeGreaterThanOrEqual(
        result[i].startTime!.getTime(),
      );
    }
  });

  it("paginates via cursorOffset/limit", async () => {
    const all = await getMeetings();
    const firstPage = await getMeetings(0, 1);
    expect(firstPage).toHaveLength(Math.min(1, all.length));
    if (all.length > 0) {
      expect(firstPage[0].meetingId).toBe(all[0].meetingId);
    }
  });
});
