/**
 * WORKSTREAM 3 — LOCAL FULL-CHAIN MIGRATION REHEARSAL
 *
 * Runs against a clean disposable database: nexos_rehearsal_fullchain
 * on local PostgreSQL (localhost:5432).
 *
 * 1. Creates fresh disposable database
 * 2. Applies 0000 through 0018 sequentially
 * 3. Audits resulting schema objects
 * 4. Runs full RLS verification
 * 5. Drops the disposable database
 */

import postgres, { type Sql } from "postgres";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ADMIN_URL = "postgresql://postgres@localhost:5432/postgres";
const REHEARSAL_DB = "nexos_rehearsal_fullchain";
const REHEARSAL_URL = `postgresql://postgres@localhost:5432/${REHEARSAL_DB}`;

interface StepResult {
  step: string;
  status: "PASS" | "FAIL";
  durationMs: number;
  details: string;
}

const results: StepResult[] = [];

async function main() {
  console.log("================================================================================");
  console.log("WORKSTREAM 3 — LOCAL FULL-CHAIN REHEARSAL (0000 → 0018)");
  console.log(`Database: ${REHEARSAL_DB} on local PostgreSQL`);
  console.log("================================================================================\n");

  // Step 1: Create fresh database
  console.log("1. Creating fresh disposable database...");
  const adminSql = postgres(ADMIN_URL, { prepare: false });
  try {
    await adminSql.unsafe(`DROP DATABASE IF EXISTS ${REHEARSAL_DB};`);
    await adminSql.unsafe(`CREATE DATABASE ${REHEARSAL_DB};`);
    console.log(`  ✓ Database ${REHEARSAL_DB} created.`);
  } finally {
    await adminSql.end();
  }

  const sql = postgres(REHEARSAL_URL, { prepare: false, onnotice: () => {} });

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
    `);

    // Step 3: Read journal and apply all 19 migrations sequentially
    console.log("\n3. Applying full migration chain 0000 → 0018...");
    const migrationsFolder = join(process.cwd(), "database", "migrations");
    const journalPath = join(migrationsFolder, "meta", "_journal.json");
    const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
      entries: { idx: number; tag: string }[];
    };

    console.log(`  Found ${journal.entries.length} entries in _journal.json.`);

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
      const dur = Date.now() - t0;
      console.log(`  ✓ [${String(entry.idx).padStart(2, "0")}] ${filename} (${dur}ms)`);
      results.push({
        step: `Migration ${entry.idx}: ${entry.tag}`,
        status: "PASS",
        durationMs: dur,
        details: `Applied ${statements.length} statement(s)`,
      });
    }

    // Step 4: Schema Object Inventory
    console.log("\n4. Auditing Schema Objects...");
    const [tables] = await sql`
      SELECT count(*)::int as count FROM information_schema.tables WHERE table_schema = 'public';
    `;
    const [indexes] = await sql`
      SELECT count(*)::int as count FROM pg_indexes WHERE schemaname = 'public';
    `;
    const [constraints] = await sql`
      SELECT count(*)::int as count FROM information_schema.table_constraints WHERE table_schema = 'public';
    `;
    const [policies] = await sql`
      SELECT count(*)::int as count FROM pg_policies WHERE schemaname = 'public';
    `;
    const [appFunctions] = await sql`
      SELECT count(*)::int as count
      FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'app';
    `;

    console.log(`  Tables in public:     ${tables.count}`);
    console.log(`  Indexes in public:    ${indexes.count}`);
    console.log(`  Constraints in public:${constraints.count}`);
    console.log(`  RLS Policies:         ${policies.count}`);
    console.log(`  Functions in 'app':   ${appFunctions.count}`);

    // Step 5: Test Multi-Tenant RLS & Recursion Behavior
    console.log("\n5. Testing Multi-Tenant Matrix & Phase 5D RLS...");

    const orgA = randomUUID();
    const orgB = randomUUID();
    const roleA = randomUUID();
    const roleB = randomUUID();
    const userA = randomUUID();
    const userB = randomUUID();

    await sql`
      INSERT INTO auth.users (id, email) VALUES
        (${userA}, 'userA@rehearsal.local'),
        (${userB}, 'userB@rehearsal.local')
    `;
    await sql`
      INSERT INTO organizations (organization_id, organization_name, slug, code_prefix) VALUES
        (${orgA}, 'Tenant Alpha', 'tenant-alpha', 'TNA'),
        (${orgB}, 'Tenant Beta', 'tenant-beta', 'TNB')
    `;
    await sql`
      INSERT INTO roles (role_id, organization_id, role_name, role_key, permissions) VALUES
        (${roleA}, ${orgA}, 'Owner', 'owner', ${sql.json({ "*": ["*"] })}),
        (${roleB}, ${orgB}, 'Owner', 'owner', ${sql.json({ "*": ["*"] })})
    `;
    await sql`
      INSERT INTO users (user_id, organization_id, role_id, first_name, email, status) VALUES
        (${userA}, ${orgA}, ${roleA}, 'Alice', 'userA@rehearsal.local', 'active'),
        (${userB}, ${orgB}, ${roleB}, 'Bob', 'userB@rehearsal.local', 'active')
    `;

    const projA = randomUUID();
    const projB = randomUUID();
    await sql`
      INSERT INTO projects (project_id, organization_id, project_name, project_code, visibility) VALUES
        (${projA}, ${orgA}, 'Project Alpha', 'TNA-001', 'internal'),
        (${projB}, ${orgB}, 'Project Beta', 'TNB-001', 'internal')
    `;

    // Execute as authenticated User A
    const userASeen = await sql.begin(async (tx) => {
      await tx`SELECT set_config('role', 'authenticated', true)`;
      await tx`SELECT set_config('search_path', 'public, app', true)`;
      const jwt = JSON.stringify({ sub: userA, role: "authenticated", organization_id: orgA });
      await tx`SELECT set_config('request.jwt.claims', ${jwt}, true)`;
      await tx`SELECT set_config('request.jwt.claim.sub', ${userA}, true)`;
      await tx`SET LOCAL ROLE authenticated`;

      return tx<{ project_id: string }[]>`SELECT project_id FROM projects`;
    });

    const seesOwn = userASeen.some((p) => p.project_id === projA);
    const seesForeign = userASeen.some((p) => p.project_id === projB);

    console.log(`  User A saw ${userASeen.length} project(s). Own visible: ${seesOwn}, Foreign visible: ${seesForeign}`);
    if (!seesOwn || seesForeign) {
      throw new Error(`Tenant isolation failure: seesOwn=${seesOwn}, seesForeign=${seesForeign}`);
    }

    // Anon blocked
    let anonBlocked = false;
    try {
      const anonRows = await sql.begin(async (tx) => {
        await tx`SELECT set_config('role', 'anon', true)`;
        await tx`SELECT set_config('search_path', 'public, app', true)`;
        await tx`SET LOCAL ROLE anon`;
        return tx`SELECT project_id FROM projects`;
      });
      anonBlocked = anonRows.length === 0;
    } catch (err: any) {
      anonBlocked = err.code === "42501";
    }
    console.log(`  Anon SELECT blocked: ${anonBlocked}`);
    if (!anonBlocked) {
      throw new Error("Anon SELECT was not blocked");
    }

    console.log("\n✓ All 19 migrations and RLS verification passed cleanly.");
  } finally {
    await sql.end();

    // Clean up disposable database
    console.log(`\n6. Dropping disposable database ${REHEARSAL_DB}...`);
    const cleanupSql = postgres(ADMIN_URL, { prepare: false });
    try {
      await cleanupSql.unsafe(`DROP DATABASE IF EXISTS ${REHEARSAL_DB};`);
      console.log(`  ✓ Database ${REHEARSAL_DB} dropped.`);
    } finally {
      await cleanupSql.end();
    }
  }

  console.log("\n================================================================================");
  console.log("WORKSTREAM 3 — REHEARSAL VERDICT: PASSED");
  console.log("================================================================================\n");
}

main().catch((err) => {
  console.error("Rehearsal failed:", err);
  process.exit(1);
});
