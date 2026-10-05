/**
 * AI NEX OS — PHASE S5.2 LIVE STAGING RLS & SECURITY VERIFICATION
 *
 * Runs against the staging Supabase project (shnzzbbtydmvfhgeoysg):
 * Enforces all Section 4 through 20 requirements of S5.2.
 */

import { prepareToolingTarget } from "./lib/environment";
import postgres, { type Sql } from "postgres";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const target = prepareToolingTarget("verify-s5-2-staging");

interface VerificationCheck {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  expected: string;
  actual: string;
}

const checks: VerificationCheck[] = [];

function recordCheck(
  id: string,
  name: string,
  category: string,
  passed: boolean,
  expected: string,
  actual: string,
) {
  checks.push({ id, name, category, passed, expected, actual });
  const status = passed ? "✓ PASS" : "✗ FAIL";
  console.log(
    `[${status}] [${category}] ${id}: ${name}\n       Expected: ${expected}\n       Actual:   ${actual}`,
  );
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

async function main() {
  console.log(
    "================================================================================",
  );
  console.log("AI NEX OS — S5.2 LIVE STAGING VERIFICATION HARNESS");
  console.log(
    "================================================================================\n",
  );

  console.log(`Target Environment:  ${target.environment}`);
  console.log(`Project Ref:         ${target.projectRef}`);
  console.log(`Database Host:       ${target.databaseHost}`);
  console.log(`Config Source:       ${target.file}\n`);

  if (target.projectRef !== "shnzzbbtydmvfhgeoysg") {
    console.error(
      `FATAL: Target projectRef is "${target.projectRef}", expected "shnzzbbtydmvfhgeoysg". ABORTING.`,
    );
    process.exit(1);
  }

  const dbUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL!;
  const sql = postgres(dbUrl, {
    max: 1,
    prepare: false,
    ssl: "require",
    connect_timeout: 15,
  });

  try {
    // ------------------------------------------------------------------------
    // SECTION 4 & 5: IDENTITY & DATABASE CONNECTIVITY
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 1: STAGING IDENTITY & CONNECTIVITY ---");
    const [dbInfo] = await sql`
      SELECT current_database() as database, current_user as db_user, version() as version;
    `;
    const pgVersion = dbInfo.version.split(" on ")[0];
    const isPg17 = pgVersion.includes("PostgreSQL 17");

    recordCheck(
      "ID-01",
      "Staging Project Ref Match",
      "IDENTITY",
      target.projectRef === "shnzzbbtydmvfhgeoysg",
      "shnzzbbtydmvfhgeoysg",
      target.projectRef,
    );

    recordCheck(
      "ID-02",
      "PostgreSQL Major Version 17.x",
      "IDENTITY",
      isPg17,
      "PostgreSQL 17.x",
      pgVersion,
    );

    recordCheck(
      "ID-03",
      "Database & User Identity",
      "IDENTITY",
      dbInfo.database === "postgres" && dbInfo.db_user === "postgres",
      "database: postgres, user: postgres",
      `database: ${dbInfo.database}, user: ${dbInfo.db_user}`,
    );

    // Supabase services check
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    let authOk = false;
    try {
      const authRes = await fetch(`${supabaseUrl}/auth/v1/health`, {
        headers: { apikey: anonKey },
      });
      authOk = authRes.ok;
    } catch {}
    recordCheck(
      "SVC-01",
      "Supabase Auth Health",
      "SERVICE",
      authOk,
      "Status 200 OK",
      authOk ? "200 OK" : "FAILED",
    );

    let postgrestOk = false;
    try {
      const restRes = await fetch(
        `${supabaseUrl}/rest/v1/projects?select=count`,
        {
          headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        },
      );
      // PostgREST is healthy when it correctly rejects anon table access with 401 / 42501
      const body = await restRes.json();
      postgrestOk = restRes.status === 401 && body.code === "42501";
    } catch {}
    recordCheck(
      "SVC-02",
      "PostgREST Ingress & Security Gate",
      "SERVICE",
      postgrestOk,
      "401/42501 (denied for anon)",
      postgrestOk ? "401/42501" : "FAILED",
    );

    // ------------------------------------------------------------------------
    // SECTION 6, 7 & 8: MIGRATION BASELINE & HASH FIDELITY
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 2: MIGRATION HISTORY & HASH FIDELITY ---");
    const migrations = await sql<
      { id: number; hash: string; created_at: string }[]
    >`
      SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id ASC;
    `;

    recordCheck(
      "MIG-01",
      "Total Applied Migrations Count",
      "MIGRATION",
      migrations.length === 21,
      "21 applied migrations (0000 -> 0020)",
      `${migrations.length} migrations`,
    );

    const m0019 = migrations[19]; // index 19 is 0019
    const m0020 = migrations[20]; // index 20 is 0020

    // Compute local file hashes
    const m0019Content = readFileSync(
      join(process.cwd(), "database", "migrations", "0019_rls_hardening.sql"),
      "utf8",
    );
    const m0019ExpectedHash = createHash("sha256")
      .update(m0019Content)
      .digest("hex");

    const m0020Content = readFileSync(
      join(
        process.cwd(),
        "database",
        "migrations",
        "0020_harden_security_definer_search_paths.sql",
      ),
      "utf8",
    );
    const m0020ExpectedHash = createHash("sha256")
      .update(m0020Content)
      .digest("hex");

    recordCheck(
      "MIG-02",
      "Migration 0019 Hash Verification",
      "MIGRATION",
      m0019?.hash === m0019ExpectedHash,
      m0019ExpectedHash.substring(0, 16) + "...",
      (m0019?.hash ?? "MISSING").substring(0, 16) + "...",
    );

    recordCheck(
      "MIG-03",
      "Migration 0020 Hash Verification",
      "MIGRATION",
      m0020?.hash === m0020ExpectedHash,
      m0020ExpectedHash.substring(0, 16) + "...",
      (m0020?.hash ?? "MISSING").substring(0, 16) + "...",
    );

    // ------------------------------------------------------------------------
    // SECTION 9: RLS CATALOG STATE
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 3: RLS CATALOG STATE ---");
    const [pubTables] = await sql`
      SELECT count(*)::int as count FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r';
    `;

    const [rlsTables] = await sql`
      SELECT count(*)::int as count FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = true;
    `;

    const [policies] = await sql`
      SELECT count(*)::int as count FROM pg_policies WHERE schemaname = 'public';
    `;

    recordCheck(
      "CAT-01",
      "Public Tables Count",
      "CATALOG",
      pubTables.count === 204,
      "204 tables",
      `${pubTables.count} tables`,
    );

    recordCheck(
      "CAT-02",
      "RLS-Enabled Tables Count",
      "CATALOG",
      rlsTables.count >= 57, // Supabase managed tables may have RLS enabled on all tables
      ">= 57 RLS-enabled tables",
      `${rlsTables.count} tables`,
    );

    recordCheck(
      "CAT-03",
      "RLS Policy Count Post-0020",
      "CATALOG",
      policies.count === 79,
      "79 RLS policies",
      `${policies.count} policies`,
    );

    // ------------------------------------------------------------------------
    // SECTION 10 & 11: MEMBERSHIPS & INVITATIONS POLICIES AND GRANTS
    // ------------------------------------------------------------------------
    console.log(
      "\n--- SECTION 4: MEMBERSHIPS & INVITATIONS POLICIES & GRANTS ---",
    );
    const targetPolicies = await sql`
      SELECT tablename, policyname, roles, cmd, qual
      FROM pg_policies
      WHERE tablename IN ('organization_memberships', 'organization_invitations');
    `;

    const membPolicy = targetPolicies.find(
      (p) =>
        p.tablename === "organization_memberships" &&
        p.policyname === "organization_memberships_select",
    );
    const invPolicy = targetPolicies.find(
      (p) =>
        p.tablename === "organization_invitations" &&
        p.policyname === "organization_invitations_select",
    );

    recordCheck(
      "POL-01",
      "organization_memberships_select Policy Attached",
      "POLICY",
      Boolean(membPolicy && membPolicy.roles.includes("authenticated")),
      "Policy attached for authenticated on SELECT",
      membPolicy ? `Attached: ${membPolicy.policyname}` : "MISSING",
    );

    recordCheck(
      "POL-02",
      "organization_invitations_select Policy Attached",
      "POLICY",
      Boolean(invPolicy && invPolicy.roles.includes("authenticated")),
      "Policy attached for authenticated on SELECT",
      invPolicy ? `Attached: ${invPolicy.policyname}` : "MISSING",
    );

    // Verify grants on organization_memberships & organization_invitations
    const targetGrants = await sql`
      SELECT grantee, privilege_type, table_name
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public'
        AND table_name IN ('organization_memberships', 'organization_invitations');
    `;

    const membAuthSelect = targetGrants.some(
      (g) =>
        g.table_name === "organization_memberships" &&
        g.grantee === "authenticated" &&
        g.privilege_type === "SELECT",
    );
    const membAnonAny = targetGrants.some(
      (g) =>
        g.table_name === "organization_memberships" && g.grantee === "anon",
    );
    const membAuthWrite = targetGrants.some(
      (g) =>
        g.table_name === "organization_memberships" &&
        g.grantee === "authenticated" &&
        ["INSERT", "UPDATE", "DELETE"].includes(g.privilege_type),
    );

    const invAuthSelect = targetGrants.some(
      (g) =>
        g.table_name === "organization_invitations" &&
        g.grantee === "authenticated" &&
        g.privilege_type === "SELECT",
    );
    const invAnonAny = targetGrants.some(
      (g) =>
        g.table_name === "organization_invitations" && g.grantee === "anon",
    );
    const invAuthWrite = targetGrants.some(
      (g) =>
        g.table_name === "organization_invitations" &&
        g.grantee === "authenticated" &&
        ["INSERT", "UPDATE", "DELETE"].includes(g.privilege_type),
    );

    recordCheck(
      "GRANT-01",
      "organization_memberships Grants Restricted",
      "GRANTS",
      membAuthSelect && !membAnonAny && !membAuthWrite,
      "authenticated SELECT only, anon DENIED, authenticated write DENIED",
      `authSelect=${membAuthSelect}, anonAny=${membAnonAny}, authWrite=${membAuthWrite}`,
    );

    recordCheck(
      "GRANT-02",
      "organization_invitations Grants Restricted",
      "GRANTS",
      invAuthSelect && !invAnonAny && !invAuthWrite,
      "authenticated SELECT only, anon DENIED, authenticated write DENIED",
      `authSelect=${invAuthSelect}, anonAny=${invAnonAny}, authWrite=${invAuthWrite}`,
    );

    // ------------------------------------------------------------------------
    // SECTION 12 & 13: SECURITY DEFINER FUNCTIONS & SEARCH_PATH PINNING
    // ------------------------------------------------------------------------
    console.log(
      "\n--- SECTION 5: SECURITY DEFINER FUNCTIONS & SEARCH_PATH PINNING ---",
    );
    const secDefFns = await sql`
      SELECT
        p.proname as name,
        p.proconfig as config,
        pg_get_userbyid(p.proowner) as owner,
        p.prosecdef as is_secdef
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'app' AND p.prosecdef = true
      ORDER BY p.proname;
    `;

    const expectedFns = [
      "current_user_organization_id",
      "has_permission",
      "is_org_member",
      "is_project_member",
      "protect_privileged_user_fields",
    ];

    recordCheck(
      "SECDEF-01",
      "Expected SECURITY DEFINER Functions Count",
      "SECDEF",
      secDefFns.length === 5,
      "5 functions in app schema",
      `${secDefFns.length} functions`,
    );

    for (const fnName of expectedFns) {
      const fn = secDefFns.find((f) => f.name === fnName);
      const isPinned =
        Array.isArray(fn?.config) &&
        fn.config.some((c: string) => c.startsWith("search_path="));
      const hasEmptySearchPath =
        isPinned && fn.config.includes('search_path=""');

      recordCheck(
        `SECDEF-SP-${fnName}`,
        `Search Path Pinned to Empty (${fnName})`,
        "SECDEF_SEARCHPATH",
        Boolean(hasEmptySearchPath),
        'proconfig includes search_path=""',
        fn ? JSON.stringify(fn.config) : "FUNCTION NOT FOUND",
      );

      // Check routine grants
      const privs = await sql`
        SELECT grantee, privilege_type
        FROM information_schema.routine_privileges
        WHERE routine_schema = 'app' AND routine_name = ${fnName};
      `;
      const grantees = privs.map((p: any) => p.grantee);
      const publicHasExec = grantees.includes("PUBLIC");
      const anonHasExec = grantees.includes("anon");
      const authHasExec = grantees.includes("authenticated");

      if (fnName === "protect_privileged_user_fields") {
        recordCheck(
          `SECDEF-GRANT-${fnName}`,
          `Trigger Routine Privileges Restricted (${fnName})`,
          "SECDEF_GRANTS",
          !publicHasExec && !anonHasExec && !authHasExec,
          "PUBLIC/anon/authenticated revoked",
          `Grantees: ${JSON.stringify(grantees)}`,
        );
      } else {
        recordCheck(
          `SECDEF-GRANT-${fnName}`,
          `Helper Routine Privileges Restricted (${fnName})`,
          "SECDEF_GRANTS",
          !publicHasExec && !anonHasExec && authHasExec,
          "authenticated allowed, PUBLIC/anon revoked",
          `Grantees: ${JSON.stringify(grantees)}`,
        );
      }
    }

    // ------------------------------------------------------------------------
    // SECTION 14: 42P17 RECURSION REGRESSION CHECK
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 6: 42P17 RECURSION REGRESSION CHECK ---");
    // Pick an active staging user
    const [testUser] = await sql`
      SELECT user_id, organization_id FROM public.users WHERE status = 'active' LIMIT 1;
    `;

    let recursionError: string | null = null;
    const rlsTablesList = await sql<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public';
    `;

    try {
      await asPostgresRole(
        sql,
        "authenticated",
        { sub: testUser.user_id, organizationId: testUser.organization_id },
        async (tx) => {
          // Query projects and project_members explicitly
          await tx`SELECT count(*) FROM public.projects;`;
          await tx`SELECT count(*) FROM public.project_members;`;
          await tx`SELECT count(*) FROM public.organization_memberships;`;
          await tx`SELECT count(*) FROM public.organization_invitations;`;
        },
      );
    } catch (err: any) {
      recursionError = err.message;
    }

    recordCheck(
      "REC-01",
      "Zero 42P17 Recursion on Key Relations",
      "RECURSION",
      recursionError === null,
      "Query succeeds with 0 errors",
      recursionError
        ? `42P17 error: ${recursionError}`
        : "Zero recursion detected",
    );

    // ------------------------------------------------------------------------
    // SECTION 15, 16, 17: TENANT ISOLATION, MEMBERSHIP, INVITATIONS RLS
    // ------------------------------------------------------------------------
    console.log(
      "\n--- SECTION 7: STAGING TENANT ISOLATION & RLS EVALUATION ---",
    );
    // Identify two distinct organizations and their active users
    const orgs = await sql<
      { organization_id: string; organization_name: string }[]
    >`
      SELECT organization_id, organization_name FROM public.organizations LIMIT 2;
    `;

    if (orgs.length >= 2) {
      const orgA = orgs[0].organization_id;
      const orgB = orgs[1].organization_id;

      // Find active user for Org A
      const [userA] = await sql`
        SELECT user_id, organization_id FROM public.users
        WHERE organization_id = ${orgA} AND status = 'active' LIMIT 1;
      `;
      // Find active user for Org B
      const [userB] = await sql`
        SELECT user_id, organization_id FROM public.users
        WHERE organization_id = ${orgB} AND status = 'active' LIMIT 1;
      `;

      if (userA && userB) {
        // Test Tenant Isolation on Projects
        const projectsSeenByA = await asPostgresRole(
          sql,
          "authenticated",
          { sub: userA.user_id, organizationId: userA.organization_id },
          async (tx) => {
            return tx`SELECT project_id, organization_id FROM public.projects;`;
          },
        );
        const foreignProjectsSeenByA = projectsSeenByA.filter(
          (p: any) => p.organization_id === orgB,
        );

        recordCheck(
          "ISO-01",
          "Cross-Tenant Project Isolation (User A sees 0 Org B)",
          "TENANT_ISOLATION",
          foreignProjectsSeenByA.length === 0,
          "0 foreign tenant projects",
          `${foreignProjectsSeenByA.length} foreign projects visible`,
        );

        // Test Membership Visibility (Section 16)
        const membershipsSeenByA = await asPostgresRole(
          sql,
          "authenticated",
          { sub: userA.user_id, organizationId: userA.organization_id },
          async (tx) => {
            return tx`SELECT membership_id, user_id, organization_id FROM public.organization_memberships;`;
          },
        );
        const foreignMembershipsSeenByA = membershipsSeenByA.filter(
          (m: any) => m.organization_id === orgB && m.user_id !== userA.user_id,
        );
        const ownMembershipVisible = membershipsSeenByA.some(
          (m: any) => m.user_id === userA.user_id,
        );

        recordCheck(
          "MEMB-01",
          "Authenticated Membership Access (Own Visible, Foreign Hidden)",
          "MEMBERSHIP_RLS",
          ownMembershipVisible && foreignMembershipsSeenByA.length === 0,
          "Own membership visible, 0 foreign tenant memberships",
          `ownVisible=${ownMembershipVisible}, foreignSeen=${foreignMembershipsSeenByA.length}`,
        );

        // Test Invitation Visibility (Section 17)
        // Check permissions of userA
        const [hasOrgUpdate] = await sql`
          SELECT app.has_permission('organization', 'update') as has_perm;
        `;
        const invitationsSeenByA = await asPostgresRole(
          sql,
          "authenticated",
          { sub: userA.user_id, organizationId: userA.organization_id },
          async (tx) => {
            return tx`SELECT invitation_id, organization_id FROM public.organization_invitations;`;
          },
        );
        const foreignInvitationsSeen = invitationsSeenByA.filter(
          (i: any) => i.organization_id === orgB,
        );

        recordCheck(
          "INV-01",
          "Cross-Tenant Invitation Isolation (0 Foreign Invitations)",
          "INVITATIONS_RLS",
          foreignInvitationsSeen.length === 0,
          "0 foreign tenant invitations",
          `${foreignInvitationsSeen.length} foreign invitations visible`,
        );
      } else {
        console.log(
          "Could not find active users in both orgs for isolation test.",
        );
      }
    }

    // ------------------------------------------------------------------------
    // SECTION 18: ANONYMOUS ACCESS RESTRICTIONS
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 8: ANONYMOUS ACCESS RESTRICTIONS ---");
    const testTables = [
      "projects",
      "project_members",
      "organization_memberships",
      "organization_invitations",
    ];

    for (const tbl of testTables) {
      let anonDenied = false;
      let errorCode = "";
      try {
        await asPostgresRole(sql, "anon", {}, async (tx) => {
          await tx.unsafe(`SELECT count(*) FROM public."${tbl}";`);
        });
      } catch (err: any) {
        anonDenied = err.code === "42501";
        errorCode = err.code ?? "UNKNOWN";
      }

      recordCheck(
        `ANON-${tbl}`,
        `Anonymous SELECT Denied (${tbl})`,
        "ANON_DENIAL",
        anonDenied,
        "Denied with 42501 (permission denied)",
        `Denied=${anonDenied} (code=${errorCode})`,
      );
    }

    // ------------------------------------------------------------------------
    // SECTION 19: AUTHENTICATED WRITE ACCESS RESTRICTIONS
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 9: AUTHENTICATED WRITE ACCESS RESTRICTIONS ---");
    const writeTests = [
      {
        id: "AUTH-WRITE-projects-insert",
        name: "Authenticated INSERT projects Denied",
        sql: `INSERT INTO public.projects (organization_id, project_name, project_code) VALUES ('${testUser.organization_id}', 'Test', 'TST-1');`,
      },
      {
        id: "AUTH-WRITE-memberships-insert",
        name: "Authenticated INSERT organization_memberships Denied",
        sql: `INSERT INTO public.organization_memberships (organization_id, user_id, role_id) VALUES ('${testUser.organization_id}', '${testUser.user_id}', gen_random_uuid());`,
      },
      {
        id: "AUTH-WRITE-invitations-insert",
        name: "Authenticated INSERT organization_invitations Denied",
        sql: `INSERT INTO public.organization_invitations (organization_id, email, role_id) VALUES ('${testUser.organization_id}', 'test@test.local', gen_random_uuid());`,
      },
      {
        id: "AUTH-WRITE-projects-update",
        name: "Authenticated UPDATE projects Denied",
        sql: `UPDATE public.projects SET project_name = 'Hacked' WHERE organization_id = '${testUser.organization_id}';`,
      },
      {
        id: "AUTH-WRITE-projects-delete",
        name: "Authenticated DELETE projects Denied",
        sql: `DELETE FROM public.projects WHERE organization_id = '${testUser.organization_id}';`,
      },
    ];

    for (const wt of writeTests) {
      let writeDenied = false;
      let errorCode = "";
      try {
        await asPostgresRole(
          sql,
          "authenticated",
          { sub: testUser.user_id, organizationId: testUser.organization_id },
          async (tx) => {
            await tx.unsafe(wt.sql);
          },
        );
      } catch (err: any) {
        writeDenied = err.code === "42501";
        errorCode = err.code ?? "UNKNOWN";
      }

      recordCheck(
        wt.id,
        wt.name,
        "AUTH_WRITE_DENIAL",
        writeDenied,
        "Denied with 42501 (permission denied)",
        `Denied=${writeDenied} (code=${errorCode})`,
      );
    }

    // ------------------------------------------------------------------------
    // SUMMARY
    // ------------------------------------------------------------------------
    console.log(
      "\n================================================================================",
    );
    console.log("S5.2 LIVE STAGING VERIFICATION SUMMARY");
    console.log(
      "================================================================================",
    );
    const total = checks.length;
    const passed = checks.filter((c) => c.passed).length;
    const failed = checks.filter((c) => !c.passed).length;

    console.log(`Total Checks:  ${total}`);
    console.log(`Passed:        ${passed}`);
    console.log(`Failed:        ${failed}`);

    if (failed > 0) {
      console.log("\nFAILED CHECKS:");
      checks
        .filter((c) => !c.passed)
        .forEach((c) => {
          console.log(
            `  - [${c.category}] ${c.id}: ${c.name} (Expected: ${c.expected} | Actual: ${c.actual})`,
          );
        });
      process.exit(1);
    } else {
      console.log("\nALL S5.2 LIVE STAGING VERIFICATION CHECKS PASSED!");
    }
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("Verification harness error:", err);
  process.exit(1);
});
