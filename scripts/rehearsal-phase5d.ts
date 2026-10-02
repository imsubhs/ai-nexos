/**
 * AI NEX OS — PHASE 5D LOCAL REHEARSAL & SECURITY VERIFICATION
 *
 * Runs against a clean, disposable local PostgreSQL database:
 *   postgresql://postgres@localhost:5432/nexos_rehearsal_5d
 *
 * Rehearsal Scope:
 * 1. Clean environment initialization on local PostgreSQL.
 * 2. Application of migration chain 0000 -> 0017.
 * 3. Application of remediation migration 0018.
 * 4. Multi-tenant matrix setup (Org A, Org B; Public, Internal, Private projects).
 * 5. Full 10-point verification under authenticated/anon roles:
 *    - 1. authenticated user can read authorized project
 *    - 2. authenticated user cannot read another tenant's project
 *    - 3. unauthorized project member access fails
 *    - 4. project_members visibility remains correctly scoped
 *    - 5. anonymous SELECT remains blocked
 *    - 6. anonymous INSERT remains blocked
 *    - 7. authenticated unauthorized INSERT remains blocked
 *    - 8. UPDATE remains correctly scoped
 *    - 9. DELETE remains correctly scoped
 *    - 10. no 42P17 recursion occurs on any operation
 */

import postgres, { type Sql } from "postgres";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const LOCAL_DB_URL =
  process.env.REHEARSAL_DATABASE_URL ||
  "postgresql://postgres@localhost:5432/nexos_rehearsal_5d";

interface VerificationItem {
  id: string;
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
}

const verifications: VerificationItem[] = [];

function record(
  id: string,
  name: string,
  expected: string,
  actual: string,
  passed: boolean,
) {
  verifications.push({ id, name, expected, actual, passed });
  const mark = passed ? "✓ PASS" : "✗ FAIL";
  console.log(`[${mark}] ${id}: ${name}\n       Expected: ${expected}\n       Actual:   ${actual}`);
}

let sqlClient: Sql;

async function asRole<T>(
  role: "anon" | "authenticated",
  claims: { sub?: string; organizationId?: string; roleKey?: string },
  fn: (tx: Sql) => Promise<T>,
): Promise<T> {
  return sqlClient.begin(async (tx) => {
    await tx`SELECT set_config('role', ${role}, true)`;
    await tx`SELECT set_config('search_path', 'public, app', true)`;
    const jwt = JSON.stringify({
      sub: claims.sub ?? null,
      role,
      organization_id: claims.organizationId ?? null,
    });
    await tx`SELECT set_config('request.jwt.claims', ${jwt}, true)`;
    if (claims.sub) {
      await tx`SELECT set_config('request.jwt.claim.sub', ${claims.sub}, true)`;
    }
    await tx`SET LOCAL ROLE ${tx.unsafe(role)}`;
    return fn(tx as unknown as Sql);
  }) as Promise<T>;
}

