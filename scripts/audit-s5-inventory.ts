/**
 * S5 Inventory & Audit Script
 * Runs against a disposable local database `nexos_s5_disposable`.
 * Applies 0000 -> 0018.
 * Inspects all tables, RLS flags, policies, SECURITY DEFINER functions, grants, and dependencies.
 */

import postgres from "postgres";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ADMIN_URL = "postgresql://postgres@localhost:5432/postgres";
const TARGET_DB = "nexos_s5_disposable";
const DB_URL = `postgresql://postgres@localhost:5432/${TARGET_DB}`;

async function main() {
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
    // Setup auth schema & extensions
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
    `);

    await sql.unsafe(`
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
    ];

    for (const file of migrationFiles) {
      const content = readFileSync(join(migrationsFolder, file), "utf8");
      await sql.unsafe(content);
    }
    console.log("All 19 migrations applied cleanly.");

    // Query 1: All tables in public schema and their RLS status
    const tables = await sql`
      SELECT
        c.relname as table_name,
        c.relrowsecurity as rls_enabled,
        c.relforcerowsecurity as rls_forced
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
      ORDER BY c.relname;
    `;

    // Query 2: All RLS policies
    const policies = await sql`
      SELECT
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `;

    // Query 3: All SECURITY DEFINER functions
    const secDefFunctions = await sql`
      SELECT
        n.nspname as schema_name,
        p.proname as function_name,
        pg_get_function_identity_arguments(p.oid) as arguments,
        pg_get_function_result(p.oid) as result_type,
        p.prosecdef as is_security_definer,
        p.provolatile as volatility,
        p.proconfig as config_settings,
        pg_get_userbyid(p.proowner) as owner,
        pg_get_functiondef(p.oid) as definition
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname IN ('public', 'app')
        AND p.prosecdef = true
      ORDER BY n.nspname, p.proname;
    `;

    // Query 4: All functions in app schema (whether secdef or not)
    const appFunctions = await sql`
      SELECT
        p.proname as function_name,
        pg_get_function_identity_arguments(p.oid) as arguments,
        pg_get_function_result(p.oid) as result_type,
        p.prosecdef as is_security_definer,
        p.proconfig as config_settings,
        pg_get_functiondef(p.oid) as definition
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'app'
      ORDER BY p.proname;
    `;

    // Query 5: Grants on tables for anon, authenticated, service_role, public
    const tableGrants = await sql`
      SELECT
        table_name,
        grantee,
        privilege_type
      FROM information_schema.table_privileges
      WHERE table_schema = 'public'
        AND grantee IN ('anon', 'authenticated', 'service_role', 'PUBLIC')
      ORDER BY table_name, grantee, privilege_type;
    `;

    // Query 6: Function execute grants
    const routineGrants = await sql`
      SELECT
        routine_schema,
        routine_name,
        grantee,
        privilege_type
      FROM information_schema.routine_privileges
      WHERE routine_schema IN ('public', 'app')
        AND grantee IN ('anon', 'authenticated', 'service_role', 'PUBLIC')
      ORDER BY routine_schema, routine_name, grantee;
    `;

    const inventoryData = {
      tables,
      policies,
      secDefFunctions,
      appFunctions,
      tableGrants,
      routineGrants,
    };

    writeFileSync(
      join(process.cwd(), "scripts", "s5-inventory-raw.json"),
      JSON.stringify(inventoryData, null, 2),
      "utf8",
    );
    console.log(`Saved inventory: ${tables.length} tables, ${policies.length} policies, ${secDefFunctions.length} secdef functions.`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("Error running inventory:", err);
  process.exit(1);
});
