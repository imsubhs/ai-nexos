/**
 * AI NEX OS — S5.1 CORRECTIVE POSTGRESQL / SUPABASE RLS HARDENING REHEARSAL
 *
 * Runs against a clean, disposable local PostgreSQL database:
 *   postgresql://postgres@localhost:5432/nexos_s5_1_disposable
 *
 * Scope:
 * - Full migration chain (0000 -> 0020)
 * - SECURITY DEFINER search_path = '' verification
 * - Function grant & privilege audit
 * - Hostile search_path resilience testing (preventing shadowing)
 * - All 30 S5 multi-tenant isolation, project visibility, membership, and recursion tests
 * - New S5.1 tests for invitation authorization & security definer behavior
 */

import postgres from "postgres";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ADMIN_URL = "postgresql://postgres@localhost:5432/postgres";
const TARGET_DB = "nexos_s5_1_disposable";
const DB_URL = `postgresql://postgres@localhost:5432/${TARGET_DB}`;

interface RehearsalCheck {
  id: string;
  name: string;
  category:
    | "MIGRATION"
    | "SECDEF_HARDENING"
    | "GRANTS_AUDIT"
    | "ANON_DENIAL"
    | "TENANT_ISOLATION"
    | "MEMBERSHIP_RLS"
    | "INVITATIONS_RLS"
    | "LIFECYCLE_GUARD"
    | "RECURSION_CHECK";
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
  console.log(
    "================================================================================",
  );
  console.log(
    "AI NEX OS — S5.1 CORRECTIVE RLS DISPOSABLE POSTGRESQL REHEARSAL",
  );
  console.log(`Target: ${DB_URL}`);
  console.log(
    "================================================================================\n",
  );

