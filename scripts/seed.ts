/**
 * AI NEX OS — bootstrap seed (Milestone 1).
 *
 * Provisions, idempotently:
 *   1. The organization (from SEED_ORG_* env — never hardcoded, refinement #4)
 *   2. The six system roles with their permission maps
 *   3. Default departments
 *   4. The Owner auth account (Supabase Auth) + internal user profile
 *
 * Usage:
 *   npm run db:seed -- --environment=staging
 *   npm run db:seed -- --environment=production --confirm-production
 *
 * Required env (see .env.example):
 *   DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   SEED_ORG_NAME, SEED_ORG_SLUG, SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD,
 *   SEED_OWNER_FIRST_NAME [, SEED_OWNER_LAST_NAME, SEED_ORG_TIMEZONE,
 *   SEED_ORG_CURRENCY]
 *
 * TARGET SELECTION — this is the most dangerous command in the repository. It
 * creates an organization, the system roles, the default departments and a
 * Supabase Auth account whose password comes from SEED_OWNER_PASSWORD. Run
 * against production by accident, it does all of that to the live tenant.
 *
 * Production therefore takes TWO independent statements of intent, and the
 * second exists for a specific reason: `--environment=production` is a phrase
 * an operator may type from muscle memory while working down a runbook, and
 * `--confirm-production` is not. There is no interactive prompt, because a
 * prompt is answered by whoever is already committed to pressing enter, and it
 * protects a non-interactive shell not at all.
 */
import {
  describeTarget,
  prepareToolingTarget,
  type ToolingTarget,
} from "./lib/environment";
import { EnvironmentGuardError } from "./lib/project-ref";

const target: ToolingTarget = prepareToolingTarget("db:seed");

if (
  target.environment === "production" &&
  !process.argv.includes("--confirm-production")
) {
  throw new EnvironmentGuardError(
    `REFUSING TO SEED PRODUCTION.\n\n` +
      `db:seed creates an organization, the system roles, the default ` +
      `departments and an Auth owner account with a known password. Against ` +
      `production those are a real tenant and a real credentialed account.\n\n` +
      `If that is genuinely the intent, say so a second time:\n\n` +
      `  npm run db:seed -- --environment=production --confirm-production\n`,
  );
}

import { createClient } from "@supabase/supabase-js";
import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import { SYSTEM_ROLES } from "../src/features/permissions/constants";

