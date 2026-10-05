/**
 * S5.1 SECURITY DEFINER Catalog Inspection Script
 * Sets up nexos_s5_1_disposable, applies 0000 -> 0019, and queries all details.
 */

import postgres from "postgres";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ADMIN_URL = "postgresql://postgres@localhost:5432/postgres";
const TARGET_DB = "nexos_s5_1_disposable";
const DB_URL = `postgresql://postgres@localhost:5432/${TARGET_DB}`;

async function main() {
  const adminSql = postgres(ADMIN_URL, { prepare: false });
  try {
    await adminSql.unsafe(`DROP DATABASE IF EXISTS ${TARGET_DB};`);
    await adminSql.unsafe(`CREATE DATABASE ${TARGET_DB};`);
  } finally {
    await adminSql.end();
  }

  const sql = postgres(DB_URL, { prepare: false });

  try {
    // Basic setup
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
    ];

    for (const f of migrationFiles) {
      const content = readFileSync(join(migrationsFolder, f), "utf8");
      await sql.unsafe(content);
    }
    console.log("Applied 0000 -> 0019 cleanly.");

    // Query all SECURITY DEFINER functions in all user schemas
    const fns = await sql`
      SELECT
        n.nspname AS schema_name,
        p.proname AS function_name,
        pg_get_function_identity_arguments(p.oid) AS arguments,
        pg_get_function_result(p.oid) AS return_type,
        pg_get_userbyid(p.proowner) AS owner,
        CASE p.provolatile
          WHEN 'i' THEN 'IMMUTABLE'
          WHEN 's' THEN 'STABLE'
          WHEN 'v' THEN 'VOLATILE'
        END AS volatility,
        l.lanname AS language,
        p.prosecdef AS is_security_definer,
        p.proconfig AS config,
        p.prosrc AS body,
        pg_get_functiondef(p.oid) AS full_def
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      JOIN pg_language l ON l.oid = p.prolang
      WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
        AND p.prosecdef = true
      ORDER BY n.nspname, p.proname;
    `;

    console.log(`Found ${fns.length} SECURITY DEFINER functions:`);
    for (const fn of fns) {
      console.log(
        `\n============================================================`,
      );
      console.log(
        `${fn.schema_name}.${fn.function_name}(${fn.arguments}) -> ${fn.return_type}`,
      );
      console.log(
        `Owner: ${fn.owner} | Volatility: ${fn.volatility} | Language: ${fn.language}`,
      );
      console.log(`Config: ${JSON.stringify(fn.config)}`);
      console.log(`Definition:`);
      console.log(fn.full_def);

      // Check grants on this function
      const privs = await sql`
        SELECT grantee, privilege_type
        FROM information_schema.routine_privileges
        WHERE routine_schema = ${fn.schema_name}
          AND routine_name = ${fn.function_name}
        ORDER BY grantee;
      `;
      console.log(`Grants:`, privs);
    }
  } finally {
    await sql.end();
  }
}

main().catch(console.error);
