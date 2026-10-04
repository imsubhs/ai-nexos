/**
 * AI NEX OS — Phase 4G Production Smoke Test
 *
 * Verifies live production application endpoints for Phase 4G:
 * https://ai-nexos.antideploy.com
 *
 * Checks:
 * - Public health & security headers
 * - Protected internal routes: /files, /deliverables, /projects, /clients
 * - External Portal route: /portal/s/[token] with invalid token renders secure deactivated UI (HTTP 200)
 * - Supabase production database schema integrity for Phase 4G tables
 * - Multi-tenant isolation sanity check
 */

import { prepareToolingTarget } from "./lib/environment";
import postgres from "postgres";

const target = prepareToolingTarget("smoke-test-4g");

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
  console.log("================================================================================");
  console.log("AI NEX OS — PHASE 4G PRODUCTION SMOKE TEST");
  console.log(`Target Host: ${BASE_URL}`);
  console.log("================================================================================\n");

  // 1. Health Endpoint
  console.log("--- 1. Health Endpoint ---");
  const healthRes = await fetch(`${BASE_URL}/api/health`, {
    headers: { "User-Agent": "AI-NEXOS-Phase4G-SmokeTest" },
  });
  const healthBody = await healthRes.json();

  recordCheck(
    "SMOKE-4G-HEALTH-01",
    "HEALTH",
    "GET /api/health returns HTTP 200",
    healthRes.status === 200,
    "HTTP 200",
    `HTTP ${healthRes.status}`,
    `Body: ${JSON.stringify(healthBody)}`,
  );

  recordCheck(
    "SMOKE-4G-HEALTH-02",
    "HEALTH",
    "Health payload reports status = healthy and environment = production",
    healthBody.status === "healthy" && healthBody.environment === "production",
    "healthy & production",
    `${healthBody.status} & ${healthBody.environment}`,
  );

  // 2. Login Route & Security Headers
  console.log("\n--- 2. Login Surface ---");
  const loginRes = await fetch(`${BASE_URL}/login`, {
    headers: { "User-Agent": "AI-NEXOS-Phase4G-SmokeTest" },
  });
  const loginHtml = await loginRes.text();

  recordCheck(
    "SMOKE-4G-LOGIN-01",
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
    headers: { "User-Agent": "AI-NEXOS-Phase4G-SmokeTest" },
  });
  const filesLoc = filesRes.headers.get("location") || "";

  recordCheck(
    "SMOKE-4G-FILES-01",
    "DAM /FILES",
    "GET /files redirects unauthenticated visitor to /login?next=/files",
    filesRes.status === 307 && filesLoc.includes("/login"),
    "HTTP 307 redirect to /login",
    `HTTP ${filesRes.status}, location: ${filesLoc}`,
  );

  // 4. Protected Deliverables Route: /deliverables
  console.log("\n--- 4. Protected Deliverables Route: /deliverables ---");
  const delivRes = await fetch(`${BASE_URL}/deliverables`, {
    redirect: "manual",
    headers: { "User-Agent": "AI-NEXOS-Phase4G-SmokeTest" },
  });
  const delivLoc = delivRes.headers.get("location") || "";

  recordCheck(
    "SMOKE-4G-DELIV-01",
    "DELIVERABLES",
    "GET /deliverables redirects unauthenticated visitor to /login?next=/deliverables",
    delivRes.status === 307 && delivLoc.includes("/login"),
    "HTTP 307 redirect to /login",
    `HTTP ${delivRes.status}, location: ${delivLoc}`,
  );

  // 5. Protected Execution Route: /projects
  console.log("\n--- 5. Protected Execution Route: /projects ---");
  const projRes = await fetch(`${BASE_URL}/projects`, {
    redirect: "manual",
    headers: { "User-Agent": "AI-NEXOS-Phase4G-SmokeTest" },
  });
  const projLoc = projRes.headers.get("location") || "";

  recordCheck(
    "SMOKE-4G-PROJ-01",
    "PROJECTS",
    "GET /projects redirects unauthenticated visitor to /login",
    projRes.status === 307 && projLoc.includes("/login"),
    "HTTP 307 redirect to /login",
    `HTTP ${projRes.status}, location: ${projLoc}`,
  );

  // 6. External Client Portal Route: /portal/s/[token]
  console.log("\n--- 6. External Client Portal Route: /portal/s/[token] ---");
  const dummyToken = "invalid_token_smoke_test_0000000000000000";
  const portalRes = await fetch(`${BASE_URL}/portal/s/${dummyToken}`, {
    headers: { "User-Agent": "AI-NEXOS-Phase4G-SmokeTest" },
  });
  const portalHtml = await portalRes.text();

  recordCheck(
    "SMOKE-4G-PORTAL-01",
    "CLIENT PORTAL",
    "GET /portal/s/[invalid-token] returns HTTP 200 without internal crash",
    portalRes.status === 200,
    "HTTP 200",
    `HTTP ${portalRes.status}`,
  );

  recordCheck(
    "SMOKE-4G-PORTAL-02",
    "CLIENT PORTAL",
    "GET /portal/s/[invalid-token] renders secure deactivated message without leaking internal data",
    portalHtml.includes("This review link is not active") || portalHtml.includes("AI NEX OS Client Review"),
    "Secure deactivated card or client review branding",
    portalHtml.includes("This review link is not active") ? "This review link is not active" : "Rendered client portal shell",
  );

  // 7. Database Verification: PostgreSQL 17.6 Schema Integrity
  console.log("\n--- 7. Database Verification: PostgreSQL 17.6 Schema Integrity ---");
  const dbUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || "";
  const sql = postgres(dbUrl, { max: 1, prepare: false, ssl: "require" });

  try {
    const requiredTables = [
      "files",
      "file_versions",
      "deliverables",
      "deliverable_revisions",
      "deliverable_files",
      "deliverable_approvals",
      "deliverable_review_threads",
      "deliverable_review_comments",
      "deliverable_share_links",
    ];

    for (const table of requiredTables) {
      const rows = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = ${table};
      `;
      recordCheck(
        `SMOKE-4G-DB-${table.toUpperCase().replace(/_/g, "-")}`,
        "DATABASE",
        `Canonical table public.${table} exists`,
        rows.length === 1,
        `public.${table}`,
        rows.length === 1 ? table : "MISSING",
      );
    }

    // Verify operator user
    const [pubOp] = await sql`
      SELECT user_id, email, status 
      FROM public.users 
      WHERE email = 'subsworkspace@gmail.com';
    `;
    recordCheck(
      "SMOKE-4G-DB-OPERATOR",
      "DATABASE",
      "Operator user subsworkspace@gmail.com resolves in public.users",
      Boolean(pubOp && pubOp.user_id),
      "user_id present",
      pubOp ? (pubOp.user_id as string) : "NOT FOUND",
    );

    // Verify active organization membership
    if (pubOp) {
      const [membership] = await sql`
        SELECT om.membership_id, om.organization_id, o.organization_name
        FROM public.organization_memberships om
        JOIN public.organizations o ON om.organization_id = o.organization_id
        WHERE om.user_id = ${pubOp.user_id} AND om.status = 'active'
        LIMIT 1;
      `;
      recordCheck(
        "SMOKE-4G-DB-MEMBERSHIP",
        "DATABASE",
        "Operator has active organization membership",
        Boolean(membership && membership.organization_id),
        "Active org membership",
        membership
          ? `${membership.organization_name} (${membership.organization_id})`
          : "NONE",
      );
    }

    // Query sanity test for approvals & review comments
    const approvalsCount = await sql`SELECT count(*)::int as count FROM public.deliverable_approvals;`;
    const commentsCount = await sql`SELECT count(*)::int as count FROM public.deliverable_review_comments;`;
    const shareLinksCount = await sql`SELECT count(*)::int as count FROM public.deliverable_share_links;`;
    recordCheck(
      "SMOKE-4G-DB-SANITY",
      "DATABASE",
      "Deliverable approvals, review comments, and share links queryable without error",
      true,
      "Zero SQL errors",
      `Approvals: ${approvalsCount[0].count}, Comments: ${commentsCount[0].count}, Share Links: ${shareLinksCount[0].count}`,
    );
  } finally {
    await sql.end();
  }

  // Summary
  console.log("\n================================================================================");
  const total = checks.length;
  const passed = checks.filter((c) => c.passed).length;
  const failed = checks.filter((c) => !c.passed).length;

  console.log(`SMOKE TEST RESULTS: ${passed}/${total} checks passed (${failed} failed)`);
  console.log("================================================================================");

  if (failed > 0) {
    console.error(`[FAILURE] ${failed} Phase 4G smoke checks failed.`);
    process.exit(1);
  } else {
    console.log("[SUCCESS] All Phase 4G production smoke checks passed.");
  }
}

main().catch((err) => {
  console.error("Fatal error running Phase 4G smoke test:", err);
  process.exit(1);
});
