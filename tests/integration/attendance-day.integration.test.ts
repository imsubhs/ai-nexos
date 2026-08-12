import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import {
  db,
  asRole,
  assertDatabaseReachable,
  closeDatabase,
} from "./helpers/database";
import { createServiceClient } from "@/lib/supabase/service";
import { currentBusinessDay } from "@/features/workforce/shared/business-day";

/**
 * The attendance business day against the live schema.
 *
 * Two things can only be proved here rather than in the unit suite: that a
 * DayDate resolved in the organization's timezone survives the round trip
 * through a Postgres `date` column unshifted, and that "one session per
 * attendance day" is a database invariant and not only a rule the application
 * chooses to enforce. The second matters because the day boundary moved: if
 * the derivation ever regressed to UTC for writes while reads used the policy
 * zone, the unique index is what would stop two rows existing for one day.
 *
 * A synthetic tenant is created and removed. The production organization's
 * rows are never read or written.
 */
describe("attendance business day (live schema)", () => {
  const admin = createServiceClient();
  const orgId = randomUUID();
  const otherOrgId = randomUUID();
  const roleId = randomUUID();
  const otherRoleId = randomUUID();
  let userId = "";
  let otherUserId = "";
  const authUserIds: string[] = [];

  /** 00:46:52 IST on 13 Aug 2026 — 19:16 UTC on the 12th. */
  const WALKTHROUGH = new Date("2026-08-12T19:16:52.252Z");

  beforeAll(async () => {
    await assertDatabaseReachable();

    for (const label of ["own", "other"]) {
      const { data, error } = await admin.auth.admin.createUser({
        email: `att-${label}-${randomUUID()}@integration.test`,
        password: randomUUID(),
        email_confirm: true,
      });
      if (error || !data.user) {
        throw new Error(`Could not create auth user: ${error?.message}`);
      }
      authUserIds.push(data.user.id);
    }
    [userId, otherUserId] = authUserIds;

    const sql = db();
    await sql`
      insert into organizations (organization_id, organization_name, slug, timezone)
      values (${orgId}, 'IST Tenant', ${`ist-${orgId.slice(0, 8)}`}, 'Asia/Kolkata'),
             (${otherOrgId}, 'Other Tenant', ${`oth-${otherOrgId.slice(0, 8)}`}, 'UTC')
    `;
    await sql`
      insert into roles (role_id, organization_id, role_name, role_key, permissions)
      values (${roleId}, ${orgId}, 'Owner', 'owner', ${sql.json({ "*": ["*"] })}),
             (${otherRoleId}, ${otherOrgId}, 'Owner', 'owner', ${sql.json({ "*": ["*"] })})
    `;
    await sql`
      insert into users (user_id, organization_id, role_id, first_name, email, status)
      values (${userId}, ${orgId}, ${roleId}, 'Ada',
              ${`att-own-${userId}@integration.test`}, 'active'),
             (${otherUserId}, ${otherOrgId}, ${otherRoleId}, 'Grace',
              ${`att-other-${otherUserId}@integration.test`}, 'active')
    `;
  });

  afterAll(async () => {
    const sql = db();
    // attendance_records.user_id is ON DELETE RESTRICT, so rows go first.
    await sql`delete from attendance_breaks where organization_id in (${orgId}, ${otherOrgId})`;
    await sql`delete from attendance_records where organization_id in (${orgId}, ${otherOrgId})`;
    await sql`delete from users where organization_id in (${orgId}, ${otherOrgId})`;
    await sql`delete from roles where organization_id in (${orgId}, ${otherOrgId})`;
    await sql`delete from organizations where organization_id in (${orgId}, ${otherOrgId})`;
    for (const id of authUserIds) {
      await admin.auth.admin.deleteUser(id);
    }
    await closeDatabase();
  });

  it("stores the organization's day, not the server's, and reads it back intact", async () => {
    const sql = db();
    const date = currentBusinessDay("Asia/Kolkata", WALKTHROUGH);
    expect(date).toBe("2026-08-13");

    const attendanceId = randomUUID();
    await sql`
      insert into attendance_records
        (attendance_id, organization_id, user_id, date, clock_in_at, status)
      values (${attendanceId}, ${orgId}, ${userId}, ${date},
              ${WALKTHROUGH.toISOString()}, 'WORKING')
    `;

    // The `date` column is a plain calendar date: it must come back as the
    // exact string that was written, with no session-timezone shift applied by
    // the driver on either leg.
    const [row] = await sql`
      select to_char(date, 'YYYY-MM-DD') as date, clock_in_at
      from attendance_records where attendance_id = ${attendanceId}
    `;
    expect(row.date).toBe("2026-08-13");
    expect(new Date(row.clock_in_at).toISOString()).toBe(
      "2026-08-12T19:16:52.252Z",
    );
  });

  it("finds that day by the same derivation the write used", async () => {
    const sql = db();
    const rows = await sql`
      select attendance_id from attendance_records
      where organization_id = ${orgId} and user_id = ${userId}
        and date = ${currentBusinessDay("Asia/Kolkata", WALKTHROUGH)}
    `;
    expect(rows).toHaveLength(1);
  });

  it("refuses a second row for the same (organization, user, day)", async () => {
    const sql = db();
    const date = currentBusinessDay("Asia/Kolkata", WALKTHROUGH);

    // uq_attendance_org_user_date. One session per attendance day is enforced
    // by the database as well as by the state machine — moving the day
    // boundary must not turn into two rows for one day.
    await expect(
      sql`
        insert into attendance_records
          (attendance_id, organization_id, user_id, date, clock_in_at, status)
        values (${randomUUID()}, ${orgId}, ${userId}, ${date},
                ${WALKTHROUGH.toISOString()}, 'WORKING')
      `,
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("accepts the next business day as a separate row", async () => {
    const sql = db();
    // 00:46 IST on the 14th — a new day on the organization's clock.
    const next = currentBusinessDay(
      "Asia/Kolkata",
      new Date("2026-08-13T19:16:52.252Z"),
    );
    expect(next).toBe("2026-08-14");

    const inserted = await sql`
      insert into attendance_records
        (attendance_id, organization_id, user_id, date, clock_in_at, clock_out_at,
         status, working_minutes, effective_minutes)
      values (${randomUUID()}, ${orgId}, ${userId}, ${next},
              '2026-08-13T19:16:52.252Z', '2026-08-14T03:16:52.252Z',
              'PRESENT', 480, 480)
      returning attendance_id
    `;
    expect(inserted).toHaveLength(1);
  });

  it("keeps the tenant's attendance rows invisible to another tenant under RLS", async () => {
    // The application's Drizzle connection is the table owner and bypasses
    // RLS, which is why this asserts through a connection carrying the other
    // tenant's JWT claims — the posture migration 0014 established.
    const visible = await asRole(
      "authenticated",
      { sub: otherUserId, organizationId: otherOrgId },
      (tx) =>
        tx`select attendance_id from attendance_records where organization_id = ${orgId}`,
    );
    expect(visible).toHaveLength(0);
  });

  it("shows a tenant its own attendance rows under RLS", async () => {
    const visible = await asRole(
      "authenticated",
      { sub: userId, organizationId: orgId },
      (tx) =>
        tx`select attendance_id from attendance_records where organization_id = ${orgId}`,
    );
    expect(visible.length).toBeGreaterThan(0);
  });
});