const DEFAULT_DEPARTMENTS = [
  "Creative",
  "AI Production",
  "Prompt Engineering",
  "Design",
  "Video Editing",
  "Development",
  "Operations",
];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const databaseUrl = requireEnv("DATABASE_URL");
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const orgName = requireEnv("SEED_ORG_NAME");
  const orgSlug = requireEnv("SEED_ORG_SLUG");
  const ownerEmail = requireEnv("SEED_OWNER_EMAIL").toLowerCase();
  const ownerPassword = requireEnv("SEED_OWNER_PASSWORD");
  const ownerFirstName = requireEnv("SEED_OWNER_FIRST_NAME");
  const ownerLastName = process.env["SEED_OWNER_LAST_NAME"] ?? null;

  const client = postgres(databaseUrl, { prepare: false, max: 1 });
  const db = drizzle(client, { schema, casing: "snake_case" });
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("\nAI NEX OS — bootstrap seed\n");
  console.log(describeTarget(target));
  console.log("");
  console.log(`Seeding organization "${orgName}" (${orgSlug})…`);

  // 1–3. Organization, system roles, departments — one atomic unit
  // (DBD §47: critical multi-step writes are transactional).
  const { org, roleIds } = await db.transaction(async (tx) => {
    let [org] = await tx
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.slug, orgSlug));

    if (!org) {
      [org] = await tx
        .insert(schema.organizations)
        .values({
          organizationName: orgName,
          slug: orgSlug,
          codePrefix:
            process.env["SEED_ORG_CODE_PREFIX"] ??
            (orgSlug === "ai-collective" ? "AIC" : "NEX"),
          timezone: process.env["SEED_ORG_TIMEZONE"] ?? "Asia/Kolkata",
          currency: process.env["SEED_ORG_CURRENCY"] ?? "INR",
          contactEmail: ownerEmail,
        })
        .returning();
      console.log(`  ✓ organization created (${org.organizationId})`);
    } else {
      console.log(`  ✓ organization exists (${org.organizationId})`);
    }

    const roleIds = new Map<string, string>();
    for (const role of SYSTEM_ROLES) {
      const [existing] = await tx
        .select()
        .from(schema.roles)
        .where(
          and(
            eq(schema.roles.organizationId, org.organizationId),
            eq(schema.roles.roleKey, role.roleKey),
          ),
        );
      if (existing) {
        roleIds.set(role.roleKey, existing.roleId);
        continue;
      }
      const [created] = await tx
        .insert(schema.roles)
        .values({
          organizationId: org.organizationId,
          roleKey: role.roleKey,
          roleName: role.roleName,
          description: role.description,
          permissions: role.permissions as Record<string, string[]>,
          isSystem: true,
        })
        .returning();
      roleIds.set(role.roleKey, created.roleId);
      console.log(`  ✓ role "${role.roleName}" created`);
    }

    for (const departmentName of DEFAULT_DEPARTMENTS) {
      const [existing] = await tx
        .select()
        .from(schema.departments)
        .where(
          and(
            eq(schema.departments.organizationId, org.organizationId),
            eq(schema.departments.departmentName, departmentName),
          ),
        );
      if (!existing) {
        await tx.insert(schema.departments).values({
          organizationId: org.organizationId,
          departmentName,
        });
        console.log(`  ✓ department "${departmentName}" created`);
      }
    }

    return { org, roleIds };
  });

  // 4. Owner account -----------------------------------------------------
  const ownerRoleId = roleIds.get("owner");
  if (!ownerRoleId) throw new Error("Owner role missing after seeding");

  // Find-or-create the Supabase Auth user (paginated — listUsers returns
  // 50 per page, so a single call misses accounts on later pages).
  let authUserId: string | undefined;
  for (let page = 1; !authUserId; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    authUserId = data.users.find(
      (u) => u.email?.toLowerCase() === ownerEmail,
    )?.id;
    if (data.users.length < 200) break;
  }

  if (!authUserId) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
    });
    if (error || !data.user) {
      throw new Error(`Failed to create auth user: ${error?.message}`);
    }
    authUserId = data.user.id;
    console.log(`  ✓ auth user created (${authUserId})`);
  } else {
    console.log(`  ✓ auth user exists (${authUserId})`);
  }

  const [existingProfile] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.userId, authUserId));

  if (!existingProfile) {
    await db.insert(schema.users).values({
      userId: authUserId,
      organizationId: org.organizationId,
      roleId: ownerRoleId,
      firstName: ownerFirstName,
      lastName: ownerLastName,
      email: ownerEmail,
      designation: "Owner",
      timezone: process.env["SEED_ORG_TIMEZONE"] ?? "Asia/Kolkata",
    });
    console.log(`  ✓ owner profile created`);
  } else {
    console.log(`  ✓ owner profile exists`);
  }

  // Ensure active organization membership for owner (Phase 3 multi-membership foundation)
  const [existingMembership] = await db
    .select()
    .from(schema.organizationMemberships)
    .where(
      and(
        eq(schema.organizationMemberships.userId, authUserId),
        eq(schema.organizationMemberships.organizationId, org.organizationId),
      ),
    );

  if (!existingMembership) {
    await db.insert(schema.organizationMemberships).values({
      userId: authUserId,
      organizationId: org.organizationId,
      roleId: ownerRoleId,
      designation: "Owner",
      status: "active",
      isDefault: true,
    });
    console.log(`  ✓ owner organization membership created`);
  } else {
    console.log(`  ✓ owner organization membership exists`);
  }

  await client.end();
  console.log("Seed complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
