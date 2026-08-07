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
  });

  afterAll(async () => {
    const sql = db();
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
    const rows = await asRole("anon", {}, (sql) =>
      sql`select organization_id from organizations`.then((r) => r),
    );
    // No auth.uid() means no organisation, so every row is filtered out.
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
});
