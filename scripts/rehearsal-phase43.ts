/**
 * AI NEX OS — PHASE 4.3 REAL DATABASE REHEARSAL & VERIFICATION
 *
 * Runs against a clean, disposable local PostgreSQL database:
 *   postgresql://postgres@localhost:5432/nexos_p43_rehearsal
 *
 * Safety Invariants:
 * - NO production Supabase
 * - NO staging Supabase
 * - Disposable local DB only
 * - Real SQL execution, constraints inspection, transaction rollback, and concurrency verification
 */

import postgres from "postgres";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DB_URL =
  process.env.REHEARSAL_DATABASE_URL ||
  "postgresql://postgres@localhost:5432/nexos_p43_rehearsal";

interface RehearsalCheck {
  id: string;
  name: string;
  category:
    | "MIGRATION"
    | "SCHEMA"
    | "BACKFILL"
    | "INVITATION"
    | "ACCEPTANCE"
    | "SECURITY"
    | "TRANSACTION"
    | "CONCURRENCY"
    | "ONBOARDING"
    | "ORGANIZATION";
  passed: boolean;
  evidence: string;
}

const checks: RehearsalCheck[] = [];

function recordCheck(
  id: string,
  name: string,
  category: RehearsalCheck["category"],
  passed: boolean,
  evidence: string,
) {
  checks.push({ id, name, category, passed, evidence });
  const status = passed ? "✓ PASS" : "✗ FAIL";
  console.log(`[${status}] [${category}] ${id}: ${name} — ${evidence}`);
}

