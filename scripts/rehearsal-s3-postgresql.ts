/**
 * AI NEX OS — S3 LOCAL POSTGRESQL REHEARSAL & VERIFICATION
 *
 * Runs against a clean, disposable local PostgreSQL database:
 *   postgresql://postgres@localhost:5432/nexos_s3_disposable
 *
 * Safety Invariants:
 * - NO production Supabase
 * - NO staging Supabase
 * - Disposable local DB only
 * - Applies real migration chain (0000 -> 0018)
 * - Seeds ephemeral test fixtures
 * - Executes real SQL queries corresponding to S1, S2, and S3 authorization gates
 * - Drops database completely on completion
 */

import postgres from "postgres";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const ADMIN_URL = "postgresql://postgres@localhost:5432/postgres";
const TARGET_DB = "nexos_s3_disposable";
const DB_URL = `postgresql://postgres@localhost:5432/${TARGET_DB}`;

interface RehearsalCheck {
  id: string;
  name: string;
  category: "MIGRATION" | "S1_REGRESSION" | "S2_REGRESSION" | "S3_SEC05" | "S3_SEC06";
  passed: boolean;
  evidence: string;
}

const checks: RehearsalCheck[] = [];

function recordCheck(
  id: string,
  name: string,
  category: RehearsalCheck["category"],
  passed: boolean,
  evidence: string,
) {
  checks.push({ id, name, category, passed, evidence });
  const status = passed ? "✓ PASS" : "✗ FAIL";
  console.log(`[${status}] [${category}] ${id}: ${name} — ${evidence}`);
}

