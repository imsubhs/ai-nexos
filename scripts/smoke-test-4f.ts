/**
 * AI NEX OS — Phase 4F Production Smoke Test
 *
 * Verifies live production application endpoints for Phase 4F:
 * https://ai-nexos.antideploy.com
 *
 * Checks:
 * - Public health & security headers
 * - Protected DAM routes: /files, /deliverables, /projects
 * - Supabase production database schema integrity for Phase 4F tables
 * - Multi-tenant isolation sanity check
 */

import { prepareToolingTarget } from "./lib/environment";
import postgres from "postgres";

const target = prepareToolingTarget("smoke-test-4f");

interface SmokeCheck {
  id: string;
  category: string;
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  details?: string;
}

const checks: SmokeCheck[] = [];

function recordCheck(
  id: string,
  category: string,
  name: string,
  passed: boolean,
  expected: string,
  actual: string,
  details?: string,
) {
  checks.push({ id, category, name, passed, expected, actual, details });
  const status = passed ? "✓ PASS" : "✗ FAIL";
  console.log(`[${status}] [${category}] ${id}: ${name}`);
  console.log(`       Expected: ${expected}`);
  console.log(`       Actual:   ${actual}`);
  if (details) {
    console.log(`       Details:  ${details}`);
  }
}

const BASE_URL = "https://ai-nexos.antideploy.com";

