/**
 * Sprint 11B — public read layer for Deliverables. Exercises the DEMO_MODE
 * implementation directly since it is the only path exercisable without a
 * live database; asserts pagination, filtering, and search stay deterministic
 * against the seeded DemoStore rows (see src/lib/demo/store.ts).
 */
import { describe, expect, it } from "vitest";
import {
  getDeliverables,
  getDeliverableById,
  searchDeliverables,
} from "./mock-actions";

describe("getDeliverables (mock)", () => {
  it("returns seeded deliverables ordered newest-first", async () => {
    const result = await getDeliverables();
    expect(result.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
        result[i].createdAt.getTime(),
      );
    }
  });

  it("filters by status", async () => {
    const approved = await getDeliverables({ status: "approved" });
    expect(approved.length).toBeGreaterThan(0);
    expect(approved.every((d: any) => d.status === "approved")).toBe(true);
  });

  it("paginates via cursorOffset/limit", async () => {
    const all = await getDeliverables();
    const firstPage = await getDeliverables({}, 0, 1);
    const secondPage = await getDeliverables({}, 1, 1);
    expect(firstPage).toHaveLength(1);
    expect(firstPage[0].deliverableId).toBe(all[0].deliverableId);
    if (all.length > 1) {
      expect(secondPage[0].deliverableId).toBe(all[1].deliverableId);
    }
  });
});

describe("getDeliverableById (mock)", () => {
  it("returns undefined for an unknown id", async () => {
    const result = await getDeliverableById(
      "00000000-0000-4000-8000-000000009999",
    );
    expect(result).toBeUndefined();
  });

  it("returns the deliverable with its revisions when found", async () => {
    const [existing] = await getDeliverables();
    const result: any = await getDeliverableById(existing.deliverableId);
    expect(result).toBeDefined();
    expect(result.deliverableId).toBe(existing.deliverableId);
    expect(Array.isArray(result.revisions)).toBe(true);
  });
});

describe("searchDeliverables (mock)", () => {
  it("matches by case-insensitive title substring", async () => {
    const result = await searchDeliverables("brand");
    expect(result.length).toBeGreaterThan(0);
    expect(
      result.every((d: any) => d.title.toLowerCase().includes("brand")),
    ).toBe(true);
  });

  it("returns an empty array when nothing matches", async () => {
    const result = await searchDeliverables("no-such-deliverable-xyz");
    expect(result).toEqual([]);
  });
});
