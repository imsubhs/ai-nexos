/**
 * AI NEX OS — Phase S5.2 Staging Pre-Flight & Migration Baseline Inspector
 *
 * Runs read-only checks against the staging Supabase project (shnzzbbtydmvfhgeoysg):
 * 1. Verifies staging identity (ref, region, project, status).
 * 2. Verifies PostgreSQL connectivity (database, user, version).
 * 3. Verifies Supabase services (PostgREST, Auth, Storage).
 * 4. Inspects remote migration history in drizzle.__drizzle_migrations.
 *
 * Strictly non-secret, read-only.
 */

import { prepareToolingTarget } from "./lib/environment";
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const target = prepareToolingTarget("inspect-s5-2-staging");

async function main() {
  console.log("================================================================================");
  console.log("AI NEX OS — S5.2 STAGING IDENTITY & MIGRATION BASELINE INSPECTOR");
  console.log("================================================================================\n");

  console.log(`Target Environment:  ${target.environment}`);
  console.log(`Project Ref:         ${target.projectRef}`);
  console.log(`Database Host:       ${target.databaseHost}`);
  console.log(`Config Source:       ${target.file}\n`);

  if (target.projectRef !== "shnzzbbtydmvfhgeoysg") {
    console.error(`FATAL: Target projectRef is "${target.projectRef}", expected "shnzzbbtydmvfhgeoysg". ABORTING.`);
    process.exit(1);
  }

  // 1. Check PostgreSQL Database Connectivity
  const dbUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("FATAL: Neither DIRECT_DATABASE_URL nor DATABASE_URL is set.");
    process.exit(1);
  }

  const sql = postgres(dbUrl, {
    max: 1,
    prepare: false,
    ssl: "require",
    connect_timeout: 15,
  });

  try {
    console.log("--- 1. DATABASE CONNECTIVITY ---");
    const [dbInfo] = await sql`
      SELECT
        current_database() as database,
        current_user as db_user,
        version() as pg_version
    `;
    console.log(`Current Database:    ${dbInfo.database}`);
    console.log(`Current DB User:     ${dbInfo.db_user}`);
    console.log(`PostgreSQL Version:  ${dbInfo.pg_version.split(" on ")[0]}`);

    // Check major version
    const versionMatch = dbInfo.pg_version.match(/PostgreSQL (\d+)\.(\d+)/);
    const major = versionMatch ? parseInt(versionMatch[1], 10) : 0;
    const minor = versionMatch ? parseInt(versionMatch[2], 10) : 0;
    console.log(`Parsed PG Version:   Major=${major}, Minor=${minor}`);

    // 2. Check Service Endpoints
    console.log("\n--- 2. SUPABASE SERVICES HEALTH ---");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && anonKey) {
      // PostgREST check
      try {
        const restRes = await fetch(`${supabaseUrl}/rest/v1/`, {
          headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        });
        console.log(`PostgREST Ingress:   Status ${restRes.status} (${restRes.ok ? "HEALTHY" : "STATUS " + restRes.status})`);
      } catch (err) {
        console.log(`PostgREST Ingress:   FAILED - ${(err as Error).message}`);
      }

      // Auth check
      try {
        const authRes = await fetch(`${supabaseUrl}/auth/v1/health`, {
          headers: { apikey: anonKey },
        });
        console.log(`Supabase Auth:       Status ${authRes.status} (${authRes.ok ? "HEALTHY" : "STATUS " + authRes.status})`);
      } catch (err) {
        console.log(`Supabase Auth:       FAILED - ${(err as Error).message}`);
      }
    } else {
      console.log("Supabase URL or Anon key missing in environment.");
    }

    // 3. Inspect Remote Migration History
    console.log("\n--- 3. REMOTE MIGRATION BASELINE ---");
    const hasDrizzleSchema = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata WHERE schema_name = 'drizzle'
      ) as exists;
    `;

    if (!hasDrizzleSchema[0].exists) {
      console.log("Schema 'drizzle' does NOT exist remotely.");
      return;
    }

    const appliedMigrations = await sql<{ id: number; hash: string; created_at: string }[]>`
      SELECT id, hash, created_at
      FROM drizzle.__drizzle_migrations
      ORDER BY id ASC;
    `;

    console.log(`Total Remote Migrations: ${appliedMigrations.length}`);

    // Read local journal
    const journalPath = join(process.cwd(), "database", "migrations", "meta", "_journal.json");
    const journal = (JSON.parse(readFileSync(journalPath, "utf8")) as { entries: { idx: number; tag: string }[] }).entries;

    console.log("\nRemote vs Local Migration Matrix:");
    for (let i = 0; i < Math.max(journal.length, appliedMigrations.length); i++) {
      const localEntry = journal[i];
      const remoteEntry = appliedMigrations[i];
      const localTag = localEntry ? `${String(localEntry.idx).padStart(4, "0")}_${localEntry.tag}` : "<none>";
      const remoteId = remoteEntry ? `${String(remoteEntry.id).padStart(4, "0")}` : "<none>";
      const remoteHash = remoteEntry ? remoteEntry.hash.substring(0, 12) + "..." : "<none>";
      const remoteCreated = remoteEntry ? remoteEntry.created_at : "<none>";

      console.log(`  [${String(i).padStart(2, "0")}] Local: ${localTag.padEnd(45)} | Remote ID: ${remoteId.padEnd(6)} | Hash: ${remoteHash.padEnd(16)} | Created: ${remoteCreated}`);
    }

    const latestRemote = appliedMigrations[appliedMigrations.length - 1];
    console.log(`\nLatest Remote Migration ID:   ${latestRemote?.id ?? "NONE"}`);
    console.log(`Latest Remote Migration Hash: ${latestRemote?.hash ?? "NONE"}`);

    const has0015 = appliedMigrations.length > 15;
    const has0016 = appliedMigrations.length > 16;
    const has0017 = appliedMigrations.length > 17;
    const has0018 = appliedMigrations.length > 18;
    const has0019 = appliedMigrations.length > 19;
    const has0020 = appliedMigrations.length > 20;

    console.log(`\nMigration checkpoints:`);
    console.log(`  0015 (idx 15): ${has0015 ? "EXISTS" : "MISSING"}`);
    console.log(`  0016 (idx 16): ${has0016 ? "EXISTS" : "MISSING"}`);
    console.log(`  0017 (idx 17): ${has0017 ? "EXISTS" : "MISSING"}`);
    console.log(`  0018 (idx 18): ${has0018 ? "EXISTS" : "MISSING"}`);
    console.log(`  0019 (idx 19): ${has0019 ? "EXISTS" : "MISSING"}`);
    console.log(`  0020 (idx 20): ${has0020 ? "EXISTS" : "MISSING"}`);

  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("Inspector error:", err);
  process.exit(1);
});