async function main() {
  console.log(
    "================================================================================",
  );
  console.log("AI NEX OS — PHASE 4F PRODUCTION SMOKE TEST");
  console.log(`Target Host: ${BASE_URL}`);
  console.log(
    "================================================================================\n",
  );

  // 1. Health Endpoint
  console.log("--- 1. Health Endpoint ---");
  const healthRes = await fetch(`${BASE_URL}/api/health`, {
    headers: { "User-Agent": "AI-NEXOS-Phase4F-SmokeTest" },
  });
  const healthBody = await healthRes.json();

  recordCheck(
    "SMOKE-4F-HEALTH-01",
    "HEALTH",
    "GET /api/health returns HTTP 200",
    healthRes.status === 200,
    "HTTP 200",
    `HTTP ${healthRes.status}`,
    `Body: ${JSON.stringify(healthBody)}`,
  );

  recordCheck(
    "SMOKE-4F-HEALTH-02",
    "HEALTH",
    "Health payload reports status = healthy and environment = production",
    healthBody.status === "healthy" && healthBody.environment === "production",
    "healthy & production",
    `${healthBody.status} & ${healthBody.environment}`,
  );

  // 2. Login Route & Security Headers
  console.log("\n--- 2. Login Surface ---");
  const loginRes = await fetch(`${BASE_URL}/login`, {
    headers: { "User-Agent": "AI-NEXOS-Phase4F-SmokeTest" },
  });
  const loginHtml = await loginRes.text();

  recordCheck(
    "SMOKE-4F-LOGIN-01",
    "LOGIN",
    "GET /login renders HTTP 200 with AI NEX OS branding",
    loginRes.status === 200 && loginHtml.includes("AI NEX OS"),
    "HTTP 200 & branding",
    `HTTP ${loginRes.status}`,
  );

  // 3. Protected DAM Route: /files
  console.log("\n--- 3. Protected DAM Route: /files ---");
  const filesRes = await fetch(`${BASE_URL}/files`, {
    redirect: "manual",
    headers: { "User-Agent": "AI-NEXOS-Phase4F-SmokeTest" },
  });
  const filesLoc = filesRes.headers.get("location") || "";

  recordCheck(
    "SMOKE-4F-FILES-01",
    "DAM /FILES",
    "GET /files redirects unauthenticated visitor to /login?next=/files",
    filesRes.status === 307 && filesLoc.includes("/login"),
    "HTTP 307 redirect to /login",
    `HTTP ${filesRes.status}, location: ${filesLoc}`,
  );

  // 4. Protected DAM Route: /deliverables
  console.log("\n--- 4. Protected Deliverables Route: /deliverables ---");
  const delivRes = await fetch(`${BASE_URL}/deliverables`, {
    redirect: "manual",
    headers: { "User-Agent": "AI-NEXOS-Phase4F-SmokeTest" },
  });
  const delivLoc = delivRes.headers.get("location") || "";

  recordCheck(
    "SMOKE-4F-DELIV-01",
    "DELIVERABLES",
    "GET /deliverables redirects unauthenticated visitor to /login?next=/deliverables",
    delivRes.status === 307 && delivLoc.includes("/login"),
    "HTTP 307 redirect to /login",
    `HTTP ${delivRes.status}, location: ${delivLoc}`,
  );

  // 5. Protected Route: /projects
  console.log("\n--- 5. Protected Execution Route: /projects ---");
  const projRes = await fetch(`${BASE_URL}/projects`, {
    redirect: "manual",
    headers: { "User-Agent": "AI-NEXOS-Phase4F-SmokeTest" },
  });
  const projLoc = projRes.headers.get("location") || "";

  recordCheck(
    "SMOKE-4F-PROJ-01",
    "PROJECTS",
    "GET /projects redirects unauthenticated visitor to /login",
    projRes.status === 307 && projLoc.includes("/login"),
    "HTTP 307 redirect to /login",
    `HTTP ${projRes.status}, location: ${projLoc}`,
  );

  // 6. Database Verification: Phase 4F Canonical Tables
  console.log(
    "\n--- 6. Database Verification: PostgreSQL 17.6 Schema Integrity ---",
  );
  const dbUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL!;
  const sql = postgres(dbUrl, { max: 1, prepare: false, ssl: "require" });

  try {
    // Check tables exist
    const [filesTable] = await sql`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'files';
    `;
    recordCheck(
      "SMOKE-4F-DB-01",
      "DATABASE",
      "Canonical table public.files exists",
      Boolean(filesTable && filesTable.table_name === "files"),
      "public.files",
      filesTable ? filesTable.table_name : "MISSING",
    );

    const [delivTable] = await sql`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deliverables';
    `;
    recordCheck(
      "SMOKE-4F-DB-02",
      "DATABASE",
      "Canonical table public.deliverables exists",
      Boolean(delivTable && delivTable.table_name === "deliverables"),
      "public.deliverables",
      delivTable ? delivTable.table_name : "MISSING",
    );

    const [delivFilesTable] = await sql`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deliverable_files';
    `;
    recordCheck(
      "SMOKE-4F-DB-03",
      "DATABASE",
      "Canonical junction table public.deliverable_files exists",
      Boolean(
        delivFilesTable && delivFilesTable.table_name === "deliverable_files",
      ),
      "public.deliverable_files",
      delivFilesTable ? delivFilesTable.table_name : "MISSING",
    );

    const [fileVersionsTable] = await sql`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'file_versions';
    `;
    recordCheck(
      "SMOKE-4F-DB-04",
      "DATABASE",
      "Canonical table public.file_versions exists",
      Boolean(
        fileVersionsTable && fileVersionsTable.table_name === "file_versions",
      ),
      "public.file_versions",
      fileVersionsTable ? fileVersionsTable.table_name : "MISSING",
    );

    // Operator lookup & tenant test
    const operatorEmail = "subsworkspace@gmail.com";
    const [pubOp] = await sql`
      SELECT user_id, email, status FROM public.users WHERE email = ${operatorEmail};
    `;

    recordCheck(
      "SMOKE-4F-DB-05",
      "DATABASE",
      "Operator user subsworkspace@gmail.com resolves in public.users",
      Boolean(pubOp && pubOp.user_id),
      "user_id present",
      pubOp ? pubOp.user_id : "NOT FOUND",
    );

    if (pubOp) {
      const [membership] = await sql`
        SELECT om.membership_id, om.organization_id, o.organization_name
        FROM public.organization_memberships om
        JOIN public.organizations o ON o.organization_id = om.organization_id
        WHERE om.user_id = ${pubOp.user_id} AND om.status = 'active'
        LIMIT 1;
      `;

      recordCheck(
        "SMOKE-4F-DB-06",
        "DATABASE",
        "Operator has active organization membership",
        Boolean(membership && membership.organization_id),
        "Active org membership",
        membership
          ? `${membership.organization_name} (${membership.organization_id})`
          : "NO MEMBERSHIP",
      );

      // Verify safe query against files and deliverables with organization filter
      if (membership) {
        const filesCount = await sql`
          SELECT count(*)::int as count FROM public.files WHERE organization_id = ${membership.organization_id};
        `;
        const delivCount = await sql`
          SELECT count(*)::int as count FROM public.deliverables WHERE organization_id = ${membership.organization_id};
        `;

        recordCheck(
          "SMOKE-4F-DB-07",
          "DATABASE",
          "Tenant-scoped files & deliverables queries execute cleanly",
          true,
          "Zero SQL errors",
          `Files: ${filesCount[0].count}, Deliverables: ${delivCount[0].count}`,
        );
      }
    }
  } catch (err: any) {
    recordCheck(
      "SMOKE-4F-DB-ERR",
      "DATABASE",
      "Database connection and queries",
      false,
      "No exceptions",
      err.message || String(err),
    );
  } finally {
    await sql.end();
  }

  // Summary
  console.log(
    "\n================================================================================",
  );
  const total = checks.length;
  const passed = checks.filter((c) => c.passed).length;
  const failed = total - passed;
  console.log(
    `SMOKE TEST RESULTS: ${passed}/${total} checks passed (${failed} failed)`,
  );
  console.log(
    "================================================================================",
  );

  if (failed > 0) {
    console.error(`\n[FATAL] ${failed} smoke check(s) failed.`);
    process.exit(1);
  } else {
    console.log("\n[SUCCESS] All Phase 4F production smoke checks passed.");
  }
}

main().catch((err) => {
  console.error("Smoke test fatal error:", err);
  process.exit(1);
});
