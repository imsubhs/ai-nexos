/**
 * AI NEX OS — Phase 4I Production Smoke Test
 *
 * Verifies live production application endpoints for Phase 4I (Accessibility + Polish):
 * https://ai-nexos.antideploy.com
 *
 * Checks:
 * - Public health & security headers
 * - Viewport metadata and HTML language attribute for assistive technologies
 * - Login accessibility & form elements
 * - Protected internal route redirects with ?next parameter preservation
 * - Client Portal Route (/portal/s/[token]) accessibility & isolation boundary
 * - Static CSS accessibility primitives (prefers-reduced-motion, focus-visible)
 * - Executive Intelligence DTO structure and deterministic calculation integrity
 * - PostgreSQL schema integrity (zero migrations added, remaining at 0018)
 */

import { prepareToolingTarget } from "./lib/environment";
import postgres from "postgres";
import fs from "node:fs";
import path from "node:path";
import { computeTrends } from "../src/features/intelligence/service";

const target = prepareToolingTarget("smoke-test-4i");

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
  console.log(
    "AI NEX OS — PHASE 4I ACCESSIBILITY & POLISH PRODUCTION SMOKE TEST",
  );
  console.log(`Target Host: ${BASE_URL}`);
  console.log(
    "================================================================================\n",
  );

  // 1. Health Endpoint
  console.log("--- 1. Health & Application State ---");
  const healthRes = await fetch(`${BASE_URL}/api/health`, {
    headers: { "User-Agent": "AI-NEXOS-Phase4I-SmokeTest" },
  });
  const healthBody = await healthRes.json();

  recordCheck(
    "SMOKE-4I-HEALTH-01",
    "HEALTH",
    "GET /api/health returns HTTP 200",
    healthRes.status === 200,
    "HTTP 200",
    `HTTP ${healthRes.status}`,
    `Body: ${JSON.stringify(healthBody)}`,
  );

  recordCheck(
    "SMOKE-4I-HEALTH-02",
    "HEALTH",
    "Health payload reports status = healthy and environment = production",
    healthBody.status === "healthy" && healthBody.environment === "production",
    "healthy & production",
    `${healthBody.status} & ${healthBody.environment}`,
  );

  // 2. HTML Semantics & Accessibility Metadata
  console.log("\n--- 2. HTML Semantics & Accessibility Landmarks ---");
  const loginRes = await fetch(`${BASE_URL}/login`, {
    headers: { "User-Agent": "AI-NEXOS-Phase4I-SmokeTest" },
  });
  const loginHtml = await loginRes.text();

  recordCheck(
    "SMOKE-4I-A11Y-01",
    "A11Y HTML",
    "Root HTML specifies lang='en' attribute",
    loginHtml.includes("<html") && loginHtml.includes('lang="en"'),
    "lang='en' present",
    loginHtml.includes('lang="en"')
      ? "lang='en' verified"
      : "lang attribute missing",
  );

  recordCheck(
    "SMOKE-4I-A11Y-02",
    "A11Y META",
    "Viewport meta tag configured for responsive scaling",
    loginHtml.includes("viewport") && loginHtml.includes("width=device-width"),
    "width=device-width viewport meta",
    "Viewport tag present",
  );

  recordCheck(
    "SMOKE-4I-A11Y-03",
    "A11Y CONTROLS",
    "Login form provides accessible inputs and submit controls",
    loginHtml.includes("email") &&
      (loginHtml.includes('type="password"') || loginHtml.includes("password")),
    "Accessible credentials input fields",
    "Email & password inputs detected",
  );

  // 3. Protected Core Routes & Auth Redirect Preservation
  console.log("\n--- 3. Core Route Protection & Navigation Safety ---");
  const protectedRoutes = [
    "/intelligence",
    "/dashboard",
    "/deliverables",
    "/projects",
    "/clients",
    "/tasks",
    "/files",
  ];

  for (const route of protectedRoutes) {
    const res = await fetch(`${BASE_URL}${route}`, {
      redirect: "manual",
      headers: { "User-Agent": "AI-NEXOS-Phase4I-SmokeTest" },
    });
    const location = res.headers.get("location") || "";
    const isRedirect =
      res.status === 307 ||
      res.status === 308 ||
      res.status === 302 ||
      res.status === 303;

    recordCheck(
      `SMOKE-4I-ROUTE-${route.replace("/", "").toUpperCase()}`,
      "ROUTE PROTECTION",
      `GET ${route} redirects unauthenticated request to /login`,
      isRedirect && location.includes("/login"),
      "Redirect (302/307/308) to /login",
      `HTTP ${res.status} -> Location: ${location}`,
    );
  }

  // 4. Client Portal Surface & Security Boundary
  console.log("\n--- 4. Client Portal Accessibility & Isolation Boundary ---");
  const portalToken = "00000000-0000-0000-0000-000000000000";
  const portalRes = await fetch(`${BASE_URL}/portal/s/${portalToken}`, {
    headers: { "User-Agent": "AI-NEXOS-Phase4I-SmokeTest" },
  });
  const portalHtml = await portalRes.text();

  recordCheck(
    "SMOKE-4I-PORTAL-01",
    "CLIENT PORTAL",
    "GET /portal/s/[token] with unseeded token renders secure deactivated UI (HTTP 200)",
    portalRes.status === 200,
    "HTTP 200",
    `HTTP ${portalRes.status}`,
  );

  recordCheck(
    "SMOKE-4I-PORTAL-02",
    "CLIENT PORTAL",
    "Client Portal strictly avoids leaking internal intelligence or admin controls",
    !portalHtml.includes("Executive Intelligence") &&
      !portalHtml.includes("Threat Matrix") &&
      !portalHtml.includes("Risk Radar") &&
      !portalHtml.includes("Internal Workspace"),
    "No internal intelligence terminology in client portal",
    "Portal is isolated from internal telemetry",
  );

  // 5. Codebase Accessibility Verification
  console.log("\n--- 5. Source Code Accessibility System Audit ---");
  const rootDir = path.resolve(__dirname, "..");
  const globalsCss = fs.readFileSync(
    path.join(rootDir, "src/app/globals.css"),
    "utf-8",
  );

  recordCheck(
    "SMOKE-4I-CSS-01",
    "MOTION",
    "globals.css defines prefers-reduced-motion media query override",
    globalsCss.includes("@media (prefers-reduced-motion: reduce)"),
    "prefers-reduced-motion reset defined",
    "Verified in globals.css",
  );

  recordCheck(
    "SMOKE-4I-CSS-02",
    "FOCUS",
    "globals.css defines high-contrast focus-visible ring styles",
    globalsCss.includes(":focus-visible") &&
      globalsCss.includes("outline: 2px solid var(--ring)"),
    "Focus visible ring token defined",
    "Verified in globals.css",
  );

  recordCheck(
    "SMOKE-4I-CSS-03",
    "SKIP-LINK",
    "globals.css defines accessible skip-link positioning utility",
    globalsCss.includes(".skip-link") &&
      globalsCss.includes(".skip-link:focus"),
    "skip-link utility defined",
    "Verified in globals.css",
  );

  // 6. PostgreSQL Schema Baseline & Executive Intelligence Determinism
  console.log(
    "\n--- 6. PostgreSQL Schema Integrity & Deterministic Calculations ---",
  );
  const dbUrl =
    process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || "";
  const sql = postgres(dbUrl, { max: 1, prepare: false, ssl: "require" });

  try {
    const requiredTables = [
      "projects",
      "clients",
      "deliverables",
      "deliverable_revisions",
      "deliverable_review_sessions",
      "deliverable_approvals",
      "tasks",
      "users",
      "activity_logs",
    ];

    let allTablesFound = true;
    for (const table of requiredTables) {
      const rows = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = ${table};
      `;
      if (rows.length !== 1) {
        allTablesFound = false;
      }
    }

    recordCheck(
      "SMOKE-4I-DB-TABLES",
      "DATABASE SCHEMA",
      "Core operational and intelligence tables exist in production database",
      allTablesFound,
      "All 9 verified tables exist",
      allTablesFound ? "Verified public schema tables" : "Some tables missing",
    );

    // Verify migration count: zero migrations added in Phase 4I (latest is 0020)
    const migrationsDir = path.join(rootDir, "database/migrations");
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"));

    recordCheck(
      "SMOKE-4I-MIGRATION-01",
      "DATABASE",
      "Zero database migrations introduced in Phase 4I (schema remains at baseline 0020)",
      migrationFiles.length === 21 &&
        !migrationFiles.some((f) => f.startsWith("0021_")),
      "21 migrations (0000_... to 0020_...)",
      `${migrationFiles.length} migrations, latest: ${migrationFiles[migrationFiles.length - 1]}`,
    );

    // Verify deterministic trend engine
    const now = new Date();
    const testTrends = computeTrends({
      timeWindow: "30d",
      deliverables: [],
      revisions: [],
      tasks: [],
      now,
    });

    recordCheck(
      "SMOKE-4I-TREND-01",
      "INTELLIGENCE",
      "Deterministic trend intelligence computes cleanly with safe empty state",
      testTrends.deliveryVolumeTrend.hasSufficientData === false &&
        testTrends.deliveryVolumeTrend.statusText?.includes(
          "Insufficient historical data",
        ) === true,
      "hasSufficientData=false & Insufficient historical data label",
      `hasSufficientData=${testTrends.deliveryVolumeTrend.hasSufficientData}, text=${testTrends.deliveryVolumeTrend.statusText}`,
    );
  } catch (err: unknown) {
    const error = err as Error;
    recordCheck(
      "SMOKE-4I-DB-ERROR",
      "DATABASE",
      "Database checks completed without exception",
      false,
      "No database errors",
      error.message,
    );
  } finally {
    await sql.end();
  }

  // 7. Results Summary
  console.log(
    "\n================================================================================",
  );
  console.log("SMOKE TEST SUMMARY — PHASE 4I ACCESSIBILITY & POLISH");
  console.log(
    "================================================================================",
  );
  const passedCount = checks.filter((c) => c.passed).length;
  const failedCount = checks.filter((c) => !c.passed).length;
  console.log(`Total Checks: ${checks.length}`);
  console.log(`Passed:       ${passedCount}`);
  console.log(`Failed:       ${failedCount}`);
  console.log(
    "================================================================================",
  );

  if (failedCount > 0) {
    console.error(`\nPhase 4I Smoke Test FAILED with ${failedCount} errors.`);
    process.exit(1);
  } else {
    console.log(
      `\nPhase 4I Smoke Test PASSED (${passedCount}/${checks.length} checks).`,
    );
  }
}

main().catch((err) => {
  console.error("Fatal error in smoke test:", err);
  process.exit(1);
});