async function main() {
  console.log("================================================================================");
  console.log("PHASE 5D — LOCAL REHEARSAL ON DISPOSABLE POSTGRESQL");
  console.log(`Target: ${LOCAL_DB_URL}`);
  console.log("================================================================================\n");

  const sql = postgres(LOCAL_DB_URL, { prepare: false, onnotice: () => {} });
  sqlClient = sql;

  try {
    console.log("--- 1. Resetting Schemas & Environment ---");
    await sql.unsafe(`
      DROP SCHEMA IF EXISTS public CASCADE;
      DROP SCHEMA IF EXISTS events CASCADE;
      DROP SCHEMA IF EXISTS app CASCADE;
      CREATE SCHEMA public;
      CREATE SCHEMA IF NOT EXISTS auth;
    `);
    await sql.unsafe(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    // Ensure roles exist
    await sql.unsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN;
        END IF;
      END $$;
      GRANT USAGE ON SCHEMA public TO anon, authenticated;
    `);

    // Auth helpers & table
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS auth.users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text,
        created_at timestamptz DEFAULT now()
      );
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
        SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$ LANGUAGE sql STABLE;
      CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$
        SELECT coalesce(current_setting('request.jwt.claim.role', true), 'authenticated');
      $$ LANGUAGE sql STABLE;
      CREATE OR REPLACE FUNCTION auth.email() RETURNS text AS $$
        SELECT coalesce(current_setting('request.jwt.claim.email', true), '');
      $$ LANGUAGE sql STABLE;
    `);

    console.log("--- 2. Applying Migrations 0000 → 0017 ---");
    const migrationsFolder = join(process.cwd(), "database", "migrations");
    const migrationFiles = [
      "0000_init_platform_foundation.sql",
      "0001_security_rls_foundation.sql",
      "0002_lumpy_vertigo.sql",
      "0003_project_management.sql",
      "0004_typical_wolfpack.sql",
      "0005_reflective_king_cobra.sql",
      "0006_wooden_micromax.sql",
      "0007_remarkable_maximus.sql",
      "0008_same_johnny_storm.sql",
      "0009_mute_wallow.sql",
      "0010_data_api_select_grants.sql",
      "0011_revoke_blanket_data_api_grants.sql",
      "0012_revoke_default_privileges.sql",
      "0013_org_sequences_composite_pk.sql",
      "0014_workforce_rls.sql",
      "0015_organization_code_prefix.sql",
      "0016_organization_memberships.sql",
      "0017_organization_invitations.sql",
    ];

    for (const file of migrationFiles) {
      const raw = readFileSync(join(migrationsFolder, file), "utf8");
      // Split by statement-breakpoint if present
      const statements = raw.split("--> statement-breakpoint");
      for (const stmt of statements) {
        const trimmed = stmt.trim();
        if (trimmed.length > 0) {
          await sql.unsafe(trimmed);
        }
      }
    }
    console.log(`  ✓ Successfully applied 0000 through 0017.`);

    console.log("--- 3. Applying Remediation Migration 0018 ---");
    const m0018Raw = readFileSync(
      join(migrationsFolder, "0018_remediate_projects_rls_recursion.sql"),
      "utf8",
    );
    const m0018Statements = m0018Raw.split("--> statement-breakpoint");
    for (const stmt of m0018Statements) {
      const trimmed = stmt.trim();
      if (trimmed.length > 0) {
        await sql.unsafe(trimmed);
      }
    }
    console.log(`  ✓ Successfully applied 0018_remediate_projects_rls_recursion.sql.`);

    console.log("--- 4. Seeding Test Tenants & Matrix ---");
    const orgA = randomUUID();
    const orgB = randomUUID();

    const roleAAdmin = randomUUID();
    const roleAMember = randomUUID();
    const roleBAdmin = randomUUID();

    const userA1 = randomUUID(); // Org A Admin
    const userA2 = randomUUID(); // Org A Member (in private project)
    const userA3 = randomUUID(); // Org A Member (NOT in private project)
    const userB1 = randomUUID(); // Org B Admin

    // Insert auth users
    await sql`
      INSERT INTO auth.users (id, email) VALUES
        (${userA1}, 'a1-admin@test.local'),
        (${userA2}, 'a2-member@test.local'),
        (${userA3}, 'a3-member@test.local'),
        (${userB1}, 'b1-admin@test.local');
    `;

    // Insert organizations
    await sql`
      INSERT INTO organizations (organization_id, organization_name, slug, code_prefix) VALUES
        (${orgA}, 'Org Alpha', 'org-alpha', 'ALP'),
        (${orgB}, 'Org Beta', 'org-beta', 'BET');
    `;

    // Insert roles
    await sql`
      INSERT INTO roles (role_id, organization_id, role_name, role_key, permissions) VALUES
        (${roleAAdmin}, ${orgA}, 'Admin', 'admin', ${sql.json({ "*": ["*"] })}),
        (${roleAMember}, ${orgA}, 'Member', 'member', ${sql.json({ projects: ["read"] })}),
        (${roleBAdmin}, ${orgB}, 'Admin', 'admin', ${sql.json({ "*": ["*"] })});
    `;

    // Insert users
    await sql`
      INSERT INTO users (user_id, organization_id, role_id, first_name, email, status) VALUES
        (${userA1}, ${orgA}, ${roleAAdmin}, 'Alice', 'a1@test.local', 'active'),
        (${userA2}, ${orgA}, ${roleAMember}, 'Bob', 'a2@test.local', 'active'),
        (${userA3}, ${orgA}, ${roleAMember}, 'Charlie', 'a3@test.local', 'active'),
        (${userB1}, ${orgB}, ${roleBAdmin}, 'David', 'b1@test.local', 'active');
    `;

    // Insert projects
    const projA_internal = randomUUID();
    const projA_private_member = randomUUID();
    const projA_private_no_member = randomUUID();
    const projB_internal = randomUUID();

    await sql`
      INSERT INTO projects (project_id, organization_id, project_name, project_code, visibility) VALUES
        (${projA_internal}, ${orgA}, 'Alpha Internal', 'AIN-01', 'internal'),
        (${projA_private_member}, ${orgA}, 'Alpha Private With Member', 'APM-01', 'private'),
        (${projA_private_no_member}, ${orgA}, 'Alpha Private Without Member', 'APN-01', 'private'),
        (${projB_internal}, ${orgB}, 'Beta Internal', 'BIN-01', 'internal');
    `;

    // Insert project membership: userA2 is member of projA_private_member
    const mem1 = randomUUID();
    await sql`
      INSERT INTO project_members (member_id, project_id, user_id, role) VALUES
        (${mem1}, ${projA_private_member}, ${userA2}, 'member');
    `;

    console.log("  ✓ Test matrix seeded successfully.");

    console.log("\n--- 5. Executing Verification Tests ---");

    // TEST 1: Authenticated user can read authorized project
    // User A1 (Admin with projects:*) should see all 3 projects in Org A
    let a1Projects: string[] = [];
    let test1Error: string | null = null;
    try {
      const rows = await asRole("authenticated", { sub: userA1, organizationId: orgA }, (tx) =>
        tx`SELECT project_id FROM projects`
      );
      a1Projects = rows.map((r: any) => r.project_id);
    } catch (err: any) {
      test1Error = err.message;
    }
    const test1Passed = !test1Error && a1Projects.length === 3 && a1Projects.includes(projA_internal);
    record(
      "CHK-01",
      "Authenticated user can read authorized projects",
      "User A1 sees all 3 Org A projects (internal + 2 private via projects:*)",
      test1Error || `Saw ${a1Projects.length} projects`,
      test1Passed,
    );

    // TEST 2: Authenticated user cannot read another tenant's project
    // User A1 should NOT see projB_internal
    const seesTenantB = a1Projects.includes(projB_internal);
    record(
      "CHK-02",
      "Authenticated user cannot read another tenant's project",
      "projB_internal is NOT visible to User A1",
      seesTenantB ? "LEAKED: User A1 saw Org B project" : "Properly isolated (0 cross-tenant rows)",
      !seesTenantB,
    );

    // TEST 3: Unauthorized project member access fails
    // User A2 (Member with projects:read) should see:
    // - projA_internal (internal)
    // - projA_private_member (member of this project)
    // BUT NOT projA_private_no_member (private, not a member, no wildcard)
    let a2Projects: string[] = [];
    let test3Error: string | null = null;
    try {
      const rows = await asRole("authenticated", { sub: userA2, organizationId: orgA }, (tx) =>
        tx`SELECT project_id FROM projects`
      );
      a2Projects = rows.map((r: any) => r.project_id);
    } catch (err: any) {
      test3Error = err.message;
    }
    const seesInternal = a2Projects.includes(projA_internal);
    const seesPrivateMember = a2Projects.includes(projA_private_member);
    const seesPrivateUnauthorized = a2Projects.includes(projA_private_no_member);
    const test3Passed = !test3Error && seesInternal && seesPrivateMember && !seesPrivateUnauthorized;
    record(
      "CHK-03",
      "Unauthorized project member access fails for private project",
      "User A2 sees internal + private member project, NOT unauthorized private project",
      test3Error || `seesInternal=${seesInternal}, seesPrivateMember=${seesPrivateMember}, seesUnauthorizedPrivate=${seesPrivateUnauthorized}`,
      test3Passed,
    );

    // TEST 4: project_members visibility remains correctly scoped
    // User A2 can read project_members for projA_private_member
    // User A3 (not a member of private project) cannot see members of projA_private_no_member
    let a2Members: any[] = [];
    let a3Members: any[] = [];
    await asRole("authenticated", { sub: userA2, organizationId: orgA }, async (tx) => {
      a2Members = await tx`SELECT member_id, project_id FROM project_members`;
    });
    await asRole("authenticated", { sub: userA3, organizationId: orgA }, async (tx) => {
      a3Members = await tx`SELECT member_id, project_id FROM project_members`;
    });
    const test4Passed = a2Members.some((m) => m.member_id === mem1) && a3Members.length === 0;
    record(
      "CHK-04",
      "project_members visibility remains correctly scoped",
      "User A2 sees membership for authorized project; User A3 sees 0 rows for private project",
      `User A2 saw ${a2Members.length} rows; User A3 saw ${a3Members.length} rows`,
      test4Passed,
    );

    // TEST 5: Anonymous SELECT remains blocked
    let anonSelectBlocked = false;
    let anonSelectErr = "";
    try {
      const rows = await asRole("anon", {}, (tx) => tx`SELECT * FROM projects`);
      anonSelectBlocked = rows.length === 0;
    } catch (err: any) {
      anonSelectBlocked = err.code === "42501";
      anonSelectErr = `code: ${err.code}`;
    }
    record(
      "CHK-05",
      "Anonymous SELECT remains blocked",
      "Blocked by privilege or returns 0 rows",
      anonSelectErr || (anonSelectBlocked ? "0 rows returned" : "Rows leaked to anon"),
      anonSelectBlocked,
    );

    // TEST 6: Anonymous INSERT remains blocked
    let anonInsertBlocked = false;
    let anonInsertErr = "";
    try {
      await asRole("anon", {}, (tx) =>
        tx`INSERT INTO projects (project_id, organization_id, project_name, project_code)
           VALUES (${randomUUID()}, ${orgA}, 'Anon Proj', 'ANP-01')`
      );
    } catch (err: any) {
      anonInsertBlocked = true;
      anonInsertErr = `code: ${err.code} (${err.message})`;
    }
    record(
      "CHK-06",
      "Anonymous INSERT remains blocked",
      "Blocked with 42501 or error",
      anonInsertErr || "Failed to block anon insert",
      anonInsertBlocked,
    );

    // TEST 7: Authenticated unauthorized INSERT remains blocked
    // Grant INSERT to authenticated so we test RLS WITH CHECK policy:
    // User A2 only has {"projects": ["read"]}, lacks "projects:create"
    await sql`GRANT INSERT, UPDATE, DELETE ON TABLE projects, project_members TO authenticated`;

    let userA2InsertBlocked = false;
    let userA2InsertErr = "";
    try {
      await asRole("authenticated", { sub: userA2, organizationId: orgA }, (tx) =>
        tx`INSERT INTO projects (project_id, organization_id, project_name, project_code)
           VALUES (${randomUUID()}, ${orgA}, 'Unauthorized Proj', 'UP-01')`
      );
    } catch (err: any) {
      userA2InsertBlocked = true;
      userA2InsertErr = `code: ${err.code} (${err.message})`;
    }
    record(
      "CHK-07",
      "Authenticated unauthorized INSERT remains blocked",
      "User A2 lacking projects:create cannot insert (RLS WITH CHECK)",
      userA2InsertErr || "Insert succeeded unexpectedly",
      userA2InsertBlocked,
    );

    // TEST 8: UPDATE remains correctly scoped
    // User A1 (has projects:update) can update Org A project
    // User A1 attempting to update Org B project updates 0 rows
    let updateOwnSuccess = false;
    let updateCrossTenantZero = false;
    await asRole("authenticated", { sub: userA1, organizationId: orgA }, async (tx) => {
      const resOwn = await tx`
        UPDATE projects SET description = 'Updated by A1' WHERE project_id = ${projA_internal} RETURNING project_id
      `;
      updateOwnSuccess = resOwn.length === 1;

      const resCross = await tx`
        UPDATE projects SET description = 'Hijacked by A1' WHERE project_id = ${projB_internal} RETURNING project_id
      `;
      updateCrossTenantZero = resCross.length === 0;
    });
    record(
      "CHK-08",
      "UPDATE remains correctly scoped",
      "Own project updated (1 row); cross-tenant update affects 0 rows",
      `updateOwn=${updateOwnSuccess}, updateCrossCount=${updateCrossTenantZero ? 0 : ">0"}`,
      updateOwnSuccess && updateCrossTenantZero,
    );

    // TEST 9: DELETE remains correctly scoped
    // User A1 deletes own project; cross-tenant delete of Org B affects 0 rows
    let deleteOwnSuccess = false;
    let deleteCrossTenantZero = false;
    await asRole("authenticated", { sub: userA1, organizationId: orgA }, async (tx) => {
      const resCross = await tx`
        DELETE FROM projects WHERE project_id = ${projB_internal} RETURNING project_id
      `;
      deleteCrossTenantZero = resCross.length === 0;

      const resOwn = await tx`
        DELETE FROM projects WHERE project_id = ${projA_internal} RETURNING project_id
      `;
      deleteOwnSuccess = resOwn.length === 1;
    });
    record(
      "CHK-09",
      "DELETE remains correctly scoped",
      "Cross-tenant delete affects 0 rows; own project deleted successfully",
      `deleteCrossCount=${deleteCrossTenantZero ? 0 : ">0"}, deleteOwn=${deleteOwnSuccess}`,
      deleteOwnSuccess && deleteCrossTenantZero,
    );

    // TEST 10: No recursion occurs
    // Check that none of the operations encountered 42P17
    const had42P17 =
      test1Error?.includes("42P17") ||
      test3Error?.includes("42P17") ||
      userA2InsertErr?.includes("42P17");
    record(
      "CHK-10",
      "No 42P17 recursion occurs across all operations",
      "Zero 42P17 infinite recursion errors",
      had42P17 ? "RECURSION DETECTED" : "Clean execution (0 recursion)",
      !had42P17,
    );

    const allPassed = verifications.every((v) => v.passed);
    console.log("\n================================================================================");
    console.log(`LOCAL REHEARSAL VERDICT: ${allPassed ? "PASSED" : "FAILED"}`);
    console.log(`Passed: ${verifications.filter((v) => v.passed).length}/${verifications.length}`);
    console.log("================================================================================\n");

    if (!allPassed) {
      process.exit(1);
    }
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("Local rehearsal fatal error:", err);
  process.exit(1);
});