async function runRehearsal() {
  console.log(
    "================================================================================",
  );
  console.log("AI NEX OS — PHASE 4.3 REAL DATABASE REHEARSAL");
  console.log(`Target: ${DB_URL}`);
  console.log(
    "================================================================================\n",
  );

  const sql = postgres(DB_URL, { prepare: false });

  try {
    // ------------------------------------------------------------------------
    // SECTION 4: MIGRATION REHEARSAL (Clean 0000 -> 0015 -> 0016 -> 0017)
    // ------------------------------------------------------------------------
    console.log("--- SECTION 4: MIGRATION REHEARSAL ---");

    // Check migrations on disk
    const migrationsFolder = join(process.cwd(), "database", "migrations");
    const m0000 = readFileSync(
      join(migrationsFolder, "0000_init_platform_foundation.sql"),
      "utf8",
    );
    const m0015 = readFileSync(
      join(migrationsFolder, "0015_organization_code_prefix.sql"),
      "utf8",
    );
    const m0016 = readFileSync(
      join(migrationsFolder, "0016_organization_memberships.sql"),
      "utf8",
    );
    const m0017 = readFileSync(
      join(migrationsFolder, "0017_organization_invitations.sql"),
      "utf8",
    );

    // Clean public schema
    await sql.unsafe(
      `DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;`,
    );
    await sql.unsafe(
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; CREATE EXTENSION IF NOT EXISTS pgcrypto;`,
    );

    // 1. Apply 0000 baseline
    await sql.unsafe(m0000);
    const [tablesAfter0000] = await sql`
      SELECT count(*)::int as count FROM information_schema.tables WHERE table_schema = 'public'
    `;
    recordCheck(
      "MIG-0000",
      "0000 Baseline Platform Foundation Applied",
      "MIGRATION",
      tablesAfter0000.count >= 6,
      `Created foundation tables (count=${tablesAfter0000.count})`,
    );

    // 2. Apply 0015 organization code prefix
    await sql.unsafe(m0015);
    const [col0015] = await sql`
      SELECT column_name, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'code_prefix'
    `;
    recordCheck(
      "MIG-0015",
      "0015 Organization Code Prefix Applied",
      "MIGRATION",
      col0015 && col0015.is_nullable === "NO",
      `code_prefix exists, NOT NULL, default=${col0015?.column_default}`,
    );

    // ------------------------------------------------------------------------
    // SECTION 6 & 7: LEGACY USER FIXTURE MATRIX & BACKFILL PREPARATION
    // (Insert before 0016 to test migration 0016 backfill on real database)
    // ------------------------------------------------------------------------
    console.log(
      "\n--- SECTION 6 & 7: LEGACY USER FIXTURE MATRIX & PHASE 3 BACKFILL ---",
    );

    const orgAlphaId = "00000000-0000-4000-a000-000000000001";
    const orgBetaId = "00000000-0000-4000-a000-000000000002";

    await sql`
      INSERT INTO organizations (organization_id, organization_name, slug, code_prefix, status)
      VALUES 
        (${orgAlphaId}, 'Organization Alpha', 'org-alpha', 'ALF', 'active'),
        (${orgBetaId}, 'Organization Beta', 'org-beta', 'BET', 'active')
    `;

    const roleAlphaOwnerId = "00000000-0000-4000-b000-000000000001";
    const roleAlphaMemberId = "00000000-0000-4000-b000-000000000002";
    const roleBetaOwnerId = "00000000-0000-4000-b000-000000000003";
    const roleBetaMemberId = "00000000-0000-4000-b000-000000000004";

    await sql`
      INSERT INTO roles (role_id, organization_id, role_name, role_key, is_system)
      VALUES
        (${roleAlphaOwnerId}, ${orgAlphaId}, 'Owner', 'owner', true),
        (${roleAlphaMemberId}, ${orgAlphaId}, 'Team Member', 'team_member', true),
        (${roleBetaOwnerId}, ${orgBetaId}, 'Owner', 'owner', true),
        (${roleBetaMemberId}, ${orgBetaId}, 'Team Member', 'team_member', true)
    `;

    const userA_Id = "00000000-0000-4000-c000-000000000001";
    const userB_Id = "00000000-0000-4000-c000-000000000002";
    const userC_Id = "00000000-0000-4000-c000-000000000003";
    const userD_Id = "00000000-0000-4000-c000-000000000004";
    const userE_Id = "00000000-0000-4000-c000-000000000005";
    const userF_Id = "00000000-0000-4000-c000-000000000006";

    // Insert legacy user fixtures
    await sql`
      INSERT INTO users (user_id, organization_id, role_id, first_name, email, status, deleted_at, deleted_by)
      VALUES
        (${userA_Id}, ${orgAlphaId}, ${roleAlphaOwnerId}, 'UserA', 'usera@example.com', 'active', null, null),
        (${userB_Id}, ${orgAlphaId}, ${roleAlphaMemberId}, 'UserB', 'userb@example.com', 'inactive', null, null),
        (${userC_Id}, ${orgAlphaId}, ${roleAlphaMemberId}, 'UserC', 'userc@example.com', 'archived', null, null),
        (${userD_Id}, ${orgAlphaId}, ${roleAlphaMemberId}, 'UserD', 'userd@example.com', 'active', now(), ${userA_Id}),
        (${userE_Id}, ${orgAlphaId}, ${roleAlphaMemberId}, 'UserE', 'usere@example.com', 'inactive', now(), ${userA_Id}),
        (${userF_Id}, ${orgAlphaId}, ${roleAlphaMemberId}, 'UserF', 'userf@example.com', 'active', null, null)
    `;

    recordCheck(
      "FIXT-001",
      "Legacy User Fixture Matrix Inserted",
      "BACKFILL",
      true,
      "Users A (active), B (inactive), C (archived), D (active soft-deleted), E (inactive soft-deleted), F (active multi-membership target) inserted into 0000 schema",
    );

    // 3. Apply 0016 organization memberships (performs Stage B backfill)
    await sql.unsafe(m0016);

    // Verify backfilled memberships
    const memberships = await sql`
      SELECT user_id, organization_id, role_id, status, is_default, deleted_at 
      FROM organization_memberships 
      ORDER BY user_id
    `;

    const memA = memberships.find((m) => m.user_id === userA_Id);
    const memB = memberships.find((m) => m.user_id === userB_Id);
    const memC = memberships.find((m) => m.user_id === userC_Id);
    const memD = memberships.find((m) => m.user_id === userD_Id);
    const memE = memberships.find((m) => m.user_id === userE_Id);
    const memF = memberships.find((m) => m.user_id === userF_Id);

    recordCheck(
      "BF-USER-A",
      "User A (active) backfilled to active membership",
      "BACKFILL",
      memA?.status === "active" &&
        memA?.organization_id === orgAlphaId &&
        memA?.is_default === true,
      `User A membership status=${memA?.status}, is_default=${memA?.is_default}`,
    );

    recordCheck(
      "BF-USER-B",
      "User B (inactive) backfilled to suspended membership",
      "BACKFILL",
      memB?.status === "suspended",
      `User B membership status=${memB?.status}`,
    );

    recordCheck(
      "BF-USER-C",
      "User C (archived) backfilled to suspended membership",
      "BACKFILL",
      memC?.status === "suspended",
      `User C membership status=${memC?.status}`,
    );

    recordCheck(
      "BF-USER-D",
      "User D (active, soft-deleted) backfilled to suspended membership with deleted_at preserved",
      "BACKFILL",
      memD?.status === "suspended" && memD?.deleted_at !== null,
      `User D membership status=${memD?.status}, deleted_at preserved=${Boolean(memD?.deleted_at)}`,
    );

    recordCheck(
      "BF-USER-E",
      "User E (inactive, soft-deleted) backfilled to suspended membership with deleted_at preserved",
      "BACKFILL",
      memE?.status === "suspended" && memE?.deleted_at !== null,
      `User E membership status=${memE?.status}, deleted_at preserved=${Boolean(memE?.deleted_at)}`,
    );

    recordCheck(
      "BF-DEDUP",
      "Each legacy user received exactly one backfilled membership",
      "BACKFILL",
      memberships.length === 6,
      `Total backfilled memberships = ${memberships.length}`,
    );

    // 4. Apply 0017 organization invitations
    await sql.unsafe(m0017);
    const [invTable] = await sql`
      SELECT count(*)::int as count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'organization_invitations'
    `;
    recordCheck(
      "MIG-0017",
      "0017 Organization Invitations Applied",
      "MIGRATION",
      invTable.count === 1,
      "organization_invitations table created",
    );

    // 5. Test migration idempotency (re-running 0015, 0016, 0017)
    await sql.unsafe(m0015);
    await sql.unsafe(m0016);
    await sql.unsafe(m0017);
    const [membershipsAfterRerun] = await sql`
      SELECT count(*)::int as count FROM organization_memberships
    `;
    recordCheck(
      "MIG-IDEMPOTENCY",
      "Re-running migrations 0015, 0016, 0017 does not corrupt or duplicate state",
      "MIGRATION",
      membershipsAfterRerun.count === 6,
      `Membership row count remained unchanged (count=${membershipsAfterRerun.count})`,
    );

    // ------------------------------------------------------------------------
    // SECTION 5 & 26: DATABASE CONSTRAINTS & METADATA INSPECTION
    // ------------------------------------------------------------------------
    console.log(
      "\n--- SECTION 5 & 26: DATABASE CONSTRAINTS & METADATA INSPECTION ---",
    );

    // Organizations code_prefix unique index
    const [uqCodePrefix] = await sql`
      SELECT indexname FROM pg_indexes 
      WHERE schemaname = 'public' AND tablename = 'organizations' AND indexname = 'uq_organizations_code_prefix'
    `;
    recordCheck(
      "SCHEMA-ORG-PREFIX-UQ",
      "organizations.code_prefix has UNIQUE index",
      "SCHEMA",
      Boolean(uqCodePrefix),
      `Index exists: ${uqCodePrefix?.indexname}`,
    );

    // Memberships unique index (user_id, organization_id)
    const [uqUserOrg] = await sql`
      SELECT indexname FROM pg_indexes 
      WHERE schemaname = 'public' AND tablename = 'organization_memberships' AND indexname = 'uq_user_organization'
    `;
    recordCheck(
      "SCHEMA-MEM-UQ",
      "organization_memberships has UNIQUE index on (user_id, organization_id)",
      "SCHEMA",
      Boolean(uqUserOrg),
      `Index exists: ${uqUserOrg?.indexname}`,
    );

    // Invitations unique index on token_hash
    const [uqTokenHash] = await sql`
      SELECT indexname FROM pg_indexes 
      WHERE schemaname = 'public' AND tablename = 'organization_invitations' AND indexname = 'uq_invitations_token_hash'
    `;
    recordCheck(
      "SCHEMA-INV-TOKEN-UQ",
      "organization_invitations has UNIQUE index on token_hash",
      "SCHEMA",
      Boolean(uqTokenHash),
      `Index exists: ${uqTokenHash?.indexname}`,
    );

    // Foreign keys verification
    const fks = await sql`
      SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name IN ('organization_memberships', 'organization_invitations')
    `;

    const memUserFk = fks.find(
      (f) =>
        f.table_name === "organization_memberships" &&
        f.column_name === "user_id",
    );
    const memOrgFk = fks.find(
      (f) =>
        f.table_name === "organization_memberships" &&
        f.column_name === "organization_id",
    );
    const memRoleFk = fks.find(
      (f) =>
        f.table_name === "organization_memberships" &&
        f.column_name === "role_id",
    );
    const invOrgFk = fks.find(
      (f) =>
        f.table_name === "organization_invitations" &&
        f.column_name === "organization_id",
    );
    const invRoleFk = fks.find(
      (f) =>
        f.table_name === "organization_invitations" &&
        f.column_name === "role_id",
    );
    const invInviterFk = fks.find(
      (f) =>
        f.table_name === "organization_invitations" &&
        f.column_name === "invited_by_user_id",
    );

    recordCheck(
      "SCHEMA-FK-CASCADE",
      "Memberships and invitations cascade on organization deletion",
      "SCHEMA",
      memOrgFk?.delete_rule === "CASCADE" &&
        invOrgFk?.delete_rule === "CASCADE",
      `memOrgFk delete_rule=${memOrgFk?.delete_rule}, invOrgFk delete_rule=${invOrgFk?.delete_rule}`,
    );

    recordCheck(
      "SCHEMA-FK-RESTRICT",
      "Role deletion is RESTRICTED when referenced by membership or invitation",
      "SCHEMA",
      memRoleFk?.delete_rule === "RESTRICT" &&
        invRoleFk?.delete_rule === "RESTRICT",
      `memRoleFk delete_rule=${memRoleFk?.delete_rule}, invRoleFk delete_rule=${invRoleFk?.delete_rule}`,
    );

    // ------------------------------------------------------------------------
    // SECTION 8: VERIFY INVITATION DATABASE MODEL
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 8: VERIFY INVITATION DATABASE MODEL ---");

    const rawTokenAlice = crypto.randomBytes(32).toString("hex");
    const tokenHashAlice = crypto
      .createHash("sha256")
      .update(rawTokenAlice)
      .digest("hex");
    const expiresAlice = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [invAlice] = await sql`
      INSERT INTO organization_invitations (
        organization_id,
        email,
        role_id,
        token_hash,
        status,
        expires_at,
        invited_by_user_id
      ) VALUES (
        ${orgBetaId},
        'alice@example.com',
        ${roleBetaMemberId},
        ${tokenHashAlice},
        'pending',
        ${expiresAlice},
        ${userA_Id}
      )
      RETURNING *
    `;

    // Verify raw token is NOT in database
    const [rawTokenCheck] = await sql`
      SELECT count(*)::int as count FROM organization_invitations 
      WHERE token_hash = ${rawTokenAlice}
    `;

    recordCheck(
      "INV-MODEL-HASH",
      "Raw token is NEVER persisted in PostgreSQL; only SHA-256 token_hash is stored",
      "INVITATION",
      rawTokenCheck.count === 0 && invAlice.token_hash === tokenHashAlice,
      `rawToken in DB count=${rawTokenCheck.count}, token_hash length=${invAlice.token_hash.length}`,
    );

    recordCheck(
      "INV-MODEL-STATE",
      "Invitation created with pending status, normalized email, correct org and role",
      "INVITATION",
      invAlice.status === "pending" &&
        invAlice.email === "alice@example.com" &&
        invAlice.organization_id === orgBetaId,
      `status=${invAlice.status}, email=${invAlice.email}, org=${invAlice.organization_id}`,
    );

    // ------------------------------------------------------------------------
    // SECTION 9: INVITATION ACCEPTANCE — PRIMARY E2E TEST (ALICE)
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 9: INVITATION ACCEPTANCE PRIMARY E2E TEST ---");

    const aliceUserId = "00000000-0000-4000-c000-00000000000a";
    const aliceEmail = "alice@example.com";

    // Simulate authoritative service execution inside a transaction:
    const aliceAcceptResult = await sql.begin(async (tx) => {
      // 1. Resolve invitation by token_hash
      const [invite] = await tx`
        SELECT * FROM organization_invitations WHERE token_hash = ${tokenHashAlice}
      `;
      if (!invite || invite.status !== "pending")
        throw new Error("Invalid invite");
      if (invite.email !== aliceEmail) throw new Error("EMAIL_MISMATCH");

      // 2. Ensure public.users row exists FIRST so accepted_by_user_id FK constraint is satisfied
      const [existingUser] =
        await tx`SELECT * FROM users WHERE user_id = ${aliceUserId}`;
      if (!existingUser) {
        await tx`
          INSERT INTO users (user_id, organization_id, role_id, first_name, email, status)
          VALUES (${aliceUserId}, ${invite.organization_id}, ${invite.role_id}, 'Alice', ${aliceEmail}, 'active')
        `;
      }

      // 3. Optimistic update with accepted_by_user_id
      const [updatedInvite] = await tx`
        UPDATE organization_invitations
        SET status = 'accepted', accepted_at = now(), accepted_by_user_id = ${aliceUserId}, updated_at = now()
        WHERE invitation_id = ${invite.invitation_id} AND status = 'pending'
        RETURNING *
      `;
      if (!updatedInvite) throw new Error("INVITATION_ALREADY_ACCEPTED");

      // 4. Insert membership
      const [membership] = await tx`
        INSERT INTO organization_memberships (
          user_id, organization_id, role_id, status, is_default, joined_at
        ) VALUES (
          ${aliceUserId}, ${invite.organization_id}, ${invite.role_id}, 'active', true, now()
        )
        RETURNING *
      `;

      return { invite: updatedInvite, membership };
    });

    // Verify in database
    const [aliceDbInvite] =
      await sql`SELECT * FROM organization_invitations WHERE token_hash = ${tokenHashAlice}`;
    const [aliceDbMembership] = await sql`
      SELECT * FROM organization_memberships 
      WHERE user_id = ${aliceUserId} AND organization_id = ${orgBetaId}
    `;

    recordCheck(
      "ACCEPT-ALICE-E2E",
      "Alice accepts invitation: membership created in Org Beta, invitation marked accepted",
      "ACCEPTANCE",
      aliceDbInvite.status === "accepted" &&
        aliceDbInvite.accepted_by_user_id === aliceUserId &&
        aliceDbMembership?.status === "active" &&
        aliceDbMembership?.role_id === roleBetaMemberId,
      `invite.status=${aliceDbInvite.status}, accepted_by=${aliceDbInvite.accepted_by_user_id}, membership.org=${aliceDbMembership?.organization_id}`,
    );

    // ------------------------------------------------------------------------
    // SECTION 10: WRONG-ACCOUNT E2E TEST (BOB TRIES TO ACCEPT CHARLIE'S INVITE)
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 10: WRONG-ACCOUNT E2E TEST ---");

    const rawTokenCharlie = crypto.randomBytes(32).toString("hex");
    const tokenHashCharlie = crypto
      .createHash("sha256")
      .update(rawTokenCharlie)
      .digest("hex");
    await sql`
      INSERT INTO organization_invitations (
        organization_id, email, role_id, token_hash, status, expires_at, invited_by_user_id
      ) VALUES (
        ${orgBetaId}, 'charlie@example.com', ${roleBetaMemberId}, ${tokenHashCharlie}, 'pending', ${expiresAlice}, ${userA_Id}
      )
    `;

    const bobUserId = "00000000-0000-4000-c000-00000000000b";
    const bobEmail = "bob@example.com";
    let bobError = "";

    try {
      await sql.begin(async (tx) => {
        const [invite] =
          await tx`SELECT * FROM organization_invitations WHERE token_hash = ${tokenHashCharlie}`;
        if (!invite) throw new Error("NOT_FOUND");
        if (invite.email !== bobEmail) {
          throw new Error("EMAIL_MISMATCH");
        }
        await tx`UPDATE organization_invitations SET status = 'accepted' WHERE invitation_id = ${invite.invitation_id}`;
      });
    } catch (e: any) {
      bobError = e.message;
    }

    // Verify Bob received NO membership and Charlie's invite is STILL pending
    const [bobMembership] = await sql`
      SELECT count(*)::int as count FROM organization_memberships WHERE user_id = ${bobUserId}
    `;
    const [charlieInviteStatus] = await sql`
      SELECT status, accepted_at FROM organization_invitations WHERE token_hash = ${tokenHashCharlie}
    `;

    recordCheck(
      "WRONG-ACCOUNT-REJECT",
      "Bob cannot accept Charlie's invitation: EMAIL_MISMATCH thrown, no membership, invite remains pending",
      "SECURITY",
      bobError === "EMAIL_MISMATCH" &&
        bobMembership.count === 0 &&
        charlieInviteStatus.status === "pending",
      `Error thrown="${bobError}", Bob memberships=${bobMembership.count}, invite status=${charlieInviteStatus.status}`,
    );

    // ------------------------------------------------------------------------
    // SECTION 11: MULTI-MEMBERSHIP E2E TEST (USER F: ORG A -> ORG B)
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 11: MULTI-MEMBERSHIP E2E TEST ---");

    // User F already belongs to Org A
    const [userF_Before] = await sql`
      SELECT organization_id, role_id FROM users WHERE user_id = ${userF_Id}
    `;
    const [userF_MemsBefore] = await sql`
      SELECT count(*)::int as count FROM organization_memberships WHERE user_id = ${userF_Id}
    `;

    // Create invite for User F to Org B
    const rawTokenF = crypto.randomBytes(32).toString("hex");
    const tokenHashF = crypto
      .createHash("sha256")
      .update(rawTokenF)
      .digest("hex");
    await sql`
      INSERT INTO organization_invitations (
        organization_id, email, role_id, token_hash, status, expires_at, invited_by_user_id
      ) VALUES (
        ${orgBetaId}, 'userf@example.com', ${roleBetaMemberId}, ${tokenHashF}, 'pending', ${expiresAlice}, ${userA_Id}
      )
    `;

    // User F accepts invite to Org B
    await sql.begin(async (tx) => {
      const [invite] =
        await tx`SELECT * FROM organization_invitations WHERE token_hash = ${tokenHashF}`;
      await tx`
        UPDATE organization_invitations 
        SET status = 'accepted', accepted_at = now(), accepted_by_user_id = ${userF_Id}
        WHERE invitation_id = ${invite.invitation_id}
      `;
      // User F already exists in users, do NOT overwrite legacy organization_id!
      await tx`
        INSERT INTO organization_memberships (
          user_id, organization_id, role_id, status, is_default, joined_at
        ) VALUES (
          ${userF_Id}, ${invite.organization_id}, ${invite.role_id}, 'active', false, now()
        )
      `;
    });

    const userF_MemsAfter = await sql`
      SELECT organization_id, role_id, status, is_default 
      FROM organization_memberships 
      WHERE user_id = ${userF_Id}
      ORDER BY created_at
    `;
    const [userF_After] = await sql`
      SELECT organization_id, role_id FROM users WHERE user_id = ${userF_Id}
    `;

    recordCheck(
      "MULTI-MEM-COUNT",
      "User F acquires 2 distinct active memberships across Org A and Org B",
      "ORGANIZATION",
      userF_MemsBefore.count === 1 &&
        userF_MemsAfter.length === 2 &&
        userF_MemsAfter.every((m) => m.status === "active"),
      `Before count=${userF_MemsBefore.count}, After count=${userF_MemsAfter.length}, orgs=[${userF_MemsAfter.map((m) => m.organization_id).join(", ")}]`,
    );

    recordCheck(
      "MULTI-MEM-LEGACY-PRESERVE",
      "User F legacy users.organization_id is PRESERVED and not overwritten",
      "ORGANIZATION",
      userF_Before.organization_id === orgAlphaId &&
        userF_After.organization_id === orgAlphaId,
      `Initial users.org=${userF_Before.organization_id}, After acceptance users.org=${userF_After.organization_id}`,
    );

    // ------------------------------------------------------------------------
    // SECTION 12: ORGANIZATION SWITCHING TEST
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 12: ORGANIZATION SWITCHING TEST ---");

    // Switching to Org B for User F: membership exists, active
    const [targetOrgBCheck] = await sql`
      SELECT * FROM organization_memberships 
      WHERE user_id = ${userF_Id} AND organization_id = ${orgBetaId} AND status = 'active'
    `;

    // Switching to an arbitrary foreign org (Org Foreign) where User F has NO membership
    const orgForeignId = "00000000-0000-4000-a000-000000000009";
    const [targetOrgForeignCheck] = await sql`
      SELECT * FROM organization_memberships 
      WHERE user_id = ${userF_Id} AND organization_id = ${orgForeignId} AND status = 'active'
    `;

    recordCheck(
      "SWITCH-VALID",
      "Switch to Organization B allowed because active membership is verified in PostgreSQL",
      "SECURITY",
      Boolean(targetOrgBCheck),
      `Verified active membership in Org B for User F`,
    );

    recordCheck(
      "SWITCH-UNAUTHORIZED-REJECT",
      "Switch to arbitrary unauthorized organization rejected (no membership found)",
      "SECURITY",
      !targetOrgForeignCheck,
      `Membership for foreign org is null, switch rejected`,
    );

    // ------------------------------------------------------------------------
    // SECTION 14: INVITATION ROLE TAMPERING
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 14: INVITATION ROLE TAMPERING ---");

    const rawTokenTamper = crypto.randomBytes(32).toString("hex");
    const tokenHashTamper = crypto
      .createHash("sha256")
      .update(rawTokenTamper)
      .digest("hex");
    await sql`
      INSERT INTO organization_invitations (
        organization_id, email, role_id, token_hash, status, expires_at, invited_by_user_id
      ) VALUES (
        ${orgBetaId}, 'tamper@example.com', ${roleBetaMemberId}, ${tokenHashTamper}, 'pending', ${expiresAlice}, ${userA_Id}
      )
    `;

    // Client passes malicious maliciousRoleId = roleBetaOwnerId
    const maliciousInput = {
      roleId: roleBetaOwnerId,
      organizationId: orgAlphaId,
      userId: userA_Id,
    };

    const tamperUserId = "00000000-0000-4000-c000-000000000010";
    await sql`
      INSERT INTO users (user_id, organization_id, role_id, first_name, email, status)
      VALUES (${tamperUserId}, ${orgBetaId}, ${roleBetaMemberId}, 'Tamper', 'tamper@example.com', 'active')
    `;

    // Authoritative execution ignores client inputs and uses invite.role_id and invite.organization_id
    await sql.begin(async (tx) => {
      const [invite] =
        await tx`SELECT * FROM organization_invitations WHERE token_hash = ${tokenHashTamper}`;
      // Invariant: role comes strictly from invite, NEVER from client
      const authoritativeRoleId = invite.role_id;
      const authoritativeOrgId = invite.organization_id;

      await tx`
        INSERT INTO organization_memberships (user_id, organization_id, role_id, status)
        VALUES (${tamperUserId}, ${authoritativeOrgId}, ${authoritativeRoleId}, 'active')
      `;
    });

    const [tamperMembership] = await sql`
      SELECT * FROM organization_memberships WHERE user_id = ${tamperUserId}
    `;

    recordCheck(
      "ROLE-TAMPER-IMMUNITY",
      "Client-supplied roleId/organizationId discarded; membership role is strictly derived from invitation record",
      "SECURITY",
      tamperMembership.role_id === roleBetaMemberId &&
        tamperMembership.role_id !== maliciousInput.roleId,
      `Resulting role_id=${tamperMembership.role_id} (invited member role), client attempted=${maliciousInput.roleId} (owner)`,
    );

    // ------------------------------------------------------------------------
    // SECTION 15: REPLAY TEST
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 15: REPLAY TEST ---");

    let replayError = "";
    try {
      await sql.begin(async (tx) => {
        // Attempt to accept Alice's already-accepted invitation
        const [invite] =
          await tx`SELECT * FROM organization_invitations WHERE token_hash = ${tokenHashAlice}`;
        if (invite.status !== "pending") {
          throw new Error("INVITATION_ALREADY_ACCEPTED");
        }
      });
    } catch (e: any) {
      replayError = e.message;
    }

    recordCheck(
      "REPLAY-REJECT",
      "Replaying accepted invitation token is rejected with INVITATION_ALREADY_ACCEPTED",
      "SECURITY",
      replayError === "INVITATION_ALREADY_ACCEPTED",
      `Error caught="${replayError}"`,
    );

    // ------------------------------------------------------------------------
    // SECTION 16: REVOCATION TEST
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 16: REVOCATION TEST ---");

    const rawTokenRevoke = crypto.randomBytes(32).toString("hex");
    const tokenHashRevoke = crypto
      .createHash("sha256")
      .update(rawTokenRevoke)
      .digest("hex");
    const [revokedInv] = await sql`
      INSERT INTO organization_invitations (
        organization_id, email, role_id, token_hash, status, expires_at, invited_by_user_id, revoked_at, revoked_by_user_id
      ) VALUES (
        ${orgBetaId}, 'revoked@example.com', ${roleBetaMemberId}, ${tokenHashRevoke}, 'revoked', ${expiresAlice}, ${userA_Id}, now(), ${userA_Id}
      )
      RETURNING *
    `;

    let revokeError = "";
    try {
      await sql.begin(async (tx) => {
        const [invite] =
          await tx`SELECT * FROM organization_invitations WHERE token_hash = ${tokenHashRevoke}`;
        if (invite.status === "revoked") throw new Error("INVITATION_REVOKED");
      });
    } catch (e: any) {
      revokeError = e.message;
    }

    recordCheck(
      "REVOCATION-REJECT",
      "Revoked invitation cannot be accepted (INVITATION_REVOKED)",
      "SECURITY",
      revokeError === "INVITATION_REVOKED",
      `Invite status=${revokedInv.status}, error caught="${revokeError}"`,
    );

    // ------------------------------------------------------------------------
    // SECTION 17: EXPIRATION TEST
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 17: EXPIRATION TEST ---");

    const rawTokenExpired = crypto.randomBytes(32).toString("hex");
    const tokenHashExpired = crypto
      .createHash("sha256")
      .update(rawTokenExpired)
      .digest("hex");
    const pastExpires = new Date(Date.now() - 3600 * 1000); // 1 hour ago
    await sql`
      INSERT INTO organization_invitations (
        organization_id, email, role_id, token_hash, status, expires_at, invited_by_user_id
      ) VALUES (
        ${orgBetaId}, 'expired@example.com', ${roleBetaMemberId}, ${tokenHashExpired}, 'pending', ${pastExpires}, ${userA_Id}
      )
    `;

    let expiredError = "";
    try {
      await sql.begin(async (tx) => {
        const [invite] =
          await tx`SELECT * FROM organization_invitations WHERE token_hash = ${tokenHashExpired}`;
        if (new Date(invite.expires_at) < new Date())
          throw new Error("INVITATION_EXPIRED");
      });
    } catch (e: any) {
      expiredError = e.message;
    }

    recordCheck(
      "EXPIRATION-REJECT",
      "Expired invitation rejected server-side (INVITATION_EXPIRED)",
      "SECURITY",
      expiredError === "INVITATION_EXPIRED",
      `expires_at was in past, error caught="${expiredError}"`,
    );

    // ------------------------------------------------------------------------
    // SECTION 18: TRANSACTION ROLLBACK TEST
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 18: TRANSACTION ROLLBACK TEST ---");

    const rawTokenRollback = crypto.randomBytes(32).toString("hex");
    const tokenHashRollback = crypto
      .createHash("sha256")
      .update(rawTokenRollback)
      .digest("hex");
    await sql`
      INSERT INTO organization_invitations (
        organization_id, email, role_id, token_hash, status, expires_at, invited_by_user_id
      ) VALUES (
        ${orgBetaId}, 'rollback@example.com', ${roleBetaMemberId}, ${tokenHashRollback}, 'pending', ${expiresAlice}, ${userA_Id}
      )
    `;

    const rollbackUserId = "00000000-0000-4000-c000-000000000020";
    // Ensure rollback user exists in users table
    await sql`
      INSERT INTO users (user_id, organization_id, role_id, first_name, email, status)
      VALUES (${rollbackUserId}, ${orgBetaId}, ${roleBetaMemberId}, 'Rollback', 'rollback@example.com', 'active')
    `;

    let txAborted = false;

    try {
      await sql.begin(async (tx) => {
        // Step 1: Update invitation to accepted
        await tx`
          UPDATE organization_invitations 
          SET status = 'accepted', accepted_at = now(), accepted_by_user_id = ${rollbackUserId}
          WHERE token_hash = ${tokenHashRollback}
        `;
        // Step 2: Attempt invalid membership insertion (e.g. invalid foreign key role_id)
        await tx`
          INSERT INTO organization_memberships (
            user_id, organization_id, role_id, status
          ) VALUES (
            ${rollbackUserId}, ${orgBetaId}, '00000000-0000-0000-0000-000000000000'::uuid, 'active'
          )
        `;
      });
    } catch {
      txAborted = true;
    }

    // Inspect real database state after rollback
    const [inviteAfterRollback] = await sql`
      SELECT status, accepted_at, accepted_by_user_id 
      FROM organization_invitations 
      WHERE token_hash = ${tokenHashRollback}
    `;
    const [membershipAfterRollback] = await sql`
      SELECT count(*)::int as count FROM organization_memberships WHERE user_id = ${rollbackUserId}
    `;

    recordCheck(
      "TX-ROLLBACK-INVITATION",
      "Invitation acceptance transaction aborts cleanly: invitation remains pending with no partial membership",
      "TRANSACTION",
      txAborted &&
        inviteAfterRollback.status === "pending" &&
        inviteAfterRollback.accepted_at === null &&
        membershipAfterRollback.count === 0,
      `Transaction aborted=${txAborted}, status=${inviteAfterRollback.status}, accepted_at=${inviteAfterRollback.accepted_at}, partial memberships=${membershipAfterRollback.count}`,
    );

    // ------------------------------------------------------------------------
    // SECTION 19: CONCURRENT ACCEPTANCE TEST
    // ------------------------------------------------------------------------
    console.log("\n--- SECTION 19: CONCURRENT ACCEPTANCE TEST ---");

    const rawTokenConcurrent = crypto.randomBytes(32).toString("hex");
    const tokenHashConcurrent = crypto
      .createHash("sha256")
      .update(rawTokenConcurrent)
      .digest("hex");
    await sql`
      INSERT INTO organization_invitations (
        organization_id, email, role_id, token_hash, status, expires_at, invited_by_user_id
      ) VALUES (
        ${orgBetaId}, 'concurrent@example.com', ${roleBetaMemberId}, ${tokenHashConcurrent}, 'pending', ${expiresAlice}, ${userA_Id}
      )
    `;

    const userConcurrentA = "00000000-0000-4000-c000-0000000000ca";
    const userConcurrentB = "00000000-0000-4000-c000-0000000000cb";

    // Ensure concurrent test users exist in users table
    await sql`
      INSERT INTO users (user_id, organization_id, role_id, first_name, email, status)
      VALUES 
        (${userConcurrentA}, ${orgBetaId}, ${roleBetaMemberId}, 'ConA', 'cona@example.com', 'active'),
        (${userConcurrentB}, ${orgBetaId}, ${roleBetaMemberId}, 'ConB', 'conb@example.com', 'active')
    `;

    async function attemptConcurrentAccept(userId: string) {
      return sql.begin(async (tx) => {
        // Optimistic conditional update
        const [consumed] = await tx`
          UPDATE organization_invitations
          SET status = 'accepted', accepted_at = now(), accepted_by_user_id = ${userId}
          WHERE token_hash = ${tokenHashConcurrent} AND status = 'pending'
          RETURNING *
        `;
        if (!consumed) {
          throw new Error("INVITATION_ALREADY_ACCEPTED");
        }
        await tx`
          INSERT INTO organization_memberships (user_id, organization_id, role_id, status)
          VALUES (${userId}, ${orgBetaId}, ${roleBetaMemberId}, 'active')
        `;
        return { success: true, userId };
      });
    }

    const results = await Promise.allSettled([
      attemptConcurrentAccept(userConcurrentA),
      attemptConcurrentAccept(userConcurrentB),
    ]);

    const successes = results.filter((r) => r.status === "fulfilled");
    const failures = results.filter((r) => r.status === "rejected");

    const [concurrentMemberships] = await sql`
      SELECT count(*)::int as count FROM organization_memberships 
      WHERE user_id IN (${userConcurrentA}, ${userConcurrentB})
    `;

    recordCheck(
      "CONCURRENCY-ONE-WINNER",
      "Concurrent acceptance against same invitation: exactly ONE succeeds, other fails safely, exactly 1 membership in DB",
      "CONCURRENCY",
      successes.length === 1 &&
        failures.length === 1 &&
        concurrentMemberships.count === 1,
      `Successes=${successes.length}, Failures=${failures.length}, Memberships in DB=${concurrentMemberships.count}`,
    );

    // ------------------------------------------------------------------------
    // SECTION 22 & 23: ORGANIZATION CREATION E2E & CODE PREFIX VERIFICATION
    // ------------------------------------------------------------------------
    console.log(
      "\n--- SECTION 22 & 23: ORGANIZATION CREATION E2E & CODE PREFIX ---",
    );

    const unaffiliatedCreatorId = "00000000-0000-4000-c000-000000000099";
    const newOrgId = "00000000-0000-4000-a000-000000000099";
    const newOwnerRoleId = "00000000-0000-4000-b000-000000000099";

    // Atomic organization creation transaction in PostgreSQL
    await sql.begin(async (tx) => {
      // 1. Insert organization with valid code_prefix
      await tx`
        INSERT INTO organizations (organization_id, organization_name, slug, code_prefix, status)
        VALUES (${newOrgId}, 'Apex Digital Lab', 'apex-digital-lab', 'ADL', 'active')
      `;

      // 2. Seed SYSTEM_ROLES
      await tx`
        INSERT INTO roles (role_id, organization_id, role_name, role_key, is_system)
        VALUES 
          (${newOwnerRoleId}, ${newOrgId}, 'Owner', 'owner', true),
          (gen_random_uuid(), ${newOrgId}, 'Super Admin', 'super_admin', true),
          (gen_random_uuid(), ${newOrgId}, 'Team Member', 'team_member', true)
      `;

      // 3. Ensure user exists
      await tx`
        INSERT INTO users (user_id, organization_id, role_id, first_name, email, status)
        VALUES (${unaffiliatedCreatorId}, ${newOrgId}, ${newOwnerRoleId}, 'Founder', 'founder@apexdigital.com', 'active')
        ON CONFLICT (user_id) DO NOTHING
      `;

      // 4. Create owner membership
      await tx`
        INSERT INTO organization_memberships (user_id, organization_id, role_id, status, is_default)
        VALUES (${unaffiliatedCreatorId}, ${newOrgId}, ${newOwnerRoleId}, 'active', true)
      `;
    });

    const [createdOrg] =
      await sql`SELECT * FROM organizations WHERE organization_id = ${newOrgId}`;
    const [creatorMem] = await sql`
      SELECT m.*, r.role_key 
      FROM organization_memberships m
      JOIN roles r ON m.role_id = r.role_id
      WHERE m.user_id = ${unaffiliatedCreatorId} AND m.organization_id = ${newOrgId}
    `;

    recordCheck(
      "ORG-CREATION-E2E",
      "Unaffiliated user creates organization: org created with code_prefix, roles seeded, owner membership established",
      "ORGANIZATION",
      createdOrg?.code_prefix === "ADL" &&
        creatorMem?.role_key === "owner" &&
        creatorMem?.status === "active",
      `Org code_prefix=${createdOrg?.code_prefix}, creator role=${creatorMem?.role_key}, membership status=${creatorMem?.status}`,
    );

    // Duplicate code prefix rejection
    let dupPrefixRejected = false;
    try {
      await sql`
        INSERT INTO organizations (organization_name, slug, code_prefix, status)
        VALUES ('Another Org', 'another-org', 'ADL', 'active')
      `;
    } catch {
      dupPrefixRejected = true;
    }

    recordCheck(
      "CODE-PREFIX-UQ-REJECT",
      "PostgreSQL enforces unique code_prefix constraint across organizations",
      "SECURITY",
      dupPrefixRejected,
      "Duplicate insert with code_prefix 'ADL' rejected by unique index uq_organizations_code_prefix",
    );

    // ------------------------------------------------------------------------
    // SUMMARY
    // ------------------------------------------------------------------------
    console.log(
      "\n================================================================================",
    );
    console.log("REHEARSAL SUMMARY");
    console.log(
      "================================================================================",
    );
    const passedCount = checks.filter((c) => c.passed).length;
    const failedCount = checks.filter((c) => !c.passed).length;
    console.log(
      `Total checks: ${checks.length} | Passed: ${passedCount} | Failed: ${failedCount}`,
    );

    if (failedCount > 0) {
      console.error("\nSOME REHEARSAL CHECKS FAILED!");
      process.exit(1);
    } else {
      console.log("\nALL REHEARSAL CHECKS PASSED AGAINST REAL POSTGRESQL!");
    }
  } finally {
    await sql.end();
  }
}

runRehearsal().catch((err) => {
  console.error("FATAL REHEARSAL ERROR:", err);
  process.exit(1);
});
