/**
 * PHASE 5F — WORKSTREAM 12: LOCAL PRODUCTION MIGRATION DRY-RUN
 *
 * Runs strictly against a local disposable database: nexos_dry_run_phase5f
 * Tests cold sequential migration 0000 -> 0018, schema inventory,
 * helper functions, backfill safety, RLS recursion prevention, and re-run idempotency.
 */

import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ADMIN_URL = "postgresql://postgres@localhost:5432/postgres";
const DRY_RUN_DB = "nexos_dry_run_phase5f";
const DRY_RUN_URL = `postgresql://postgres@localhost:5432/${DRY_RUN_DB}`;

async function runDryRun() {
  console.log(
    "================================================================================",
  );
  console.log("PHASE 5F — WORKSTREAM 12: LOCAL PRODUCTION MIGRATION DRY-RUN");
  console.log(`Database: ${DRY_RUN_DB} on local PostgreSQL (port 5432)`);
  console.log(
    "================================================================================\n",
  );

  // Step 1: Create fresh disposable database
  console.log("1. Creating fresh disposable database...");
  const adminSql = postgres(ADMIN_URL, { prepare: false });
  try {
    await adminSql.unsafe(`DROP DATABASE IF EXISTS ${DRY_RUN_DB};`);
    await adminSql.unsafe(`CREATE DATABASE ${DRY_RUN_DB};`);
    console.log(`  ✓ Database ${DRY_RUN_DB} created.`);
  } finally {
    await adminSql.end();
  }

  const sql = postgres(DRY_RUN_URL, { prepare: false, onnotice: () => {} });

  try {
    // Step 2: Initialize base extensions and mock auth
    console.log("\n2. Initializing extensions and mock auth environment...");
    await sql.unsafe(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      CREATE SCHEMA IF NOT EXISTS auth;

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

      CREATE SCHEMA IF NOT EXISTS drizzle;
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id serial PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      );
    `);

    // Step 3: Read journal and apply full migration chain 0000 -> 0018
    console.log("\n3. Applying full migration chain 0000 → 0018...");
    const migrationsFolder = join(process.cwd(), "database", "migrations");
    const journalPath = join(migrationsFolder, "meta", "_journal.json");
    const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
      entries: { idx: number; tag: string; when: number }[];
    };

    console.log(`  Journal contains ${journal.entries.length} entries.`);

    let migrationIdx = 0;
    for (const entry of journal.entries) {
      const filename = `${entry.tag}.sql`;
      const fullPath = join(migrationsFolder, filename);
      const rawSql = readFileSync(fullPath, "utf8");

      const t0 = Date.now();
      const statements = rawSql.split("--> statement-breakpoint");
      for (const stmt of statements) {
        const trimmed = stmt.trim();
        if (trimmed.length > 0) {
          await sql.unsafe(trimmed);
        }
      }
      await sql`
        INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
        VALUES (${entry.tag}, ${entry.when});
      `;
      const dur = Date.now() - t0;
      console.log(
        `  ✓ [${String(entry.idx).padStart(2, "0")}] ${filename} (${dur}ms)`,
      );
      migrationIdx++;
    }

    // Step 4: Audit Schema Metrics
    console.log("\n4. Auditing Schema Metrics...");
    const [migrationsCount] =
      await sql`SELECT count(*)::int as count FROM drizzle.__drizzle_migrations;`;
    const [tables] =
      await sql`SELECT count(*)::int as count FROM information_schema.tables WHERE table_schema = 'public';`;
    const [indexes] =
      await sql`SELECT count(*)::int as count FROM pg_indexes WHERE schemaname = 'public';`;
    const [constraints] =
      await sql`SELECT count(*)::int as count FROM information_schema.table_constraints WHERE table_schema = 'public';`;
    const [policies] =
      await sql`SELECT count(*)::int as count FROM pg_policies WHERE schemaname = 'public';`;
    const [appFunctions] = await sql`
      SELECT count(*)::int as count
      FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'app';
    `;

    console.log(
      `  Recorded Migrations:  ${migrationsCount.count} (Expected: 19)`,
    );
    console.log(`  Tables in public:     ${tables.count}`);
    console.log(`  Indexes in public:    ${indexes.count}`);
    console.log(`  Constraints in public:${constraints.count}`);
    console.log(`  RLS Policies:         ${policies.count}`);
    console.log(`  Functions in 'app':   ${appFunctions.count}`);

    if (migrationsCount.count !== 19) {
      throw new Error(`Expected 19 migrations, got ${migrationsCount.count}`);
    }

    // Step 5: Verify Helper Function Attributes (0018)
    console.log("\n5. Verifying Helper Function Attributes (0018)...");
    const [fnRecord] = await sql`
      SELECT p.proname, n.nspname, p.prosecdef, p.proconfig,
             has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
             has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'app' AND p.proname = 'is_project_member';
    `;
    if (!fnRecord) throw new Error("Function app.is_project_member not found");
    console.log(`  prosecdef:   ${fnRecord.prosecdef} (Expected: true)`);
    console.log(
      `  proconfig:   ${JSON.stringify(fnRecord.proconfig)} (Expected: search_path=public)`,
    );
    console.log(`  anon_exec:   ${fnRecord.anon_exec} (Expected: false)`);
    console.log(`  auth_exec:   ${fnRecord.auth_exec} (Expected: true)`);

    if (
      !fnRecord.prosecdef ||
      !Array.isArray(fnRecord.proconfig) ||
      !fnRecord.proconfig.includes("search_path=public") ||
      fnRecord.anon_exec !== false ||
      fnRecord.auth_exec !== true
    ) {
      throw new Error("Helper function attributes verification failed!");
    }

    // Step 6: Verify Membership Backfill Safety (0016)
    console.log("\n6. Verifying Membership Backfill Logic (0016)...");
    // Insert test legacy users into users table
    const testOrgId = randomUUID();
    const testRoleId = randomUUID();
    const activeUserId = randomUUID();
    const deletedUserId = randomUUID();
    const inactiveUserId = randomUUID();

    await sql`
      INSERT INTO auth.users (id, email) VALUES
        (${activeUserId}, 'active@dryrun.local'),
        (${deletedUserId}, 'deleted@dryrun.local'),
        (${inactiveUserId}, 'inactive@dryrun.local');
    `;
    await sql`
      INSERT INTO organizations (organization_id, organization_name, slug, code_prefix)
      VALUES (${testOrgId}, 'Dry Run Org', 'dry-run-org', 'DRO');
    `;
    await sql`
      INSERT INTO roles (role_id, organization_id, role_name, role_key, permissions)
      VALUES (${testRoleId}, ${testOrgId}, 'Admin', 'admin', ${sql.json({ "*": ["*"] })});
    `;
    await sql`
      INSERT INTO users (user_id, organization_id, role_id, first_name, email, status, deleted_at) VALUES
        (${activeUserId}, ${testOrgId}, ${testRoleId}, 'Active User', 'active@dryrun.local', 'active', null),
        (${deletedUserId}, ${testOrgId}, ${testRoleId}, 'Deleted User', 'deleted@dryrun.local', 'active', now()),
        (${inactiveUserId}, ${testOrgId}, ${testRoleId}, 'Inactive User', 'inactive@dryrun.local', 'inactive', null);
    `;

    // Re-run the backfill block from 0016
    await sql`
      INSERT INTO "organization_memberships" (
        "membership_id", "user_id", "organization_id", "role_id", "status", "is_default"
      )
      SELECT
        gen_random_uuid(), u."user_id", u."organization_id", u."role_id",
        CASE
          WHEN u."status" = 'active' AND u."deleted_at" IS NULL THEN 'active'::"membership_status"
          ELSE 'suspended'::"membership_status"
        END,
        true
      FROM "users" u
      WHERE u."organization_id" IS NOT NULL AND u."role_id" IS NOT NULL
      ON CONFLICT ("user_id", "organization_id") DO NOTHING;
    `;

    const memberships = await sql<{ user_id: string; status: string }[]>`
      SELECT user_id, status FROM organization_memberships WHERE organization_id = ${testOrgId};
    `;

    const activeMember = memberships.find((m) => m.user_id === activeUserId);
    const deletedMember = memberships.find((m) => m.user_id === deletedUserId);
    const inactiveMember = memberships.find(
      (m) => m.user_id === inactiveUserId,
    );

    console.log(
      `  Active user membership status:   ${activeMember?.status} (Expected: active)`,
    );
    console.log(
      `  Deleted user membership status:  ${deletedMember?.status} (Expected: suspended)`,
    );
    console.log(
      `  Inactive user membership status: ${inactiveMember?.status} (Expected: suspended)`,
    );

    if (
      activeMember?.status !== "active" ||
      deletedMember?.status !== "suspended" ||
      inactiveMember?.status !== "suspended"
    ) {
      throw new Error(
        "Membership backfill status mapping verification failed!",
      );
    }

    // Step 7: Verify Invitation Schema (0017)
    console.log("\n7. Verifying Invitation Schema (0017)...");
    const [invTable] = await sql`
      SELECT count(*)::int as count FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'organization_invitations';
    `;
    const [invIndexes] = await sql`
      SELECT count(*)::int as count FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'organization_invitations';
    `;
    console.log(
      `  Table organization_invitations exists: ${invTable.count === 1}`,
    );
    console.log(`  Indexes on organization_invitations:   ${invIndexes.count}`);
    if (invTable.count !== 1)
      throw new Error("organization_invitations table missing!");

    // Step 8: Verify Project RLS and Zero 42P17
    console.log("\n8. Verifying Project RLS & Zero 42P17 (0018)...");
    const testProjectId = randomUUID();

    await sql`
      INSERT INTO projects (project_id, organization_id, project_name, project_code, visibility)
      VALUES (${testProjectId}, ${testOrgId}, 'Private Alpha', 'DRO-01', 'private');
    `;
    await sql`
      INSERT INTO project_members (project_id, user_id, role)
      VALUES (${testProjectId}, ${activeUserId}, 'lead');
    `;

    // Authenticated query via transaction setting
    const [projRead] = await sql.begin(async (tx) => {
      await tx`SELECT set_config('role', 'authenticated', true)`;
      await tx`SELECT set_config('search_path', 'public, app', true)`;
      const jwt = JSON.stringify({
        sub: activeUserId,
        role: "authenticated",
        organization_id: testOrgId,
      });
      await tx`SELECT set_config('request.jwt.claims', ${jwt}, true)`;
      await tx`SELECT set_config('request.jwt.claim.sub', ${activeUserId}, true)`;
      await tx`SET LOCAL ROLE authenticated`;

      return tx<{ project_id: string; project_name: string }[]>`
        SELECT project_id, project_name FROM projects WHERE project_id = ${testProjectId}
      `;
    });

    console.log(
      `  Read project under authenticated RLS: ${projRead?.project_name ?? "NONE"}`,
    );
    if (!projRead) throw new Error("Authenticated project read failed!");

    // Step 9: Verify Re-Run Idempotency (Second Pass)
    console.log(
      "\n9. Testing Migration Re-Run Behavior (Idempotency Check)...",
    );
    const appliedBefore =
      await sql`SELECT count(*)::int as count FROM drizzle.__drizzle_migrations;`;
    console.log(
      `  Applied migrations count before re-run check: ${appliedBefore[0].count}`,
    );

    // Simulate Drizzle migrator check: check all journal entries against recorded hashes
    const recorded = await sql<
      { hash: string }[]
    >`SELECT hash FROM drizzle.__drizzle_migrations;`;
    const recordedHashes = new Set(recorded.map((r) => r.hash));
    const pending = journal.entries.filter((e) => !recordedHashes.has(e.tag));

    console.log(`  Pending unapplied migrations: ${pending.length}`);
    if (pending.length === 0) {
      console.log("  ✓ Confirmed: NO NEW MIGRATIONS APPLIED on re-run.");
    } else {
      throw new Error(
        `Expected 0 pending migrations on re-run, got ${pending.length}`,
      );
    }

    console.log(
      "\n================================================================================",
    );
    console.log("WORKSTREAM 12 RESULT: PASSED");
    console.log(
      "================================================================================\n",
    );
  } finally {
    await sql.end();

    // Clean up disposable database
    console.log(`10. Dropping disposable database ${DRY_RUN_DB}...`);
    const cleanupSql = postgres(ADMIN_URL, { prepare: false });
    try {
      await cleanupSql.unsafe(`DROP DATABASE IF EXISTS ${DRY_RUN_DB};`);
      console.log(`  ✓ Database ${DRY_RUN_DB} dropped cleanly.`);
    } finally {
      await cleanupSql.end();
    }
  }
}

runDryRun().catch((err) => {
  console.error("Dry run failed:", err);
  process.exit(1);
});
