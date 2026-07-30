/**
 * Sprint 11B — public read layer for Timelines. getTimelines() is new
 * (global, cross-project); getProjectTimeline/getTimelineMilestones/
 * getTimelineDependencies are pre-existing and untouched.
 */
import { describe, expect, it } from "vitest";
import { getTimelines } from "./mock-actions";

describe("getTimelines (mock)", () => {
  it("returns the seeded project timeline with its ordered phases", async () => {
    const result = await getTimelines();
    expect(result.length).toBeGreaterThanOrEqual(1);
    const seeded: any = result.find((t: any) => t.timelineId === "00000000-0000-4000-8000-000000000301");
    expect(seeded).toBeDefined();
    expect(Array.isArray(seeded.phases)).toBe(true);
    for (let i = 1; i < seeded.phases.length; i++) {
      expect(seeded.phases[i - 1].orderIndex).toBeLessThanOrEqual(seeded.phases[i].orderIndex);
    }
  });

  it("paginates via cursorOffset/limit", async () => {
    const all = await getTimelines();
    const firstPage = await getTimelines(0, 1);
    expect(firstPage).toHaveLength(Math.min(1, all.length));
    if (all.length > 0) {
      expect(firstPage[0].timelineId).toBe(all[0].timelineId);
    }
  });
});
