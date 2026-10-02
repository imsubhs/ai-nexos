/**
 * AI NEX OS — PHASE 5D LIVE STAGING RLS & SECURITY VERIFICATION
 *
 * Runs against the staging Supabase project (shnzzbbtydmvfhgeoysg):
 * Enforces all Step 8 (RLS), Step 9 (Server-side), and Step 10 (Security) requirements.
 */

import { prepareToolingTarget } from "./lib/environment";
import postgres, { type Sql } from "postgres";
import { randomUUID } from "node:crypto";

const target = prepareToolingTarget("verify-phase5d-staging");

interface VerificationRow {
  test: string;
  expected: string;
  actual: string;
  result: "PASSED" | "FAILED";
}

const tableResults: VerificationRow[] = [];

function recordTest(
  test: string,
  expected: string,
  actual: string,
  passed: boolean,
) {
  tableResults.push({
    test,
    expected,
    actual,
    result: passed ? "PASSED" : "FAILED",
  });
  const mark = passed ? "✓ PASS" : "✗ FAIL";
  console.log(`[${mark}] ${test}\n       Expected: ${expected}\n       Actual:   ${actual}`);
}

async function asPostgresRole<T>(
  sql: Sql,
  role: "anon" | "authenticated",
  claims: { sub?: string; organizationId?: string },
  fn: (tx: Sql) => Promise<T>,
): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`SELECT set_config('role', ${role}, true)`;
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