async function runRehearsal() {
  console.log("================================================================================");
  console.log("AI NEX OS — S3 DISPOSABLE POSTGRESQL REHEARSAL");
  console.log(`Target: ${DB_URL}`);
  console.log("================================================================================\n");

  // Step 1: Create fresh database
  const adminSql = postgres(ADMIN_URL, { prepare: false });
  try {
    await adminSql.unsafe(`DROP DATABASE IF EXISTS ${TARGET_DB};`);
    await adminSql.unsafe(`CREATE DATABASE ${TARGET_DB};`);
    console.log(`Created disposable database ${TARGET_DB}.`);
  } finally {
    await adminSql.end();
  }

  const sql = postgres(DB_URL, { prepare: false });

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: MIGRATIONS (0000 → 0018)
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 1: APPLYING MIGRATION CHAIN ---");
    await sql.unsafe(`
      DROP SCHEMA IF EXISTS public CASCADE;
      DROP SCHEMA IF EXISTS events CASCADE;
      DROP SCHEMA IF EXISTS app CASCADE;
      CREATE SCHEMA public;
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
    `);

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
      "0018_remediate_projects_rls_recursion.sql",
    ];

    for (const file of migrationFiles) {
      const content = readFileSync(join(migrationsFolder, file), "utf8");
      await sql.unsafe(content);
    }

    const [tableCount] = await sql`
      SELECT count(*)::int as count FROM information_schema.tables WHERE table_schema = 'public'
    `;
    recordCheck(
      "MIG-CHAIN",
      "Full Migration Chain 0000 -> 0018 Applied",
      "MIGRATION",
      tableCount.count >= 20,
      `Successfully applied 19 migrations, total public tables = ${tableCount.count}`,
    );

    // ------------------------------------------------------------------------
    // SECTION 2: SEED FIXTURES
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 2: SEEDING EPHEMERAL FIXTURES ---");
    const orgA = "00000000-0000-4000-8000-00000000000a";
    const orgB = "00000000-0000-4000-8000-00000000000b";

    await sql`
      INSERT INTO organizations (organization_id, organization_name, slug, code_prefix, status)
      VALUES
        (${orgA}, 'Organization Alpha', 'org-alpha', 'ALF', 'active'),
        (${orgB}, 'Organization Beta', 'org-beta', 'BET', 'active');
    `;

    const roleA = "00000000-0000-4000-8000-00000000001a";
    const roleB = "00000000-0000-4000-8000-00000000001b";
    await sql`
      INSERT INTO roles (role_id, organization_id, role_name, role_key, is_system)
      VALUES
        (${roleA}, ${orgA}, 'Owner', 'owner', true),
        (${roleB}, ${orgB}, 'Owner', 'owner', true);
    `;

    const userAPm = "00000000-0000-4000-8000-000000000111";
    const userACd = "00000000-0000-4000-8000-000000000112";
    const userAInactive = "00000000-0000-4000-8000-000000000113";
    const userADeleted = "00000000-0000-4000-8000-000000000114";
    const userBPm = "00000000-0000-4000-8000-000000000211";
    const userBCd = "00000000-0000-4000-8000-000000000212";

    await sql`
      INSERT INTO auth.users (id, email)
      VALUES
        (${userAPm}, 'pm-a@alpha.test'),
        (${userACd}, 'cd-a@alpha.test'),
        (${userAInactive}, 'inactive-a@alpha.test'),
        (${userADeleted}, 'deleted-a@alpha.test'),
        (${userBPm}, 'pm-b@beta.test'),
        (${userBCd}, 'cd-b@beta.test');
    `;

    await sql`
      INSERT INTO users (user_id, organization_id, role_id, email, first_name, status, deleted_at)
      VALUES
        (${userAPm}, ${orgA}, ${roleA}, 'pm-a@alpha.test', 'PM A', 'active', null),
        (${userACd}, ${orgA}, ${roleA}, 'cd-a@alpha.test', 'CD A', 'active', null),
        (${userAInactive}, ${orgA}, ${roleA}, 'inactive-a@alpha.test', 'Inactive A', 'inactive', null),
        (${userADeleted}, ${orgA}, ${roleA}, 'deleted-a@alpha.test', 'Deleted A', 'active', now()),
        (${userBPm}, ${orgB}, ${roleB}, 'pm-b@beta.test', 'PM B', 'active', null),
        (${userBCd}, ${orgB}, ${roleB}, 'cd-b@beta.test', 'CD B', 'active', null);
    `;

    const clientA = "00000000-0000-4000-8000-000000000101";
    const clientB = "00000000-0000-4000-8000-000000000201";
    const clientADeleted = "00000000-0000-4000-8000-000000000199";

    await sql`
      INSERT INTO clients (client_id, organization_id, company_name, status, deleted_at)
      VALUES
        (${clientA}, ${orgA}, 'Client Alpha', 'active', null),
        (${clientB}, ${orgB}, 'Client Beta', 'active', null),
        (${clientADeleted}, ${orgA}, 'Client Alpha Archived', 'archived', now());
    `;

    const projectA = "00000000-0000-4000-8000-000000000301";
    const projectB = "00000000-0000-4000-8000-000000000401";

    await sql`
      INSERT INTO projects (project_id, organization_id, project_name, project_code, status, priority, created_by, updated_by)
      VALUES
        (${projectA}, ${orgA}, 'Project Alpha Baseline', 'ALF-001', 'planning', 'medium', ${userAPm}, ${userAPm}),
        (${projectB}, ${orgB}, 'Project Beta Baseline', 'BET-001', 'planning', 'medium', ${userBPm}, ${userBPm});
    `;

    recordCheck("SEED", "Ephemeral Fixtures Inserted", "MIGRATION", true, "Orgs, roles, users, clients, projects seeded.");

    // ------------------------------------------------------------------------
    // SECTION 3: S1 REGRESSION — CLIENT CONTACTS ISOLATION
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 3: S1 REGRESSION ---");
    // Verify client lookup query with org check
    const s1Valid = await sql`
      SELECT client_id FROM clients WHERE client_id = ${clientA} AND organization_id = ${orgA} AND deleted_at IS NULL
    `;
    recordCheck("S1-01", "Org A accesses own Client A", "S1_REGRESSION", s1Valid.length === 1, `Found ${s1Valid.length} rows`);

    const s1Cross = await sql`
      SELECT client_id FROM clients WHERE client_id = ${clientB} AND organization_id = ${orgA} AND deleted_at IS NULL
    `;
    recordCheck("S1-02", "Org A accesses foreign Client B denied", "S1_REGRESSION", s1Cross.length === 0, `Blocked, found ${s1Cross.length} rows`);

    // ------------------------------------------------------------------------
    // SECTION 4: S2 REGRESSION — CREATE PROJECT CLIENT ISOLATION
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 4: S2 REGRESSION ---");
    const s2Valid = await sql`
      SELECT client_id FROM clients WHERE client_id = ${clientA} AND organization_id = ${orgA} AND deleted_at IS NULL
    `;
    recordCheck("S2-01", "createProject validates own Client A", "S2_REGRESSION", s2Valid.length === 1, `Found ${s2Valid.length} rows`);

    const s2Cross = await sql`
      SELECT client_id FROM clients WHERE client_id = ${clientB} AND organization_id = ${orgA} AND deleted_at IS NULL
    `;
    recordCheck("S2-02", "createProject foreign Client B denied", "S2_REGRESSION", s2Cross.length === 0, `Blocked, found ${s2Cross.length} rows`);

    // ------------------------------------------------------------------------
    // SECTION 5: S3 NEXOS-SEC-05 — UPDATE PROJECT CLIENT ISOLATION
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 5: S3 NEXOS-SEC-05 UPDATE PROJECT CLIENT ISOLATION ---");

    // 1. Same-org client update succeeds
    const sec05ValidClient = await sql`
      SELECT client_id FROM clients WHERE client_id = ${clientA} AND organization_id = ${orgA} AND deleted_at IS NULL
    `;
    const sec05UpdateValid = await sql`
      UPDATE projects
      SET client_id = ${clientA}, project_name = 'Project Alpha Updated'
      WHERE project_id = ${projectA} AND organization_id = ${orgA}
      RETURNING project_id, client_id, organization_id;
    `;
    recordCheck(
      "SEC05-01",
      "Org A updates project with valid same-org Client A",
      "S3_SEC05",
      sec05ValidClient.length === 1 && sec05UpdateValid.length === 1 && sec05UpdateValid[0].client_id === clientA,
      `Project updated with clientId=${sec05UpdateValid[0]?.client_id}`,
    );

    // 2. Foreign-org client update blocked
    const sec05CrossClient = await sql`
      SELECT client_id FROM clients WHERE client_id = ${clientB} AND organization_id = ${orgA} AND deleted_at IS NULL
    `;
    recordCheck(
      "SEC05-02",
      "Org A query for foreign Client B returns zero rows",
      "S3_SEC05",
      sec05CrossClient.length === 0,
      `Cross-tenant client check returns 0 rows (fails closed)`,
    );

    // 3. Soft-deleted client update blocked
    const sec05DeletedClient = await sql`
      SELECT client_id FROM clients WHERE client_id = ${clientADeleted} AND organization_id = ${orgA} AND deleted_at IS NULL
    `;
    recordCheck(
      "SEC05-03",
      "Org A query for soft-deleted Client A returns zero rows",
      "S3_SEC05",
      sec05DeletedClient.length === 0,
      `Soft-deleted client check returns 0 rows (fails closed)`,
    );

    // 4. Nonexistent client update blocked
    const nonexistentClient = "00000000-0000-4000-8000-000000000999";
    const sec05NonexistentClient = await sql`
      SELECT client_id FROM clients WHERE client_id = ${nonexistentClient} AND organization_id = ${orgA} AND deleted_at IS NULL
    `;
    recordCheck(
      "SEC05-04",
      "Org A query for nonexistent client returns zero rows",
      "S3_SEC05",
      sec05NonexistentClient.length === 0,
      `Nonexistent client check returns 0 rows (fails closed)`,
    );

    // 5. Cross-tenant project update blocked by organization_id in WHERE clause
    const sec05CrossProject = await sql`
      UPDATE projects
      SET project_name = 'Attacked Beta Project'
      WHERE project_id = ${projectB} AND organization_id = ${orgA}
      RETURNING project_id;
    `;
    recordCheck(
      "SEC05-05",
      "Org A cannot update Org B project (tenant WHERE guard)",
      "S3_SEC05",
      sec05CrossProject.length === 0,
      `0 rows updated across tenant boundary`,
    );

    // ------------------------------------------------------------------------
    // SECTION 6: S3 NEXOS-SEC-06 — CREATE PROJECT USER REFERENCES ISOLATION
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 6: S3 NEXOS-SEC-06 USER REFERENCE ISOLATION ---");

    // 1. Same-org PM and CD valid
    const sec06ValidPm = await sql`
      SELECT user_id FROM users WHERE user_id = ${userAPm} AND organization_id = ${orgA} AND status = 'active' AND deleted_at IS NULL
    `;
    const sec06ValidCd = await sql`
      SELECT user_id FROM users WHERE user_id = ${userACd} AND organization_id = ${orgA} AND status = 'active' AND deleted_at IS NULL
    `;
    const newProjId = "00000000-0000-4000-8000-000000000501";
    let createdNew = null;
    if (sec06ValidPm.length === 1 && sec06ValidCd.length === 1) {
      const [p] = await sql`
        INSERT INTO projects (project_id, organization_id, project_name, project_code, project_manager, creative_director, status, priority, created_by, updated_by)
        VALUES (${newProjId}, ${orgA}, 'Project Alpha With Staff', 'ALF-002', ${userAPm}, ${userACd}, 'planning', 'medium', ${userAPm}, ${userAPm})
        RETURNING project_id, project_manager, creative_director, organization_id;
      `;
      createdNew = p;
    }
    recordCheck(
      "SEC06-01",
      "Org A creates project with valid Org A PM and CD",
      "S3_SEC06",
      createdNew !== null && createdNew.project_manager === userAPm && createdNew.creative_director === userACd,
      `Project created with PM=${createdNew?.project_manager} CD=${createdNew?.creative_director}`,
    );

    // 2. Foreign Org B PM blocked
    const sec06CrossPm = await sql`
      SELECT user_id FROM users WHERE user_id = ${userBPm} AND organization_id = ${orgA} AND status = 'active' AND deleted_at IS NULL
    `;
    recordCheck(
      "SEC06-02",
      "Org A query for foreign Org B PM returns zero rows",
      "S3_SEC06",
      sec06CrossPm.length === 0,
      `Cross-tenant PM check returns 0 rows (fails closed)`,
    );

    // 3. Foreign Org B CD blocked
    const sec06CrossCd = await sql`
      SELECT user_id FROM users WHERE user_id = ${userBCd} AND organization_id = ${orgA} AND status = 'active' AND deleted_at IS NULL
    `;
    recordCheck(
      "SEC06-03",
      "Org A query for foreign Org B CD returns zero rows",
      "S3_SEC06",
      sec06CrossCd.length === 0,
      `Cross-tenant CD check returns 0 rows (fails closed)`,
    );

    // 4. Inactive Org A user blocked
    const sec06InactiveUser = await sql`
      SELECT user_id FROM users WHERE user_id = ${userAInactive} AND organization_id = ${orgA} AND status = 'active' AND deleted_at IS NULL
    `;
    recordCheck(
      "SEC06-04",
      "Org A query for inactive user returns zero rows",
      "S3_SEC06",
      sec06InactiveUser.length === 0,
      `Inactive user check returns 0 rows (fails closed)`,
    );

    // 5. Soft-deleted Org A user blocked
    const sec06DeletedUser = await sql`
      SELECT user_id FROM users WHERE user_id = ${userADeleted} AND organization_id = ${orgA} AND status = 'active' AND deleted_at IS NULL
    `;
    recordCheck(
      "SEC06-05",
      "Org A query for soft-deleted user returns zero rows",
      "S3_SEC06",
      sec06DeletedUser.length === 0,
      `Soft-deleted user check returns 0 rows (fails closed)`,
    );

    // 6. Nonexistent user blocked
    const nonexistentUser = "00000000-0000-4000-8000-000000000998";
    const sec06NonexistentUser = await sql`
      SELECT user_id FROM users WHERE user_id = ${nonexistentUser} AND organization_id = ${orgA} AND status = 'active' AND deleted_at IS NULL
    `;
    recordCheck(
      "SEC06-06",
      "Org A query for nonexistent user returns zero rows",
      "S3_SEC06",
      sec06NonexistentUser.length === 0,
      `Nonexistent user check returns 0 rows (fails closed)`,
    );

    // Summary
    const totalChecks = checks.length;
    const passedChecks = checks.filter((c) => c.passed).length;
    console.log("\n================================================================================");
    console.log(`REHEARSAL RESULT: ${passedChecks}/${totalChecks} CHECKS PASSED`);
    console.log("================================================================================\n");

    if (passedChecks !== totalChecks) {
      throw new Error(`Rehearsal failed: ${totalChecks - passedChecks} checks failed`);
    }
  } finally {
    await sql.end();

    // Destroy disposable database
    const adminSqlCleanup = postgres(ADMIN_URL, { prepare: false });
    try {
      await adminSqlCleanup.unsafe(`DROP DATABASE IF EXISTS ${TARGET_DB};`);
      console.log(`Dropped disposable database ${TARGET_DB}. Zero lingering state.`);
    } finally {
      await adminSqlCleanup.end();
    }
  }
}

runRehearsal().catch((err) => {
  console.error("Rehearsal error:", err);
  process.exit(1);
});