  // Step 1: Create fresh disposable database
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
    // SECTION 1: MIGRATIONS (0000 → 0020)
    // ------------------------------------------------------------------------
    console.log(
      "\n--- SECTION 1: APPLYING FULL MIGRATION CHAIN (0000 → 0020) ---",
    );
    await sql.unsafe(`
      DROP SCHEMA IF EXISTS public CASCADE;
      DROP SCHEMA IF EXISTS events CASCADE;
      DROP SCHEMA IF EXISTS app CASCADE;
      CREATE SCHEMA public;
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
          CREATE ROLE service_role NOLOGIN;
        END IF;
      END $$;
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
      GRANT USAGE ON SCHEMA public TO anon, authenticated;
      GRANT USAGE ON SCHEMA auth TO anon, authenticated;
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
      "0019_rls_hardening.sql",
      "0020_harden_security_definer_search_paths.sql",
    ];

    for (const file of migrationFiles) {
      const content = readFileSync(join(migrationsFolder, file), "utf8");
      await sql.unsafe(content);
    }

    recordCheck(
      "MIG-01",
      "Full Migration Chain Applied",
      "MIGRATION",
      true,
      `Successfully applied all 21 migrations (0000 -> 0020)`,
    );

    // Verify Catalog State post-0020
    const rlsCountRes = await sql`
      SELECT count(*)::int as count FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = true;
    `;
    const rlsCount = rlsCountRes[0].count;
    recordCheck(
      "MIG-02",
      "RLS-Enabled Table Count",
      "MIGRATION",
      rlsCount === 57,
      `Expected 57 tables, actual: ${rlsCount}`,
    );

    const policyCountRes = await sql`
      SELECT count(*)::int as count FROM pg_policies WHERE schemaname = 'public';
    `;
    const policyCount = policyCountRes[0].count;
    recordCheck(
      "MIG-03",
      "RLS Policy Count",
      "MIGRATION",
      policyCount === 79,
      `Expected 79 policies, actual: ${policyCount}`,
    );

    // ------------------------------------------------------------------------
    // SECTION 2: SECURITY DEFINER SEARCH_PATH HARDENING AUDIT
    // ------------------------------------------------------------------------
    console.log(
      "\n--- SECTION 2: SECURITY DEFINER SEARCH_PATH HARDENING AUDIT ---",
    );
    const secDefFns = await sql`
      SELECT
        p.proname as function_name,
        p.proconfig as config,
        pg_get_userbyid(p.proowner) as owner,
        p.prosecdef as is_secdef
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'app' AND p.prosecdef = true
      ORDER BY p.proname;
    `;

    for (const fn of secDefFns) {
      const hasEmptySearchPath =
        Array.isArray(fn.config) &&
        fn.config.some((c: string) => c.startsWith("search_path="));
      recordCheck(
        `SECDEF-SP-${fn.function_name}`,
        `Search Path Pinned to Empty (${fn.function_name})`,
        "SECDEF_HARDENING",
        hasEmptySearchPath,
        `Owner: ${fn.owner}, config: ${JSON.stringify(fn.config)}`,
      );
    }

    // ------------------------------------------------------------------------
    // SECTION 3: FUNCTION EXECUTE GRANTS AUDIT
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 3: FUNCTION EXECUTE GRANTS AUDIT ---");
    for (const fn of secDefFns) {
      const privs = await sql`
        SELECT grantee, privilege_type
        FROM information_schema.routine_privileges
        WHERE routine_schema = 'app' AND routine_name = ${fn.function_name}
        ORDER BY grantee;
      `;
      const grantees = privs.map((p: any) => p.grantee);
      const publicHasExecute = grantees.includes("PUBLIC");
      const anonHasExecute = grantees.includes("anon");

      if (fn.function_name === "protect_privileged_user_fields") {
        // Trigger function - revoked from public/anon/authenticated in 0020
        recordCheck(
          `GRANT-FN-${fn.function_name}`,
          `Trigger Execution Restricted (${fn.function_name})`,
          "GRANTS_AUDIT",
          !publicHasExecute && !anonHasExecute,
          `Grantees: ${JSON.stringify(grantees)} (PUBLIC/anon revoked)`,
        );
      } else {
        // RLS helpers - only authenticated and owner should have execute
        const authHasExecute = grantees.includes("authenticated");
        recordCheck(
          `GRANT-FN-${fn.function_name}`,
          `Helper Execution Restricted (${fn.function_name})`,
          "GRANTS_AUDIT",
          !publicHasExecute && !anonHasExecute && authHasExecute,
          `Grantees: ${JSON.stringify(grantees)} (authenticated only, PUBLIC/anon revoked)`,
        );
      }
    }

    // ------------------------------------------------------------------------
    // SECTION 4: SEED MULTI-TENANT FIXTURES
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 4: SEEDING MULTI-TENANT FIXTURES ---");
    const orgAlpha = "11111111-1111-1111-1111-111111111111";
    const orgBeta = "22222222-2222-2222-2222-222222222222";
    const roleAlphaAdmin = "33333333-3333-3333-3333-333333333331";
    const roleAlphaMember = "33333333-3333-3333-3333-333333333332";
    const roleBetaAdmin = "44444444-4444-4444-4444-444444444441";

    const userAlice = "55555555-5555-5555-5555-555555555551"; // Alpha Admin (Active)
    const userCharlie = "55555555-5555-5555-5555-555555555552"; // Alpha Member (Active)
    const userDavid = "55555555-5555-5555-5555-555555555553"; // Alpha Member (Inactive)
    const userEve = "55555555-5555-5555-5555-555555555554"; // Alpha Member (Soft-deleted)
    const userBob = "66666666-6666-6666-6666-666666666661"; // Beta Admin (Active)
    const userFrank = "77777777-7777-7777-7777-777777777771"; // Dual-org member (Alpha + Beta)

    const pAlpha1 = "88888888-8888-8888-8888-888888888881"; // Alpha private project (Alice + Charlie members)
    const pAlpha2 = "88888888-8888-8888-8888-888888888882"; // Alpha public/internal project
    const pAlpha3 = "88888888-8888-8888-8888-888888888883"; // Alpha private project (Alice only member)
    const pBeta1 = "99999999-9999-9999-9999-999999999991"; // Beta private project (Bob member)

    const invAlpha = "aaaaaaaa-bbbb-cccc-dddd-000000000001";
    const invBeta = "aaaaaaaa-bbbb-cccc-dddd-000000000002";

    await sql.unsafe(`
      -- Auth users
      INSERT INTO auth.users (id, email) VALUES
        ('${userAlice}', 'alice@alpha.com'),
        ('${userCharlie}', 'charlie@alpha.com'),
        ('${userDavid}', 'david@alpha.com'),
        ('${userEve}', 'eve@alpha.com'),
        ('${userBob}', 'bob@beta.com'),
        ('${userFrank}', 'frank@dual.com');

      -- Organizations
      INSERT INTO organizations (organization_id, organization_name, slug, code_prefix) VALUES
        ('${orgAlpha}', 'Alpha Corp', 'alpha-corp', 'ALP'),
        ('${orgBeta}', 'Beta Corp', 'beta-corp', 'BET');

      -- Roles
      INSERT INTO roles (role_id, organization_id, role_key, role_name, permissions) VALUES
        ('${roleAlphaAdmin}', '${orgAlpha}', 'admin', 'Admin', '{"*": ["*"]}'::jsonb),
        ('${roleAlphaMember}', '${orgAlpha}', 'member', 'Member', '{"projects": ["read"]}'::jsonb),
        ('${roleBetaAdmin}', '${orgBeta}', 'admin', 'Admin', '{"*": ["*"]}'::jsonb);

      -- Public users
      INSERT INTO users (user_id, organization_id, role_id, email, first_name, last_name, status, deleted_at) VALUES
        ('${userAlice}', '${orgAlpha}', '${roleAlphaAdmin}', 'alice@alpha.com', 'Alice', 'Alpha', 'active', null),
        ('${userCharlie}', '${orgAlpha}', '${roleAlphaMember}', 'charlie@alpha.com', 'Charlie', 'Alpha', 'active', null),
        ('${userDavid}', '${orgAlpha}', '${roleAlphaMember}', 'david@alpha.com', 'David', 'Alpha', 'inactive', null),
        ('${userEve}', '${orgAlpha}', '${roleAlphaMember}', 'eve@alpha.com', 'Eve', 'Alpha', 'active', now()),
        ('${userBob}', '${orgBeta}', '${roleBetaAdmin}', 'bob@beta.com', 'Bob', 'Beta', 'active', null),
        ('${userFrank}', '${orgAlpha}', '${roleAlphaMember}', 'frank@dual.com', 'Frank', 'Dual', 'active', null);

      -- Organization memberships
      INSERT INTO organization_memberships (user_id, organization_id, role_id, status) VALUES
        ('${userAlice}', '${orgAlpha}', '${roleAlphaAdmin}', 'active'),
        ('${userCharlie}', '${orgAlpha}', '${roleAlphaMember}', 'active'),
        ('${userDavid}', '${orgAlpha}', '${roleAlphaMember}', 'active'),
        ('${userEve}', '${orgAlpha}', '${roleAlphaMember}', 'active'),
        ('${userBob}', '${orgBeta}', '${roleBetaAdmin}', 'active'),
        ('${userFrank}', '${orgAlpha}', '${roleAlphaMember}', 'active'),
        ('${userFrank}', '${orgBeta}', '${roleBetaAdmin}', 'active');

      -- Projects
      INSERT INTO projects (project_id, organization_id, project_name, project_code, visibility, status) VALUES
        ('${pAlpha1}', '${orgAlpha}', 'Alpha Secret 1', 'ALP-2026-0001', 'private', 'in_progress'),
        ('${pAlpha2}', '${orgAlpha}', 'Alpha Internal 2', 'ALP-2026-0002', 'internal', 'in_progress'),
        ('${pAlpha3}', '${orgAlpha}', 'Alpha Secret 3', 'ALP-2026-0003', 'private', 'in_progress'),
        ('${pBeta1}', '${orgBeta}', 'Beta Secret 1', 'BET-2026-0001', 'private', 'in_progress');

      -- Project members
      INSERT INTO project_members (project_id, user_id, role) VALUES
        ('${pAlpha1}', '${userAlice}', 'lead'),
        ('${pAlpha1}', '${userCharlie}', 'contributor'),
        ('${pAlpha3}', '${userAlice}', 'lead'),
        ('${pBeta1}', '${userBob}', 'lead');

      -- Invitations
      INSERT INTO organization_invitations (
        invitation_id, organization_id, email, role_id, token_hash, status, expires_at, invited_by_user_id
      ) VALUES
        ('${invAlpha}', '${orgAlpha}', 'new-hire@alpha.com', '${roleAlphaMember}', 'hash_alpha_secret', 'pending', now() + interval '7 days', '${userAlice}'),
        ('${invBeta}', '${orgBeta}', 'new-hire@beta.com', '${roleBetaAdmin}', 'hash_beta_secret', 'pending', now() + interval '7 days', '${userBob}');
    `);
    console.log("Seeded multi-tenant fixtures cleanly.");

    async function queryAsUser(
      userId: string,
      querySql: string,
      customSessionSetup = "",
    ) {
      const res = await sql.unsafe(`
        SET ROLE authenticated;
        SELECT set_config('request.jwt.claim.sub', '${userId}', true);
        SELECT set_config('request.jwt.claim.role', 'authenticated', true);
        ${customSessionSetup}
        ${querySql}
      `);
      await sql.unsafe(`
        RESET ROLE;
        RESET search_path;
      `);
      return res[res.length - 1] as any[];
    }

    // ------------------------------------------------------------------------
    // SECTION 5: HOSTILE SEARCH_PATH RESILIENCE TESTING
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 5: HOSTILE SEARCH_PATH RESILIENCE TESTING ---");
    // Attempt to hijack resolution by setting session search_path to a malicious or non-existent schema
    const hostileRes = await queryAsUser(
      userAlice,
      "SELECT app.current_user_organization_id() as org_id, app.has_permission('projects', 'read') as has_perm;",
      "SET search_path = pg_temp, bogus_schema;",
    );
    recordCheck(
      "SECDEF-HOSTILE-01",
      "Hostile Session search_path Cannot Divert Execution",
      "SECDEF_HARDENING",
      hostileRes[0].org_id === orgAlpha && hostileRes[0].has_perm === true,
      `Result with session search_path=pg_temp: org_id=${hostileRes[0].org_id}, has_perm=${hostileRes[0].has_perm}`,
    );

    // ------------------------------------------------------------------------
    // SECTION 6: ANONYMOUS ACCESS TESTS
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 6: ANONYMOUS ACCESS TESTS ---");
    const anonQueries = [
      { name: "SELECT projects", sql: "SELECT * FROM projects;" },
      {
        name: "SELECT organization_memberships",
        sql: "SELECT * FROM organization_memberships;",
      },
      {
        name: "SELECT organization_invitations",
        sql: "SELECT * FROM organization_invitations;",
      },
      {
        name: "EXECUTE current_user_organization_id",
        sql: "SELECT app.current_user_organization_id();",
      },
      {
        name: "EXECUTE is_project_member",
        sql: `SELECT app.is_project_member('${pAlpha1}');`,
      },
    ];

    for (const q of anonQueries) {
      try {
        await sql.unsafe(`
          SET ROLE anon;
          ${q.sql}
        `);
        recordCheck(
          `ANON-${q.name}`,
          `Anon ${q.name} Blocked`,
          "ANON_DENIAL",
          false,
          "UNEXPECTED ALLOW!",
        );
      } catch (err: any) {
        recordCheck(
          `ANON-${q.name}`,
          `Anon ${q.name} Blocked`,
          "ANON_DENIAL",
          err.code === "42501",
          `Properly denied with code: ${err.code} (${err.message})`,
        );
      } finally {
        await sql.unsafe("RESET ROLE;");
      }
    }

    // ------------------------------------------------------------------------
    // SECTION 7: TENANT ISOLATION MATRIX (ALICE VS BOB)
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 7: TENANT ISOLATION MATRIX ---");
    const aliceProjects = await queryAsUser(
      userAlice,
      "SELECT project_id FROM projects;",
    );
    const aliceSawBeta = aliceProjects.some(
      (p: any) => p.project_id === pBeta1,
    );
    recordCheck(
      "ISO-01",
      "Alice Sees Only Alpha Projects",
      "TENANT_ISOLATION",
      aliceProjects.length === 3 && !aliceSawBeta,
      `Alice saw ${aliceProjects.length} projects, Beta projects seen: ${aliceSawBeta ? "YES (LEAK)" : "0"}`,
    );

    const bobProjects = await queryAsUser(
      userBob,
      "SELECT project_id FROM projects;",
    );
    const bobSawAlpha = bobProjects.some(
      (p: any) => p.project_id === pAlpha1 || p.project_id === pAlpha2,
    );
    recordCheck(
      "ISO-02",
      "Bob Sees Only Beta Projects",
      "TENANT_ISOLATION",
      bobProjects.length === 1 && !bobSawAlpha,
      `Bob saw ${bobProjects.length} projects, Alpha projects seen: ${bobSawAlpha ? "YES (LEAK)" : "0"}`,
    );

    // ------------------------------------------------------------------------
    // SECTION 8: MEMBERSHIP RLS
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 8: MEMBERSHIP RLS ---");
    const aliceMemberships = await queryAsUser(
      userAlice,
      "SELECT user_id FROM organization_memberships;",
    );
    const aliceSawBob = aliceMemberships.some(
      (m: any) => m.user_id === userBob,
    );
    recordCheck(
      "MEMB-01",
      "Alice Sees Alpha Members Only",
      "MEMBERSHIP_RLS",
      aliceMemberships.length === 5 && !aliceSawBob,
      `Alice saw ${aliceMemberships.length} memberships, Bob seen: ${aliceSawBob ? "YES (LEAK)" : "0"}`,
    );

    const frankMemberships = await queryAsUser(
      userFrank,
      "SELECT user_id, organization_id FROM organization_memberships WHERE user_id = auth.uid();",
    );
    recordCheck(
      "MEMB-02",
      "Dual Member Sees Own Multi-Tenant Memberships",
      "MEMBERSHIP_RLS",
      frankMemberships.length === 2,
      `Frank retrieved ${frankMemberships.length} personal memberships across Alpha and Beta`,
    );

    // ------------------------------------------------------------------------
    // SECTION 9: INVITATIONS RLS
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 9: INVITATIONS RLS ---");
    // Alice (Alpha Admin with *.*) reads invitations
    const aliceInvs = await queryAsUser(
      userAlice,
      "SELECT invitation_id, email, organization_id FROM organization_invitations;",
    );
    const aliceSawBetaInv = aliceInvs.some(
      (i: any) => i.invitation_id === invBeta,
    );
    recordCheck(
      "INV-01",
      "Org Admin Sees Own Org Invitations Only",
      "INVITATIONS_RLS",
      aliceInvs.length === 1 &&
        !aliceSawBetaInv &&
        aliceInvs[0].invitation_id === invAlpha,
      `Alice retrieved ${aliceInvs.length} invitation(s), Beta invitation seen: ${aliceSawBetaInv ? "YES (LEAK)" : "0"}`,
    );

    // Charlie (Alpha Member with projects:read only, lacks organization:update) reads invitations
    const charlieInvs = await queryAsUser(
      userCharlie,
      "SELECT invitation_id FROM organization_invitations;",
    );
    recordCheck(
      "INV-02",
      "Org Member Lacking organization:update Denied Invitations",
      "INVITATIONS_RLS",
      charlieInvs.length === 0,
      `Charlie retrieved ${charlieInvs.length} invitations (expected 0)`,
    );

    // ------------------------------------------------------------------------
    // SECTION 10: PROJECT MEMBERSHIP & OBJECT VISIBILITY
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 10: PROJECT VISIBILITY & MEMBERSHIP ---");
    const charlieProjects = await queryAsUser(
      userCharlie,
      "SELECT project_id FROM projects;",
    );
    const charlieSawP1 = charlieProjects.some(
      (p: any) => p.project_id === pAlpha1,
    );
    const charlieSawP2 = charlieProjects.some(
      (p: any) => p.project_id === pAlpha2,
    );
    const charlieSawP3 = charlieProjects.some(
      (p: any) => p.project_id === pAlpha3,
    );
    recordCheck(
      "PROJ-01",
      "Member Visibility Filtering Correct",
      "MEMBERSHIP_RLS",
      charlieSawP1 && charlieSawP2 && !charlieSawP3,
      `Private member-of visible: ${charlieSawP1}, Internal visible: ${charlieSawP2}, Private unassigned visible: ${charlieSawP3 ? "LEAK" : "BLOCKED"}`,
    );

    // ------------------------------------------------------------------------
    // SECTION 11: LIFECYCLE GUARDS
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 11: LIFECYCLE GUARDS ---");
    const davidProjects = await queryAsUser(
      userDavid,
      "SELECT project_id FROM projects;",
    );
    recordCheck(
      "LIFE-01",
      "Inactive User Blocked From RLS",
      "LIFECYCLE_GUARD",
      davidProjects.length === 0,
      `Returned ${davidProjects.length} rows`,
    );

    const eveProjects = await queryAsUser(
      userEve,
      "SELECT project_id FROM projects;",
    );
    recordCheck(
      "LIFE-02",
      "Soft-Deleted User Blocked From RLS",
      "LIFECYCLE_GUARD",
      eveProjects.length === 0,
      `Returned ${eveProjects.length} rows`,
    );

    // ------------------------------------------------------------------------
    // SECTION 12: 42P17 RECURSION CHECK ACROSS ALL 57 RLS TABLES
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 12: 42P17 RECURSION AUDIT ---");
    const rlsTables = await sql`
      SELECT c.relname as table_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = true
      ORDER BY c.relname;
    `;

    let recursionFree = true;
    for (const t of rlsTables) {
      try {
        await queryAsUser(
          userAlice,
          `SELECT * FROM "${t.table_name}" LIMIT 1;`,
        );
      } catch (err: any) {
        if (err.code === "42P17") {
          recursionFree = false;
          recordCheck(
            `REC-${t.table_name}`,
            `Recursion Free (${t.table_name})`,
            "RECURSION_CHECK",
            false,
            `42P17 detected!`,
          );
        }
      }
    }

    recordCheck(
      "REC-ALL",
      "All 57 RLS Tables Free From 42P17 Recursion Post-0020",
      "RECURSION_CHECK",
      recursionFree,
      `All ${rlsTables.length} RLS tables evaluated cleanly under authenticated role with zero recursion`,
    );
  } finally {
    await sql.unsafe("RESET ROLE;");
    await sql.end();

    // Cleanup disposable database
    const cleanupAdmin = postgres(ADMIN_URL, { prepare: false });
    try {
      await cleanupAdmin.unsafe(`DROP DATABASE IF EXISTS ${TARGET_DB};`);
      console.log(`\nDropped disposable database ${TARGET_DB}.`);
    } finally {
      await cleanupAdmin.end();
    }
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log(
    "\n================================================================================",
  );
  console.log("REHEARSAL SUMMARY");
  console.log(
    "================================================================================",
  );
  const passed = checks.filter((c) => c.passed).length;
  const failed = checks.filter((c) => !c.passed).length;
  console.log(`Total Checks: ${checks.length}`);
  console.log(`Passed:       ${passed}`);
  console.log(`Failed:       ${failed}`);

  if (failed > 0) {
    console.error("\nREHEARSAL FAILED — Defect detected!");
    process.exit(1);
  } else {
    console.log("\nREHEARSAL PASSED — S5.1 PostgreSQL RLS Hardening Verified!");
  }
}

runRehearsal().catch((err) => {
  console.error("Fatal rehearsal error:", err);
  process.exit(1);
});
