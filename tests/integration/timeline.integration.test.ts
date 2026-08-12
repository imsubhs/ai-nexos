import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, asc, desc, eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { projectPhases, timelineVersions, timelines } from "@/db/schema";
import { assertDatabaseReachable } from "./helpers/database";

/**
 * The /timeline route's read paths, executed against the real schema with real
 * rows — the step that would have caught this before it shipped.
 *
 * The route failed for every viewer because the timeline tables carried no
 * drizzle `relations()` declarations, so `db.query.timelines.findMany({ with:
 * { phases } })` threw while assembling SQL. It typechecked, it built, and the
 * unit suite passed, exactly as the calendar milestone-binding defect did the
 * day before: the pure code was tested and the queries were not.
 *
 * A synthetic tenant is created here and dropped afterwards. No pre-existing
 * row is read, written, or relied upon.
 */
describe("timeline read paths (live schema)", () => {
  const sql = postgres(
    process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? "",
    { max: 2, prepare: false, connect_timeout: 15, onnotice: () => {} },
  );
  const db = drizzle(sql, { schema, casing: "snake_case" });

  const orgId = randomUUID();
  const emptyOrgId = randomUUID();
  const projectId = randomUUID();
  const timelineId = randomUUID();
  const planningPhaseId = randomUUID();
  const deliveryPhaseId = randomUUID();
  const firstMilestoneId = randomUUID();
  const secondMilestoneId = randomUUID();
  const taskId = randomUUID();

  beforeAll(async () => {
    await assertDatabaseReachable();

    await sql`
      insert into organizations (organization_id, organization_name, slug, timezone)
      values (${orgId}, 'Timeline Tenant', ${`tl-${orgId.slice(0, 8)}`}, 'Asia/Kolkata'),
             (${emptyOrgId}, 'Empty Tenant', ${`tl-empty-${emptyOrgId.slice(0, 8)}`}, 'UTC')
    `;
    await sql`
      insert into projects (project_id, organization_id, project_name, project_code)
      values (${projectId}, ${orgId}, 'Launch Film', 'TL-001')
    `;
    await sql`
      insert into timelines (timeline_id, organization_id, project_id, status,
                             overall_progress, start_date, end_date)
      values (${timelineId}, ${orgId}, ${projectId}, 'in_progress', 40,
              '2026-08-01T00:00:00Z', '2026-09-30T00:00:00Z')
    `;
    await sql`
      insert into project_phases (phase_id, timeline_id, organization_id, name, order_index)
      values (${deliveryPhaseId}, ${timelineId}, ${orgId}, 'delivery', 5),
             (${planningPhaseId}, ${timelineId}, ${orgId}, 'planning', 1)
    `;
    await sql`
      insert into milestones (milestone_id, phase_id, timeline_id, organization_id,
                              name, status, progress, start_date, end_date)
      values (${firstMilestoneId}, ${planningPhaseId}, ${timelineId}, ${orgId},
              'Script locked', 'completed', 100,
              '2026-08-02T00:00:00Z', '2026-08-09T00:00:00Z'),
             (${secondMilestoneId}, ${deliveryPhaseId}, ${timelineId}, ${orgId},
              'Final delivery', 'not_started', 0,
              '2026-09-20T00:00:00Z', '2026-09-30T00:00:00Z')
    `;
    await sql`
      insert into timeline_dependencies (dependency_id, timeline_id, organization_id,
                                         predecessor_id, successor_id, dependency_type)
      values (${randomUUID()}, ${timelineId}, ${orgId},
              ${firstMilestoneId}, ${secondMilestoneId}, 'FS')
    `;
    await sql`
      insert into tasks (task_id, organization_id, project_id, timeline_id, phase_id,
                         milestone_id, task_code, name, due_date)
      values (${taskId}, ${orgId}, ${projectId}, ${timelineId}, ${planningPhaseId},
              ${firstMilestoneId}, ${`TL-T-${taskId.slice(0, 8)}`},
              'Draft the treatment', '2026-08-05T00:00:00Z')
    `;
    await sql`
      insert into timeline_versions (version_id, timeline_id, organization_id,
                                     version_number, change_summary, snapshot_data)
      values (${randomUUID()}, ${timelineId}, ${orgId}, 1, 'Created', '{}'::jsonb)
    `;
  });

  afterAll(async () => {
    // Everything below the organization cascades from it.
    await sql`delete from organizations where organization_id in (${orgId}, ${emptyOrgId})`;
    await sql.end();
  });

  it("getTimelines() returns each timeline with its ordered phases", async () => {
    const rows = await db.query.timelines.findMany({
      where: eq(timelines.organizationId, orgId),
      orderBy: [desc(timelines.updatedAt)],
      offset: 0,
      limit: 25,
      with: { phases: { orderBy: [asc(projectPhases.orderIndex)] } },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].timelineId).toBe(timelineId);
    expect(rows[0].overallProgress).toBe(40);
    // Ordered by order_index, so planning (1) precedes delivery (5) even
    // though delivery was inserted first.
    expect(rows[0].phases.map((p) => p.name)).toEqual(["planning", "delivery"]);
  });

  it("returns an empty feed for an organization with no timelines", async () => {
    // The production organization is in exactly this state, and the page threw
    // for it too — the failure was in building the query, not in reading rows.
    const rows = await db.query.timelines.findMany({
      where: eq(timelines.organizationId, emptyOrgId),
      orderBy: [desc(timelines.updatedAt)],
      offset: 0,
      limit: 25,
      with: { phases: { orderBy: [asc(projectPhases.orderIndex)] } },
    });

    expect(rows).toEqual([]);
  });

  it("never reaches another organization's timelines", async () => {
    const rows = await db.query.timelines.findMany({
      where: eq(timelines.organizationId, emptyOrgId),
      with: { phases: true },
    });
    expect(rows.map((r) => r.timelineId)).not.toContain(timelineId);
  });

  it("getProjectTimeline() returns phases and recent versions together", async () => {
    const row = await db.query.timelines.findFirst({
      where: and(
        eq(timelines.projectId, projectId),
        eq(timelines.organizationId, orgId),
      ),
      with: {
        phases: { orderBy: [asc(projectPhases.orderIndex)] },
        versions: { orderBy: [desc(timelineVersions.versionNumber)], limit: 5 },
      },
    });

    expect(row?.phases).toHaveLength(2);
    expect(row?.versions).toHaveLength(1);
    expect(row?.versions[0].versionNumber).toBe(1);
  });

  it("createTimelineSnapshot() resolves phases → milestones → successors", async () => {
    const row = await db.query.timelines.findFirst({
      where: eq(timelines.timelineId, timelineId),
      with: {
        phases: { with: { milestones: { with: { successors: true } } } },
      },
    });

    const planning = row?.phases.find((p) => p.name === "planning");
    const delivery = row?.phases.find((p) => p.name === "delivery");
    expect(planning?.milestones.map((m) => m.name)).toEqual(["Script locked"]);
    // The dependency hangs off the PREDECESSOR: "Script locked" precedes
    // "Final delivery", so the edge belongs to planning's milestone.
    expect(planning?.milestones[0].successors).toHaveLength(1);
    expect(planning?.milestones[0].successors[0].successorId).toBe(
      secondMilestoneId,
    );
    expect(delivery?.milestones[0].successors).toHaveLength(0);
  });

  it("reads a timeline's milestones and its tasks side by side", async () => {
    // A mixed timeline: milestones on two phases, and a task hanging off one
    // of those milestones. Both are read through the same timeline row.
    const milestones = await db.query.milestones.findMany({
      where: eq(schema.milestones.timelineId, timelineId),
      orderBy: [asc(schema.milestones.startDate)],
    });
    const tasks = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.timelineId, timelineId));

    expect(milestones.map((m) => m.name)).toEqual([
      "Script locked",
      "Final delivery",
    ]);
    expect(milestones[0].startDate).toBeInstanceOf(Date);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].milestoneId).toBe(firstMilestoneId);
    expect(tasks[0].name).toBe("Draft the treatment");
  });

  it("resolves a dependency's two milestone ends distinctly", async () => {
    const edges = await db.query.timelineDependencies.findMany({
      where: eq(schema.timelineDependencies.timelineId, timelineId),
      with: { predecessor: true, successor: true },
    });

    expect(edges).toHaveLength(1);
    expect(edges[0].predecessor.name).toBe("Script locked");
    expect(edges[0].successor.name).toBe("Final delivery");
  });
});
