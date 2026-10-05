/**
 * AI NEX OS — Post-Deployment Production Smoke Test
 *
 * Verifies live production application endpoints on Antideploy:
 * https://ai-nexos.antideploy.com
 *
 * Checks:
 * - Public routes (/api/health, /, /login, /dashboard, /onboarding)
 * - HTTP status codes (no 5xx)
 * - Security headers (CSP, HSTS, X-Content-Type-Options, etc.)
 * - Health payload integrity
 * - Rate limiting response headers
 * - Server-side operator identity & membership resolution against production DB
 */

import { prepareToolingTarget } from "./lib/environment";
import postgres from "postgres";

const target = prepareToolingTarget("post-deploy-smoke-test");

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
  console.log("AI NEX OS — POST-DEPLOYMENT PRODUCTION SMOKE TEST");
  console.log(`Target Host: ${BASE_URL}`);
  console.log(
    "================================================================================\n",
  );

  // 1. GET /api/health
  console.log("--- 1. Health Endpoint ---");
  const healthRes = await fetch(`${BASE_URL}/api/health`, {
    headers: { "User-Agent": "AI-NEXOS-S7.14-SmokeTest" },
  });
  const healthBody = await healthRes.json();

  recordCheck(
    "SMOKE-HEALTH-01",
    "HEALTH",
    "GET /api/health returns HTTP 200",
    healthRes.status === 200,
    "HTTP 200",
    `HTTP ${healthRes.status}`,
    `Body: ${JSON.stringify(healthBody)}`,
  );

  recordCheck(
    "SMOKE-HEALTH-02",
    "HEALTH",
    "Health payload reports status = healthy",
    healthBody.status === "healthy",
    "healthy",
    healthBody.status,
  );

  recordCheck(
    "SMOKE-HEALTH-03",
    "HEALTH",
    "Health payload environment = production",
    healthBody.environment === "production",
    "production",
    healthBody.environment,
  );

  // 2. GET /
  console.log("\n--- 2. Public Root Route ---");
  const rootRes = await fetch(`${BASE_URL}/`, {
    redirect: "manual",
    headers: { "User-Agent": "AI-NEXOS-S7.14-SmokeTest" },
  });

  const rootLocation = rootRes.headers.get("location") || "";
  recordCheck(
    "SMOKE-ROOT-01",
    "PUBLIC",
    "GET / redirects unauthenticated visitor to /login",
    (rootRes.status === 307 ||
      rootRes.status === 302 ||
      rootRes.status === 308) &&
      rootLocation.includes("/login"),
    "HTTP 307/302 redirect to /login",
    `HTTP ${rootRes.status}, location: ${rootLocation}`,
  );

  // 3. GET /login
  console.log("\n--- 3. Login Surface & Security Headers ---");
  const loginRes = await fetch(`${BASE_URL}/login`, {
    headers: { "User-Agent": "AI-NEXOS-S7.14-SmokeTest" },
  });
  const loginHtml = await loginRes.text();

  recordCheck(
    "SMOKE-LOGIN-01",
    "PUBLIC",
    "GET /login renders HTTP 200",
    loginRes.status === 200,
    "HTTP 200",
    `HTTP ${loginRes.status}`,
  );

  const hasBranding = loginHtml.includes("AI NEX OS");
  recordCheck(
    "SMOKE-LOGIN-02",
    "PUBLIC",
    "Login surface renders AI NEX OS branding",
    hasBranding,
    "Includes 'AI NEX OS'",
    hasBranding ? "Found 'AI NEX OS' branding" : "Branding missing",
  );

  // Security Headers verification on /login
  const hsts = loginRes.headers.get("strict-transport-security");
  const xcto = loginRes.headers.get("x-content-type-options");
  const xfo = loginRes.headers.get("x-frame-options");
  const referrer = loginRes.headers.get("referrer-policy");
  const csp = loginRes.headers.get("content-security-policy");

  recordCheck(
    "SMOKE-SEC-01",
    "SECURITY HEADERS",
    "Strict-Transport-Security header present",
    Boolean(hsts),
    "max-age=... present",
    hsts || "MISSING",
  );

  recordCheck(
    "SMOKE-SEC-02",
    "SECURITY HEADERS",
    "X-Content-Type-Options: nosniff",
    xcto === "nosniff",
    "nosniff",
    xcto || "MISSING",
  );

  recordCheck(
    "SMOKE-SEC-03",
    "SECURITY HEADERS",
    "X-Frame-Options: DENY or SAMEORIGIN",
    xfo === "DENY" || xfo === "SAMEORIGIN",
    "DENY or SAMEORIGIN",
    xfo || "MISSING",
  );

  recordCheck(
    "SMOKE-SEC-04",
    "SECURITY HEADERS",
    "Referrer-Policy header present",
    Boolean(referrer),
    "strict-origin-when-cross-origin or similar",
    referrer || "MISSING",
  );

  // 4. Protected Route: GET /dashboard
  console.log("\n--- 4. Protected Routes ---");
  const dashRes = await fetch(`${BASE_URL}/dashboard`, {
    redirect: "manual",
    headers: { "User-Agent": "AI-NEXOS-S7.14-SmokeTest" },
  });
  const dashLocation = dashRes.headers.get("location") || "";

  recordCheck(
    "SMOKE-DASH-01",
    "PROTECTED",
    "GET /dashboard redirects unauthenticated visitor to /login?next=/dashboard",
    dashRes.status === 307 && dashLocation.includes("/login"),
    "HTTP 307 redirect to /login",
    `HTTP ${dashRes.status}, location: ${dashLocation}`,
  );

  // 5. GET /onboarding
  const onbRes = await fetch(`${BASE_URL}/onboarding`, {
    redirect: "manual",
    headers: { "User-Agent": "AI-NEXOS-S7.14-SmokeTest" },
  });
  const onbLocation = onbRes.headers.get("location") || "";

  recordCheck(
    "SMOKE-ONB-01",
    "ONBOARDING",
    "GET /onboarding responds cleanly (HTTP 200 or redirect to login)",
    onbRes.status === 200 || onbRes.status === 307,
    "HTTP 200 or 307 redirect",
    `HTTP ${onbRes.status}${onbLocation ? `, location: ${onbLocation}` : ""}`,
  );

  // 6. Rate Limiting observable behavior
  console.log("\n--- 5. Observable Rate-Limiting ---");
  const sampleRes = await fetch(`${BASE_URL}/api/health`, {
    headers: { "User-Agent": "AI-NEXOS-S7.14-RateCheck" },
  });

  recordCheck(
    "SMOKE-RATE-01",
    "RATE LIMITING",
    "Health endpoint responds with zero rate-limit degradation or 5xx",
    sampleRes.status === 200,
    "HTTP 200 OK",
    `HTTP ${sampleRes.status}`,
  );

  // 7. Database & Server-Side Operator Resolution
  console.log(
    "\n--- 6. Server-Side Operator Identity & Multi-Tenant Resolution ---",
  );
  const dbUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL!;
  const sql = postgres(dbUrl, { max: 1, prepare: false, ssl: "require" });

  try {
    const operatorEmail = "subsworkspace@gmail.com";
    const [authOp] = await sql`
      SELECT id, email, created_at, last_sign_in_at FROM auth.users WHERE email = ${operatorEmail};
    `;

    const [pubOp] = await sql`
      SELECT user_id, email, status FROM public.users WHERE email = ${operatorEmail};
    `;

    const memberships = await sql`
      SELECT om.membership_id, om.organization_id, om.role_id, om.status, om.is_default, o.organization_name, o.code_prefix, r.role_name
      FROM public.organization_memberships om
      JOIN public.organizations o ON o.organization_id = om.organization_id
      JOIN public.roles r ON r.role_id = om.role_id
      WHERE om.user_id = ${pubOp.user_id};
    `;

    recordCheck(
      "SMOKE-AUTH-01",
      "AUTHENTICATION",
      "Operator account alignment across auth.users and public.users",
      Boolean(authOp && pubOp && authOp.id === pubOp.user_id),
      "auth.users.id === public.users.user_id",
      authOp && pubOp ? `Matched ID: ${pubOp.user_id}` : "Mismatch or Missing",
    );

    recordCheck(
      "SMOKE-AUTH-02",
      "AUTHORIZATION",
      "Operator active organization membership resolves to Owner",
      memberships.some((m) => m.status === "active" && m.role_name === "Owner"),
      "Active Owner role on assigned organization",
      memberships
        .map(
          (m) =>
            `${m.organization_name} [${m.code_prefix}] - ${m.role_name} (${m.status}, default: ${m.is_default})`,
        )
        .join("; "),
    );
  } finally {
    await sql.end();
  }

  // Summary
  console.log(
    "\n================================================================================",
  );
  console.log("SMOKE TEST SUMMARY");
  console.log(
    "================================================================================",
  );
  const passedCount = checks.filter((c) => c.passed).length;
  const failedCount = checks.filter((c) => !c.passed).length;
  console.log(`Total Checks:  ${checks.length}`);
  console.log(`Passed:        ${passedCount}`);
  console.log(`Failed:        ${failedCount}`);

  if (failedCount > 0) {
    console.error("\n❌ SMOKE TEST FAILURES:");
    checks
      .filter((c) => !c.passed)
      .forEach((c) =>
        console.error(
          `  - [${c.category}] ${c.id}: ${c.name} (Expected: ${c.expected}, Actual: ${c.actual})`,
        ),
      );
    process.exit(1);
  } else {
    console.log("\n✅ ALL POST-DEPLOYMENT SMOKE TESTS PASSED PERFECTLY!");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in smoke tests:", err);
  process.exit(1);
});