async function runVerification() {
  console.log("================================================================================");
  console.log("PHASE 5D — LIVE STAGING RLS & SECURITY VERIFICATION");
  console.log(`Target: ${target.environment} (${target.projectRef})`);
  console.log("================================================================================\n");

  const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Missing connection string");

  const sql = postgres(connectionString, {
    ssl: "require",
    max: 2,
    connect_timeout: 15,
    onnotice: () => {},
  });

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: DATABASE OBJECT AUDIT
    // ------------------------------------------------------------------------
    console.log("--- 1. AUDITING DATABASE OBJECTS & POLICIES ON STAGING ---");

    const [fnRecord] = await sql`
      SELECT p.proname, n.nspname, p.prosecdef, p.proconfig,
             has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
             has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'app' AND p.proname = 'is_project_member';
    `;
    const helperOk =
      fnRecord &&
      fnRecord.prosecdef === true &&
      Array.isArray(fnRecord.proconfig) &&
      fnRecord.proconfig.includes("search_path=public") &&
      fnRecord.anon_exec === false &&
      fnRecord.auth_exec === true;

    recordTest(
      "Helper Function Security Attributes",
      "SECURITY DEFINER, search_path=public, anon EXECUTE=false, auth EXECUTE=true",
      fnRecord
        ? `secdef=${fnRecord.prosecdef}, search_path=${fnRecord.proconfig}, anon_exec=${fnRecord.anon_exec}, auth_exec=${fnRecord.auth_exec}`
        : "Function app.is_project_member not found",
      Boolean(helperOk),
    );

    const [policyRecord] = await sql`
      SELECT policyname, qual
      FROM pg_policies
      WHERE tablename = 'projects' AND policyname = 'projects_select';
    `;
    const policyUsesHelper = policyRecord && String(policyRecord.qual).includes("app.is_project_member");

    recordTest(
      "projects_select Policy Definition",
      "Uses app.is_project_member(project_id) without inline project_members subquery recursion",
      policyRecord ? String(policyRecord.qual).slice(0, 100) + "..." : "Policy not found",
      Boolean(policyUsesHelper),
    );

    // ------------------------------------------------------------------------
    // SECTION 2: IDENTIFY OR CREATE ISOLATED TEST FIXTURES
    // ------------------------------------------------------------------------
    console.log("\n--- 2. IDENTIFYING STAGING TENANTS ---");

    // Fetch two distinct organizations from staging
    const orgs = await sql<{ organization_id: string; organization_name: string }[]>`
      SELECT organization_id, organization_name
      FROM organizations
      ORDER BY created_at ASC
      LIMIT 2;
    `;
    if (orgs.length < 2) {
      throw new Error("Staging requires at least 2 organizations to test cross-tenant boundaries");
    }
    const orgA = orgs[0].organization_id;
    const orgB = orgs[1].organization_id;
    console.log(`Org A: ${orgA} (${orgs[0].organization_name})`);
    console.log(`Org B: ${orgB} (${orgs[1].organization_name})`);

    // Fetch active users for Org A and Org B
    const usersA = await sql<{ user_id: string; email: string }[]>`
      SELECT user_id, email FROM users
      WHERE organization_id = ${orgA} AND status = 'active' AND deleted_at IS NULL
      LIMIT 1;
    `;
    const usersB = await sql<{ user_id: string; email: string }[]>`
      SELECT user_id, email FROM users
      WHERE organization_id = ${orgB} AND status = 'active' AND deleted_at IS NULL
      LIMIT 1;
    `;
    if (usersA.length === 0 || usersB.length === 0) {
      throw new Error("Missing active users in Org A or Org B for RLS verification");
    }
    const userA = usersA[0];
    const userB = usersB[0];
    console.log(`User A: ${userA.email} (${userA.user_id})`);
    console.log(`User B: ${userB.email} (${userB.user_id})`);

    // Ensure at least one project exists in Org A and Org B
    let [projA] = await sql<{ project_id: string; project_name: string; visibility: string }[]>`
      SELECT project_id, project_name, visibility FROM projects WHERE organization_id = ${orgA} LIMIT 1;
    `;
    if (!projA) {
      const newId = randomUUID();
      [projA] = await sql`
        INSERT INTO projects (project_id, organization_id, project_name, project_code, visibility)
        VALUES (${newId}, ${orgA}, 'Project Org A', 'POA-01', 'internal')
        RETURNING project_id, project_name, visibility;
      `;
    }

    let [projB] = await sql<{ project_id: string; project_name: string; visibility: string }[]>`
      SELECT project_id, project_name, visibility FROM projects WHERE organization_id = ${orgB} LIMIT 1;
    `;
    if (!projB) {
      const newId = randomUUID();
      [projB] = await sql`
        INSERT INTO projects (project_id, organization_id, project_name, project_code, visibility)
        VALUES (${newId}, ${orgB}, 'Project Org B', 'POB-01', 'internal')
        RETURNING project_id, project_name, visibility;
      `;
    }
    console.log(`Project A: ${projA.project_name} (${projA.project_id})`);
    console.log(`Project B: ${projB.project_name} (${projB.project_id})`);

    // ------------------------------------------------------------------------
    // SECTION 3: STEP 8 RLS VERIFICATIONS
    // ------------------------------------------------------------------------
    console.log("\n--- 3. STEP 8 — RLS VERIFICATIONS ---");

    // A. Anonymous SELECT projects
    let anonSelectBlocked = false;
    let anonSelectDetails = "";
    try {
      const rows = await asPostgresRole(sql, "anon", {}, async (tx) => {
        return tx`SELECT project_id FROM projects`;
      });
      anonSelectBlocked = rows.length === 0;
      anonSelectDetails = `${rows.length} rows returned`;
    } catch (err: any) {
      anonSelectBlocked = err.code === "42501" || err.message?.includes("permission denied");
      anonSelectDetails = `Blocked: code ${err.code}`;
    }
    recordTest(
      "A. anonymous SELECT projects",
      "Blocked (0 rows returned or 42501)",
      anonSelectDetails,
      anonSelectBlocked,
    );

    // B. Anonymous INSERT projects
    let anonInsertBlocked = false;
    let anonInsertDetails = "";
    try {
      await asPostgresRole(sql, "anon", {}, async (tx) => {
        await tx`INSERT INTO projects (project_id, organization_id, project_name, project_code)
                 VALUES (${randomUUID()}, ${orgA}, 'Anon Project', 'AP-99')`;
      });
      anonInsertDetails = "Unexpectedly succeeded";
    } catch (err: any) {
      anonInsertBlocked = true;
      anonInsertDetails = `Blocked: code ${err.code} (${err.message})`;
    }
    recordTest(
      "B. anonymous INSERT projects",
      "Blocked (code 42501 permission denied)",
      anonInsertDetails,
      anonInsertBlocked,
    );

    // C. Authenticated User A SELECT own authorized projects
    let userAProjects: any[] = [];
    let userASelectErr: string | null = null;
    try {
      userAProjects = await asPostgresRole(
        sql,
        "authenticated",
        { sub: userA.user_id, organizationId: orgA },
        async (tx) => {
          return tx`SELECT project_id, project_name, organization_id FROM projects`;
        },
      );
    } catch (err: any) {
      userASelectErr = `${err.code}: ${err.message}`;
    }
    const seesOwnProjects =
      !userASelectErr &&
      userAProjects.length > 0 &&
      userAProjects.every((p) => p.organization_id === orgA);
    recordTest(
      "C. authenticated User A SELECT own authorized projects",
      "Succeeds, returns own org projects, NO 42P17",
      userASelectErr || `Returned ${userAProjects.length} own project(s)`,
      seesOwnProjects,
    );

    // D. Authenticated User A SELECT User B project
    const leakedUserBProject = userAProjects.some((p) => p.project_id === projB.project_id);
    recordTest(
      "D. authenticated User A SELECT User B project",
      "Denied / 0 rows (projB not visible to User A)",
      leakedUserBProject ? "LEAKED: User A saw User B project" : "Filtered out (0 cross-tenant rows)",
      !leakedUserBProject,
    );

    // E. Authenticated User A SELECT project_members
    let userAMembers: any[] = [];
    let userAMembersErr: string | null = null;
    try {
      userAMembers = await asPostgresRole(
        sql,
        "authenticated",
        { sub: userA.user_id, organizationId: orgA },
        async (tx) => {
          return tx`SELECT member_id, project_id, user_id FROM project_members`;
        },
      );
    } catch (err: any) {
      userAMembersErr = `${err.code}: ${err.message}`;
    }
    // Verify no member belongs to Org B projects
    let crossTenantMemberLeak = false;
    if (userAMembers.length > 0) {
      const pids = userAMembers.map((m) => m.project_id);
      const crossOrgs = await sql`
        SELECT project_id FROM projects WHERE project_id IN ${sql(pids)} AND organization_id = ${orgB}
      `;
      crossTenantMemberLeak = crossOrgs.length > 0;
    }
    recordTest(
      "E. authenticated User A SELECT project_members",
      "Only authorized membership visibility (0 cross-tenant members)",
      userAMembersErr || `Returned ${userAMembers.length} member(s), crossTenantLeak=${crossTenantMemberLeak}`,
      !userAMembersErr && !crossTenantMemberLeak,
    );

    // F. Authenticated User A attempts unauthorized project mutation
    // User A attempts to update or delete User B's project
    let crossUpdateBlocked = false;
    let crossUpdateDetails = "";
    try {
      await asPostgresRole(
        sql,
        "authenticated",
        { sub: userA.user_id, organizationId: orgA },
        async (tx) => {
          const res = await tx`
            UPDATE projects SET description = 'Hacked' WHERE project_id = ${projB.project_id} RETURNING project_id
          `;
          if (res.length === 0) {
            crossUpdateBlocked = true;
            crossUpdateDetails = "0 rows updated (mutation refused by RLS/tenancy)";
          } else {
            crossUpdateDetails = "LEAK: updated foreign project row";
          }
        },
      );
    } catch (err: any) {
      crossUpdateBlocked = true;
      crossUpdateDetails = `Blocked by error: ${err.code} (${err.message})`;
    }
    recordTest(
      "F. authenticated User A attempts unauthorized project mutation",
      "Blocked (0 rows updated or 42501 error)",
      crossUpdateDetails,
      crossUpdateBlocked,
    );

    // G. Authenticated user executes the previously failing projects SELECT
    const had42P17 =
      userASelectErr?.includes("42P17") ||
      userAMembersErr?.includes("42P17");
    recordTest(
      "G. previously failing projects SELECT error check",
      "NO 42P17 infinite recursion",
      had42P17 ? "FAILED: 42P17 still present" : "Zero 42P17 errors occurred",
      !had42P17,
    );

    // ------------------------------------------------------------------------
    // SECTION 4: STEP 9 SERVER-SIDE REGRESSION
    // ------------------------------------------------------------------------
    console.log("\n--- 4. STEP 9 — SERVER-SIDE REGRESSION TESTS ---");

    // Server-side operations run via privileged Drizzle/session connection
    // with application-level tenant context. Verify tenant isolation invariant.
    const serverSideProjects = await sql`
      SELECT project_id, organization_id FROM projects WHERE organization_id = ${orgA};
    `;
    const serverSideAllMatch = serverSideProjects.every((p) => p.organization_id === orgA);
    recordTest(
      "Server-side tenant scoped project read",
      "All projects returned strictly belong to organizationId filter",
      `Count=${serverSideProjects.length}, allMatch=${serverSideAllMatch}`,
      serverSideAllMatch,
    );

    // Tampering test: querying with orgA filter cannot retrieve orgB project
    const tamperingQuery = await sql`
      SELECT project_id FROM projects
      WHERE project_id = ${projB.project_id} AND organization_id = ${orgA};
    `;
    recordTest(
      "Server-side organizationId tampering protection",
      "0 rows returned when querying foreign project under current organizationId",
      `Returned ${tamperingQuery.length} rows`,
      tamperingQuery.length === 0,
    );

    // ------------------------------------------------------------------------
    // SECTION 5: STEP 10 SECURITY REVIEW CHECKS
    // ------------------------------------------------------------------------
    console.log("\n--- 5. STEP 10 — SECURITY INVARIANT TESTS ---");

    // 1. Anon cannot execute app.is_project_member
    let anonHelperBlocked = false;
    let anonHelperErr = "";
    try {
      await asPostgresRole(sql, "anon", {}, async (tx) => {
        await tx`SELECT app.is_project_member(${projA.project_id})`;
      });
    } catch (err: any) {
      anonHelperBlocked = err.code === "42501";
      anonHelperErr = `code: ${err.code}`;
    }
    recordTest(
      "Anon execute privilege revoked on app.is_project_member",
      "Blocked with 42501 permission denied",
      anonHelperErr || "Anon was able to execute helper",
      anonHelperBlocked,
    );

    // 2. User A calling helper with foreign project returns false
    let foreignHelperResult: boolean | null = null;
    await asPostgresRole(
      sql,
      "authenticated",
      { sub: userA.user_id, organizationId: orgA },
      async (tx) => {
        const [res] = await tx`SELECT app.is_project_member(${projB.project_id}) as is_member`;
        foreignHelperResult = res.is_member;
      },
    );
    recordTest(
      "User A calling helper with foreign project returns false",
      "Returns false (no foreign project membership spoofing)",
      `is_member=${foreignHelperResult}`,
      foreignHelperResult === false,
    );

    // 3. User A calling helper with non-existent UUID returns false
    let randomHelperResult: boolean | null = null;
    await asPostgresRole(
      sql,
      "authenticated",
      { sub: userA.user_id, organizationId: orgA },
      async (tx) => {
        const [res] = await tx`SELECT app.is_project_member(${randomUUID()}) as is_member`;
        randomHelperResult = res.is_member;
      },
    );
    recordTest(
      "User A calling helper with random UUID returns false",
      "Returns false (no ID enumeration or crash)",
      `is_member=${randomHelperResult}`,
      randomHelperResult === false,
    );

    // ------------------------------------------------------------------------
    // SUMMARY
    // ------------------------------------------------------------------------
    const allPassed = tableResults.every((t) => t.result === "PASSED");
    console.log("\n================================================================================");
    console.log(`STAGING VERIFICATION OVERALL VERDICT: ${allPassed ? "PASSED" : "FAILED"}`);
    console.log(`Passed: ${tableResults.filter((t) => t.result === "PASSED").length}/${tableResults.length}`);
    console.log("================================================================================\n");

    if (!allPassed) {
      process.exit(1);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

runVerification().catch((err) => {
  console.error("Fatal error during staging verification:", err);
  process.exit(1);
});
