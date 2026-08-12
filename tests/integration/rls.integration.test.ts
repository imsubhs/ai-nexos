import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import {
  db,
  asRole,
  assertDatabaseReachable,
  closeDatabase,
} from "./helpers/database";
import { readMigrationFiles } from "./helpers/snapshot";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Proves Row Level Security actually enforces tenancy — it does not read the
 * policy SQL and assume it works. Two organisations are created, then queried
 * through connections carrying each tenant's JWT claims under the same
 * `authenticated` role PostgREST uses in production.
 *
 * The application's own Drizzle connection runs as the table owner and
 * therefore bypasses RLS; that is exactly why these assertions exist at the
 * database level.
 */

/** Tables the migrations turn RLS on for, parsed from the migration SQL. */
function tablesWithRlsDeclared(): string[] {
  const names = new Set<string>();
  for (const file of readMigrationFiles()) {
    const sql = readFileSync(
      join(process.cwd(), "database", "migrations", file),
      "utf8",
    );
    for (const match of sql.matchAll(
      /ALTER TABLE\s+"?([a-z_0-9.]+)"?\s+ENABLE ROW LEVEL SECURITY/gi,
    )) {
      names.add(match[1].replace(/^public\./, ""));
    }
  }
  return [...names];
}

describe("Row Level Security (live)", () => {
  const admin = createServiceClient();

  const orgA = randomUUID();
  const orgB = randomUUID();
  const roleA = randomUUID();
  const roleB = randomUUID();
  let userA = "";
  let userB = "";
  const authUserIds: string[] = [];

  // Workforce fixtures (migration 0014). A fixed past date keeps the rows
  // recognisable and outside any real reporting window.
  const DAY = "2020-01-15";
  const attendanceA = randomUUID();
  const attendanceB = randomUUID();
  const breakA = randomUUID();
  const breakB = randomUUID();
  const correctionA = randomUUID();
  const correctionB = randomUUID();

  beforeAll(async () => {
    await assertDatabaseReachable();

    // users.user_id is foreign-keyed to auth.users, so the tenants need real
    // Supabase Auth identities rather than invented UUIDs.
    for (const label of ["a", "b"]) {
      const email = `rls-${label}-${randomUUID()}@integration.test`;
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: randomUUID(),
        email_confirm: true,
      });
      if (error || !data.user) {
        throw new Error(`Could not create auth user: ${error?.message}`);
      }
      authUserIds.push(data.user.id);
    }
    [userA, userB] = authUserIds;

    const sql = db();
    await sql`
      insert into organizations (organization_id, organization_name, slug)
      values (${orgA}, 'Tenant A', ${`tenant-a-${orgA.slice(0, 8)}`}),
             (${orgB}, 'Tenant B', ${`tenant-b-${orgB.slice(0, 8)}`})
    `;
    await sql`
      insert into roles (role_id, organization_id, role_name, role_key, permissions)
      values (${roleA}, ${orgA}, 'Admin', 'admin', ${sql.json({ "*": ["*"] })}),
             (${roleB}, ${orgB}, 'Viewer', 'viewer', ${sql.json({ projects: ["read"] })})
    `;
    await sql`
      insert into users (user_id, organization_id, role_id, first_name, email, status)
      values (${userA}, ${orgA}, ${roleA}, 'Ada', ${`a-${userA}@integration.test`}, 'active'),
             (${userB}, ${orgB}, ${roleB}, 'Grace', ${`b-${userB}@integration.test`}, 'active')
    `;

    // Workforce rows for both tenants. Migration 0014 turned RLS on for these
    // three tables and granted SELECT; with no rows to filter, "RLS is enabled"
    // could be asserted while RLS was still never *evaluated* — the precise
    // state migrations 0010/0011 existed to escape. These rows make the new
    // policies run.
    await sql`
      insert into attendance_records
        (attendance_id, organization_id, user_id, date, clock_in_at, clock_out_at,
         status, working_minutes, effective_minutes)
      values (${attendanceA}, ${orgA}, ${userA}, ${DAY}, ${`${DAY}T09:00:00Z`},
              ${`${DAY}T17:00:00Z`}, 'PRESENT', 480, 480),
             (${attendanceB}, ${orgB}, ${userB}, ${DAY}, ${`${DAY}T09:00:00Z`},
              ${`${DAY}T17:00:00Z`}, 'PRESENT', 480, 480)
    `;
    await sql`
      insert into attendance_breaks
        (break_id, organization_id, attendance_id, start_at, end_at, kind)
      values (${breakA}, ${orgA}, ${attendanceA}, ${`${DAY}T12:00:00Z`},
              ${`${DAY}T12:30:00Z`}, 'break'),
             (${breakB}, ${orgB}, ${attendanceB}, ${`${DAY}T12:00:00Z`},
              ${`${DAY}T12:30:00Z`}, 'break')
    `;
    // Both use COR-0001: the unique index is per-organisation, so two tenants
    // holding the same code is correct and worth pinning down.
    await sql`
      insert into attendance_corrections
        (correction_id, organization_id, correction_code, user_id, date,
         correction_type, reason, status)
      values (${correctionA}, ${orgA}, 'COR-0001', ${userA}, ${DAY},
              'LOGIN_TIME', 'Integration fixture for tenant A.', 'PENDING'),
             (${correctionB}, ${orgB}, 'COR-0001', ${userB}, ${DAY},
              'LOGIN_TIME', 'Integration fixture for tenant B.', 'PENDING')
    `;
  });

  afterAll(async () => {
    const sql = db();
    // Workforce rows first: attendance_records.user_id and
    // attendance_corrections.user_id are ON DELETE RESTRICT, so the user delete
    // below fails while they exist. Breaks cascade from the record, but are
    // removed explicitly rather than relying on that.
    await sql`delete from attendance_breaks where organization_id in (${orgA}, ${orgB})`;
    await sql`delete from attendance_corrections where organization_id in (${orgA}, ${orgB})`;
    await sql`delete from attendance_records where organization_id in (${orgA}, ${orgB})`;
    await sql`delete from users where organization_id in (${orgA}, ${orgB})`;
    await sql`delete from roles where organization_id in (${orgA}, ${orgB})`;
    await sql`delete from organizations where organization_id in (${orgA}, ${orgB})`;
    for (const id of authUserIds) {
      await admin.auth.admin.deleteUser(id);
    }
    await closeDatabase();
  });

  it("enables RLS on every table the migrations declare", async () => {
    const declared = tablesWithRlsDeclared();
    expect(declared.length).toBeGreaterThan(0);

    const rows = await db()`
      select c.relname as table_name, c.relrowsecurity as enabled
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
    `;
    const enabled = new Map(
      rows.map((r) => [r.table_name as string, r.enabled as boolean]),
    );

    const notEnforcing = declared.filter((t) => enabled.get(t) !== true);
    expect(
      notEnforcing,
      `RLS declared but not active on: ${notEnforcing.join(", ")}`,
    ).toEqual([]);
  });

  it("backs every RLS-enabled table with at least one policy", async () => {
    const rows = await db()`
      select c.relname as table_name, count(p.polname) as policy_count
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      left join pg_policy p on p.polrelid = c.oid
      where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
      group by c.relname
    `;
    // RLS on with zero policies denies everything — a silent outage, not
    // security. Catch it here rather than in production.
    const unpoliced = rows
      .filter((r) => Number(r.policy_count) === 0)
      .map((r) => r.table_name);
    expect(unpoliced, `RLS on with no policy: ${unpoliced.join(", ")}`).toEqual(
      [],
    );
  });

  it("denies anonymous callers", async () => {
    // Anonymous callers are refused twice over, and either layer is a pass:
    //   · `anon` holds no privilege on the table at all (migration 0011), so
    //     PostgreSQL raises 42501 before any policy is consulted; or
    //   · were that grant ever restored, every policy targets `authenticated`,
    //     and no auth.uid() means no organisation, so every row is filtered.
    // The only failure is a read that actually comes back with rows.
    let rows: readonly { organization_id: string }[];
    try {
      rows = await asRole("anon", {}, (sql) =>
        sql<
          { organization_id: string }[]
        >`select organization_id from organizations`.then((r) => r),
      );
    } catch (error) {
      expect(
        (error as { code?: string }).code,
        "anon was refused, but not by the privilege check",
      ).toBe("42501");
      return;
    }
    expect(rows.length).toBe(0);
  });

  it("shows a tenant only its own organisation", async () => {
    const seen = await asRole(
      "authenticated",
      { sub: userA, organizationId: orgA },
      (sql) => sql`select organization_id from organizations`,
    );
    const ids = seen.map((r) => r.organization_id as string);
    expect(ids).toContain(orgA);
    expect(ids, "tenant A can see tenant B's organisation").not.toContain(orgB);
  });

  it("hides another tenant's users", async () => {
    const seen = await asRole(
      "authenticated",
      { sub: userA, organizationId: orgA },
      (sql) => sql`select user_id, organization_id from users`,
    );
    const orgs = new Set(seen.map((r) => r.organization_id as string));
    expect(orgs.has(orgB), "cross-tenant user rows leaked").toBe(false);
    expect(seen.map((r) => r.user_id)).toContain(userA);
  });

  it("refuses a cross-tenant write", async () => {
    await expect(
      asRole("authenticated", { sub: userB, organizationId: orgB }, (sql) =>
        sql`update organizations set organization_name = 'hijacked'
             where organization_id = ${orgA}`.then((r) => {
          // A blocked UPDATE reports zero affected rows rather than raising.
          if (r.count === 0) throw new Error("no rows updated");
          return r;
        }),
      ),
    ).rejects.toThrow();

    const [row] = await db()`
      select organization_name from organizations where organization_id = ${orgA}
    `;
    expect(row.organization_name).toBe("Tenant A");
  });

  it("resolves the tenant from the JWT via app.current_user_organization_id()", async () => {
    const [row] = await asRole(
      "authenticated",
      { sub: userA, organizationId: orgA },
      (sql) => sql`select app.current_user_organization_id() as org`,
    );
    expect(row.org).toBe(orgA);
  });

  it("evaluates RBAC through app.has_permission()", async () => {
    // Tenant A holds {"*": ["*"]} — everything.
    const [a] = await asRole(
      "authenticated",
      { sub: userA, organizationId: orgA },
      (sql) => sql`select app.has_permission('projects', 'delete') as allowed`,
    );
    expect(a.allowed).toBe(true);

    // Tenant B holds {"projects": ["read"]} — read only.
    const [readable] = await asRole(
      "authenticated",
      { sub: userB, organizationId: orgB },
      (sql) => sql`select app.has_permission('projects', 'read') as allowed`,
    );
    expect(readable.allowed).toBe(true);

    const [writable] = await asRole(
      "authenticated",
      { sub: userB, organizationId: orgB },
      (sql) => sql`select app.has_permission('projects', 'delete') as allowed`,
    );
    expect(writable.allowed, "viewer was granted delete").toBe(false);
  });

  it("lets the service role bypass RLS, as the portal layer relies on", async () => {
    const rows = await db()`
      select organization_id from organizations
      where organization_id in (${orgA}, ${orgB})
    `;
    expect(rows.length).toBe(2);
  });

  // ── Workforce tables (migration 0014) ────────────────────────────────────
  //
  // These read as `authenticated` with each tenant's claims, which is the only
  // way to establish that the policies added by 0014 actually filter. The
  // application's own Drizzle connection is the table owner and bypasses them
  // entirely, so nothing in the unit suite or the app can prove this.

  it("hides another tenant's attendance records", async () => {
    const seen = await asRole(
      "authenticated",
      { sub: userA, organizationId: orgA },
      (sql) =>
        sql`select attendance_id, organization_id from attendance_records`,
    );
    const ids = seen.map((r) => r.attendance_id as string);
    expect(ids, "tenant A cannot see its own attendance").toContain(
      attendanceA,
    );
    expect(ids, "cross-tenant attendance leaked").not.toContain(attendanceB);
  });

  it("hides another tenant's attendance breaks", async () => {
    const seen = await asRole(
      "authenticated",
      { sub: userA, organizationId: orgA },
      (sql) => sql`select break_id from attendance_breaks`,
    );
    const ids = seen.map((r) => r.break_id as string);
    expect(ids).toContain(breakA);
    expect(ids, "cross-tenant break rows leaked").not.toContain(breakB);
  });

  it("hides another tenant's correction requests", async () => {
    const seen = await asRole(
      "authenticated",
      { sub: userA, organizationId: orgA },
      (sql) => sql`select correction_id from attendance_corrections`,
    );
    const ids = seen.map((r) => r.correction_id as string);
    expect(ids).toContain(correctionA);
    expect(ids, "cross-tenant correction rows leaked").not.toContain(
      correctionB,
    );
  });

  it("withholds attendance from a tenant whose role has no attendance permission", async () => {
    // Tenant B's role is {"projects": ["read"]} — no attendance module at all.
    // Its own organisation's row must still be invisible: the 0014 policies are
    // permission-aware, not merely tenant-aware, and this is the half that a
    // tenant-only test would pass without ever checking.
    const rows = await asRole(
      "authenticated",
      { sub: userB, organizationId: orgB },
      (sql) => sql`select attendance_id from attendance_records`,
    );
    expect(rows.length, "a role without attendance permission read rows").toBe(
      0,
    );

    const breaks = await asRole(
      "authenticated",
      { sub: userB, organizationId: orgB },
      (sql) => sql`select break_id from attendance_breaks`,
    );
    expect(breaks.length).toBe(0);

    const corrections = await asRole(
      "authenticated",
      { sub: userB, organizationId: orgB },
      (sql) => sql`select correction_id from attendance_corrections`,
    );
    expect(corrections.length).toBe(0);
  });

  it("refuses a Data API write to attendance", async () => {
    // 0014 grants SELECT only and adds no write policy, so writes are denied
    // twice over: no privilege, and no policy if the privilege were granted.
    // Writes stay on the owner connection behind requirePermission().
    let failed = false;
    try {
      await asRole(
        "authenticated",
        { sub: userA, organizationId: orgA },
        (sql) =>
          sql`update attendance_records set working_minutes = 999
               where attendance_id = ${attendanceA}`.then((r) => {
            // A policy-blocked UPDATE reports zero rows rather than raising.
            if (r.count === 0) throw new Error("no rows updated");
            return r;
          }),
      );
    } catch {
      failed = true;
    }
    expect(failed, "a Data API caller was able to write attendance").toBe(true);

    const [row] = await db()`
      select working_minutes from attendance_records
      where attendance_id = ${attendanceA}
    `;
    expect(row.working_minutes).toBe(480);
  });
});
