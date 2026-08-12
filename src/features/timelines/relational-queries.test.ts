/**
 * Regression guard for the /timeline route's runtime failure.
 *
 * `getTimelines`, `getProjectTimeline` and `createTimelineSnapshot` all read
 * through drizzle's relational query builder (`db.query.timelines.…` with a
 * `with` clause). That builder resolves each `with` key against the schema's
 * `relations()` declarations, and the timeline tables had none — so every one
 * of those calls threw `Cannot read properties of undefined (reading
 * 'referencedTable')` while the SQL was being assembled, before a single row
 * was read. The page rendered its error boundary for every viewer, with data
 * and without.
 *
 * Nothing in the old suite caught it: the pure projections are tested and the
 * queries were not, the typed `with` key was unchecked while the relation map
 * was empty, and `next build` never executes a query. These tests execute the
 * exact query shapes the three read paths use, against a driver that returns no
 * rows and opens no socket — so a relation that is removed, renamed, or never
 * declared fails here rather than in production.
 */
import { describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/pg-proxy";
import { asc, desc, eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { projectPhases, timelineVersions, timelines } from "@/db/schema";

/**
 * Same schema and casing as `src/db/index.ts`, over a driver that answers every
 * statement with zero rows. The relational builder does all of its work before
 * the driver is called, which is exactly the work that was failing.
 */
const db = drizzle(async () => ({ rows: [] }), {
  schema,
  casing: "snake_case",
});

const ORG = "00000000-0000-4000-8000-0000000000a1";

describe("timeline relational queries", () => {
  it("builds getTimelines() — timelines with their ordered phases", async () => {
    const rows = await db.query.timelines.findMany({
      where: eq(timelines.organizationId, ORG),
      orderBy: [desc(timelines.updatedAt)],
      offset: 0,
      limit: 25,
      with: { phases: { orderBy: [asc(projectPhases.orderIndex)] } },
    });

    expect(rows).toEqual([]);
  });

  it("builds getProjectTimeline() — phases plus recent versions", async () => {
    const row = await db.query.timelines.findFirst({
      where: eq(timelines.organizationId, ORG),
      with: {
        phases: { orderBy: [asc(projectPhases.orderIndex)] },
        versions: {
          orderBy: [desc(timelineVersions.versionNumber)],
          limit: 5,
        },
      },
    });

    expect(row).toBeUndefined();
  });

  it("builds createTimelineSnapshot() — phases → milestones → successors", async () => {
    const row = await db.query.timelines.findFirst({
      where: eq(timelines.timelineId, ORG),
      with: {
        phases: { with: { milestones: { with: { successors: true } } } },
      },
    });

    expect(row).toBeUndefined();
  });

  it("keeps the two milestone↔dependency edges distinguishable", async () => {
    // Both directions resolve only because each carries its own relationName;
    // drizzle cannot infer which of the two foreign keys an embed means.
    const rows = await db.query.milestones.findMany({
      with: { predecessors: true, successors: true },
    });

    expect(rows).toEqual([]);
  });

  it("emits SQL that joins phases to their timeline", () => {
    const { sql } = db.query.timelines
      .findMany({
        where: eq(timelines.organizationId, ORG),
        with: { phases: true },
      })
      .toSQL();

    expect(sql).toContain("project_phases");
    expect(sql).toContain("timeline_id");
  });
});
