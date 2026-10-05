/**
 * AI NEX OS — PHASE S5.2.1 RLS CATALOG FORENSIC INVESTIGATION SCRIPT
 *
 * READ-ONLY query against Staging (shnzzbbtydmvfhgeoysg):
 * 1. Counts public ordinary tables (relkind = 'r').
 * 2. Counts RLS-enabled tables (relrowsecurity = true).
 * 3. Counts FORCE RLS tables (relforcerowsecurity = true).
 * 4. Counts RLS-disabled tables (relrowsecurity = false).
 * 5. Lists all RLS-enabled tables with policy count.
 * 6. Lists all RLS-disabled tables.
 * 7. Reconciles policies in pg_policies.
 */

import { prepareToolingTarget } from "./lib/environment";
import postgres from "postgres";

const target = prepareToolingTarget("forensic-s5-2-1-staging");

async function main() {
  console.log(
    "================================================================================",
  );
  console.log("AI NEX OS — S5.2.1 STAGING RLS CATALOG FORENSIC QUERY");
  console.log(`Target: ${target.environment} (${target.projectRef})`);
  console.log(
    "================================================================================\n",
  );

  if (target.projectRef !== "shnzzbbtydmvfhgeoysg") {
    console.error(
      `FATAL: Unexpected projectRef ${target.projectRef}, expected shnzzbbtydmvfhgeoysg`,
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
    // 1. Raw Catalog Table Breakdown
    const tables = await sql<
      {
        relname: string;
        relrowsecurity: boolean;
        relforcerowsecurity: boolean;
        policy_count: number;
      }[]
    >`
      SELECT
        c.relname,
        c.relrowsecurity,
        c.relforcerowsecurity,
        coalesce(p.policy_count, 0)::int as policy_count
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN (
        SELECT tablename, count(*)::int as policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
        GROUP BY tablename
      ) p ON p.tablename = c.relname
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
      ORDER BY c.relname ASC;
    `;

    const totalPublic = tables.length;
    const rlsEnabled = tables.filter((t) => t.relrowsecurity);
    const rlsDisabled = tables.filter((t) => !t.relrowsecurity);
    const forceRls = tables.filter((t) => t.relforcerowsecurity);

    console.log("--- 1. AGGREGATE CATALOG METRICS ---");
    console.log(`Total Public Ordinary Tables:        ${totalPublic}`);
    console.log(`RLS-Enabled Tables (relrowsecurity): ${rlsEnabled.length}`);
    console.log(`RLS-Disabled Tables:                 ${rlsDisabled.length}`);
    console.log(`FORCE RLS Tables:                    ${forceRls.length}\n`);

    // 2. Policy Aggregate Metrics
    const [policyTotal] = await sql`
      SELECT count(*)::int as count FROM pg_policies WHERE schemaname = 'public';
    `;
    console.log("--- 2. POLICY METRICS ---");
    console.log(`Total Policies in public schema:     ${policyTotal.count}`);

    const tablesWithPolicies = tables.filter((t) => t.policy_count > 0);
    const tablesWithoutPolicies = tables.filter((t) => t.policy_count === 0);
    console.log(
      `Tables with >= 1 Policy:             ${tablesWithPolicies.length}`,
    );
    console.log(
      `Tables with 0 Policies:              ${tablesWithoutPolicies.length}\n`,
    );

    // 3. Complete RLS-Enabled Table List
    console.log(
      `--- 3. COMPLETE RLS-ENABLED TABLE LIST (${rlsEnabled.length}) ---`,
    );
    for (const t of rlsEnabled) {
      console.log(
        `  - ${t.relname.padEnd(45)} | RLS: ${String(t.relrowsecurity).padEnd(5)} | FORCE: ${String(t.relforcerowsecurity).padEnd(5)} | Policies: ${t.policy_count}`,
      );
    }

    // 4. Complete Non-RLS Table List
    console.log(
      `\n--- 4. COMPLETE NON-RLS TABLE LIST (${rlsDisabled.length}) ---`,
    );
    for (const t of rlsDisabled) {
      console.log(
        `  - ${t.relname.padEnd(45)} | RLS: ${String(t.relrowsecurity).padEnd(5)} | FORCE: ${String(t.relforcerowsecurity).padEnd(5)} | Policies: ${t.policy_count}`,
      );
    }

    // 5. Tables with RLS enabled but 0 policies
    const rlsNoPolicies = rlsEnabled.filter((t) => t.policy_count === 0);
    console.log(
      `\n--- 5. RLS-ENABLED TABLES WITH 0 POLICIES (${rlsNoPolicies.length}) ---`,
    );
    for (const t of rlsNoPolicies) {
      console.log(`  - ${t.relname}`);
    }

    // 6. Policy distribution across tables
    console.log("\n--- 6. POLICY DISTRIBUTION BY TABLE ---");
    for (const t of tablesWithPolicies) {
      console.log(
        `  - ${t.relname.padEnd(45)}: ${t.policy_count} policy/policies`,
      );
    }
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("Forensic script error:", err);
  process.exit(1);
});
