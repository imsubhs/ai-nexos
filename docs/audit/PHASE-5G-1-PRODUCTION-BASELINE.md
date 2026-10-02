# PHASE 5G.1 — PRODUCTION BASELINE & PREFLIGHT VERIFICATION REPORT

**System**: AI NEX OS (`ai-nexos`)  
**Ecosystem**: NEXOS Enterprise Platform  
**Target Repository**: `/Users/subhamsaha/Downloads/My Docs /WebsiteCreation/NEXOS Comb /AIC NEXOS/ai-nexos`  
**Current Branch**: `phase-2-production-readiness`  
**Production Project Ref**: `gsgseacjcalkhhmunjhx`  
**Production Region**: `ap-northeast-1` (Tokyo, Japan)  
**Production Database**: `PostgreSQL 17.6.1.155`  
**Production State**: `ACTIVE / HEALTHY`  
**Preflight Timestamp**: `2026-09-27T01:18:00+05:30` (UTC `2026-09-26T19:48:00Z`)  
**Safety Protocol**: **READ-ONLY INSPECTION + LOCAL LOGICAL BACKUP — ZERO MUTATIONS / ZERO MIGRATIONS**  

---

## 1. Executive Summary

Phase 5G.1 executes the first live, read-only baseline verification of the AI NEX OS production environment following the manual resumption of the production Supabase project (`gsgseacjcalkhhmunjhx`) by the operator.

All empirical data was retrieved directly from the live production database (`aws-0-ap-northeast-1.pooler.supabase.com:5432`), Supabase Storage, and the Supabase Management API using authorized environment credentials.

### Key Audit Highlights:
1. **Production Identity**: Confirmed connection to project `gsgseacjcalkhhmunjhx` in Tokyo (`ap-northeast-1`), running PostgreSQL 17.6. Status is `ACTIVE_HEALTHY`.
2. **Local Logical Backup Captured**: Full physical logical dump captured locally via `pg_dump` (Custom format `-F c`) and verified via `pg_restore --list`. Archive is **1,135,591 bytes (1.08 MB)** containing **2,300 TOC entries**.
3. **Migration Graph Parity (0000–0014)**: Live table `drizzle.__drizzle_migrations` contains exactly **15 migrations**. All 15 SHA-256 hashes match the repository files byte-for-byte.
4. **Organization Baseline**: Exactly **1 organization** exists (`AI NEXOS`, slug: `ai-nexos`). Prefix collision risk is **0**.
5. **Tenancy Integrity**: Exactly **2 users** exist. Both reference valid organization and role records. Orphaned references = **0**.
6. **Role Consistency**: All 7 defined roles belong to the single production organization. Mismatched user-role relationships = **0**.
7. **Precondition Objects**: Post-0014 schema objects (`organizations.code_prefix`, `organization_memberships`, `organization_invitations`, `app.is_project_member`) are confirmed **NOT YET PRESENT**. Zero schema drift.
8. **RLS Baseline**: Existing `projects_select` policy reflects the pre-remediation circular subquery. `app.is_project_member` does not yet exist.
9. **Storage & Auth**: Private storage bucket `documents` verified. Supabase Auth configuration verified with zero staging URL contamination.
10. **Zero Production Mutations**: 0 schema mutations, 0 data mutations, 0 auth mutations, 0 storage mutations, 0 deployments.

---

## 2. Production Identity

Verified via read-only SQL connection and Supabase Management API:

| Attribute | Verified Production Value | Expected Target | Status |
| :--- | :--- | :--- | :---: |
| **Supabase Project Ref** | `gsgseacjcalkhhmunjhx` | `gsgseacjcalkhhmunjhx` | **PASS** |
| **Project Name** | `ai-nexos` | `ai-nexos` | **PASS** |
| **Region** | `ap-northeast-1` (Tokyo, Japan) | `ap-northeast-1` | **PASS** |
| **Database Host** | `aws-0-ap-northeast-1.pooler.supabase.com` | Tokyo Supabase Endpoint | **PASS** |
| **Database Name** | `postgres` | `postgres` | **PASS** |
| **PostgreSQL Version** | `PostgreSQL 17.6` (`17.6.1.155`) | PostgreSQL 17.x | **PASS** |
| **Session Mode Port** | `5432` (`DIRECT_DATABASE_URL`) | Port 5432 (DDL-safe) | **PASS** |
| **Pooler Mode Port** | `6543` (`DATABASE_URL`) | Port 6543 (Runtime) | **PASS** |
| **Current State** | `ACTIVE_HEALTHY` | `ACTIVE_HEALTHY` | **PASS** |
| **Staging Isolation** | Distinct from `shnzzbbtydmvfhgeoysg` | Strict Isolation | **PASS** |

**Verdict: PASS**.

---

## 3. Local Production Backup

Prior to baseline evaluation, a full logical dump was captured from the production database using `/opt/homebrew/bin/pg_dump` against `DIRECT_DATABASE_URL`:

- **Backup File Path**: `/Users/subhamsaha/.gemini/antigravity-ide/brain/54110a81-5319-4f23-be76-6d0c10853250/scratch/pre_migration_backup_gsgseacjcalkhhmunjhx_20260926194357.dump`
- **Location**: Stored outside the Git repository in the secure artifacts scratch directory.
- **File Size**: `1,135,591 bytes` (1.08 MB).
- **Format**: PostgreSQL Custom Archive (`-F c`, compressed, with blobs).
- **Process Exit Code**: `0`.
- **Validation**:
  - Executed `/opt/homebrew/bin/pg_restore --list <backup_file>`.
  - Validation Exit Code: `0`.
  - Total Validated TOC Entries: **2,300 entries** (including schemas, tables, functions, RLS policies, ACLs, and sequence metadata).
- **Secret Safety**: No connection strings, passwords, or credentials were logged or included in the filename.

**Verdict: PASS**.

---

## 4. Production Migration Baseline

Executed `SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at ASC;` on `gsgseacjcalkhhmunjhx`:

| ID | Applied Hash in Production | Matching Local Migration File | Local SHA-256 Digest | Status |
| :---: | :--- | :--- | :--- | :---: |
| `1` | `5abf5be3211a9734248f347c76bca3c55c184b2a954f526a07d29de3e9b22620` | `0000_init_platform_foundation.sql` | `5abf5be3211a9734248f347c76bca3c55c184b2a954f526a07d29de3e9b22620` | **MATCH** |
| `2` | `40b7bb0e44c83009a09531de6aedd419665a50b93008d320055446b5946feb84` | `0001_security_rls_foundation.sql` | `40b7bb0e44c83009a09531de6aedd419665a50b93008d320055446b5946feb84` | **MATCH** |
| `3` | `e7dc018da7273e629e67440fcec83b09863dcac158a9fba0ca6a0ffe726a1477` | `0002_lumpy_vertigo.sql` | `e7dc018da7273e629e67440fcec83b09863dcac158a9fba0ca6a0ffe726a1477` | **MATCH** |
| `4` | `e0b841cc45fe5aa9db4811159b705af16e4b20095114438463d4f87015559199` | `0003_project_management.sql` | `e0b841cc45fe5aa9db4811159b705af16e4b20095114438463d4f87015559199` | **MATCH** |
| `5` | `e0d75efdb0d2fd06e5fe61a7aafb1389a26f75f12be21ecd9ff29f7eaee733dc` | `0004_typical_wolfpack.sql` | `e0d75efdb0d2fd06e5fe61a7aafb1389a26f75f12be21ecd9ff29f7eaee733dc` | **MATCH** |
| `6` | `fc07ab855ce256888c131d72e13cd54d3b44d2439b9400adacdf8fabb62f4a02` | `0005_reflective_king_cobra.sql` | `fc07ab855ce256888c131d72e13cd54d3b44d2439b9400adacdf8fabb62f4a02` | **MATCH** |
| `7` | `5688afb7d1766ef06a2ba22926783ba7ce7e8b495bd0937eaa457c935248b478` | `0006_wooden_micromax.sql` | `5688afb7d1766ef06a2ba22926783ba7ce7e8b495bd0937eaa457c935248b478` | **MATCH** |
| `8` | `815fae64d4cf06dc9215897c931e577cd2f7ecd185e93495da7d649d4b5d9e56` | `0007_remarkable_maximus.sql` | `815fae64d4cf06dc9215897c931e577cd2f7ecd185e93495da7d649d4b5d9e56` | **MATCH** |
| `9` | `ea91db693e9438b3cbb57ab6bb691ba3a60e194af58577ef11b4da8b4cc3f3b8` | `0008_same_johnny_storm.sql` | `ea91db693e9438b3cbb57ab6bb691ba3a60e194af58577ef11b4da8b4cc3f3b8` | **MATCH** |
| `10` | `cfe6650e3adf6c74a66b363c5aa032925d4ed669c825728882f4d6de9e4d3403` | `0009_mute_wallow.sql` | `cfe6650e3adf6c74a66b363c5aa032925d4ed669c825728882f4d6de9e4d3403` | **MATCH** |
| `11` | `8ecc05f903d8fa2841c223ab2961000dafc8d282845af05916c1f6ae27e21847` | `0010_data_api_select_grants.sql` | `8ecc05f903d8fa2841c223ab2961000dafc8d282845af05916c1f6ae27e21847` | **MATCH** |
| `12` | `52cdeae6f68251159433437306dec05fbbc75d65379793fac4bb707a88df28b0` | `0011_revoke_blanket_data_api_grants.sql` | `52cdeae6f68251159433437306dec05fbbc75d65379793fac4bb707a88df28b0` | **MATCH** |
| `13` | `8c897cb0aa178987f65bf65a65fe597c66d24a63dcc9c18621494e2814046f1a` | `0012_revoke_default_privileges.sql` | `8c897cb0aa178987f65bf65a65fe597c66d24a63dcc9c18621494e2814046f1a` | **MATCH** |
| `14` | `9a0cdab16ccf03f10bdf8cf82ff1ed6ca4c3331479c6233ad60efa899379d6a0` | `0013_org_sequences_composite_pk.sql` | `9a0cdab16ccf03f10bdf8cf82ff1ed6ca4c3331479c6233ad60efa899379d6a0` | **MATCH** |
| `15` | `78948fcdadf00f885a81ba8f618c6a34db81f4028547b5be8c81d122dc2728e6` | `0014_workforce_rls.sql` | `78948fcdadf00f885a81ba8f618c6a34db81f4028547b5be8c81d122dc2728e6` | **MATCH** |

- **Applied Migration Count**: Exactly **15**.
- **Post-0014 Migrations in Production**: **0** (None).
- **Hash Divergence**: **0**.
- **Repository Parity**: The production migration history strictly reflects indices `0` through `14`.

**Verdict: PASS**.

---

## 5. Organization Baseline

Executed `SELECT organization_id, organization_name, slug, created_at FROM organizations;`:

| Organization ID | Organization Name | Slug | Code Prefix Column | Created At |
| :--- | :--- | :--- | :---: | :--- |
| `907adcd2-4a0b-409a-bcac-97aea702a337` | `AI NEXOS` | `ai-nexos` | *Column not yet present* | `2026-08-09 06:38:58 UTC` |

- **Total Organizations**: Exactly **1**.
- **`code_prefix` Column Existence**: Does **NOT** exist yet (verified pre-0015 state).
- **Prefix Collision Risk**: **0**. Because exactly 1 organization exists in production, adding column `code_prefix text NOT NULL DEFAULT 'NEX'` and index `uq_organizations_code_prefix` in migration 0015 will execute with zero unique constraint violations.
- **Prefix Assignment Note**: Migration 0015 includes an explicit backfill: `UPDATE organizations SET code_prefix = 'AIC' WHERE (slug = 'ai-collective' OR organization_name = 'AI Collective')`. Because the production organization's slug is `'ai-nexos'`, it will retain the default prefix `'NEX'`.

**Verdict: PASS**.

---

## 6. User / Tenancy Baseline

Audited `public.users` in production:

- **Total Users**: **2**.
- **Users with `organization_id` NULL**: **0**.
- **Users with `role_id` NULL**: **0**.
- **Users with Orphaned `organization_id`**: **0**.
- **Users with Orphaned `role_id`**: **0**.
- **Status Distribution**:
  - `status = 'active'`, `is_deleted = false`: **2** users (100%).
  - Inactive / Suspended / Deleted users: **0**.
- **Detailed User Tenancy Breakdown**:
  - User 1: `user_id: 8eb3f7ad-2a25-433b-b8dc-459608f8d33a`, `org_id: 907adcd2-4a0b-409a-bcac-97aea702a337`, `role_id: 8793638d-3c2d-47f5-87b0-8b03d0608e5c` ("Owner"), `status: active`.
  - User 2: `user_id: 58e45455-fccd-4d51-948c-03e12d606cce`, `org_id: 907adcd2-4a0b-409a-bcac-97aea702a337`, `role_id: 8793638d-3c2d-47f5-87b0-8b03d0608e5c` ("Owner"), `status: active`.
- **Backfill Safety for Migration 0016**:
  - Exactly 2 memberships will be created in `organization_memberships`.
  - Both will receive `membership_status = 'active'`.
  - Unmapped / dangling users = **0**.

**Verdict: PASS**.

---

## 7. Role & Membership Preconditions

Audited `public.roles`:

- **Total Roles**: **7** defined roles.
  1. `8793638d-...`: `"Owner"` (`role_key: owner`) $\rightarrow$ Organization `907adcd2-...`
  2. `7468b7fe-...`: `"Super Admin"` (`role_key: super_admin`) $\rightarrow$ Organization `907adcd2-...`
  3. `a631cbbf-...`: `"HR"` (`role_key: hr`) $\rightarrow$ Organization `907adcd2-...`
  4. `06f020ae-...`: `"Creative Director"` (`role_key: creative_director`) $\rightarrow$ Organization `907adcd2-...`
  5. `6d8fc162-...`: `"Project Manager"` (`role_key: project_manager`) $\rightarrow$ Organization `907adcd2-...`
  6. `3a879b98-...`: `"Team Member"` (`role_key: team_member`) $\rightarrow$ Organization `907adcd2-...`
  7. `06caa0b7-...`: `"Finance"` (`role_key: finance`) $\rightarrow$ Organization `907adcd2-...`
- **Role Scoping**: All 7 roles are bound to organization `907adcd2-4a0b-409a-bcac-97aea702a337`.
- **Cross-Organization Mismatches (`users.org != roles.org`)**: **0**.

**Verdict: PASS**.

---

## 8. Domain Data Volume Baseline

Row counts recorded for all domain and platform tables:

| Table | Production Row Count | Migration Relevance |
| :--- | :---: | :--- |
| `organizations` | **1** | Primary tenant table (target of 0015) |
| `users` | **2** | User accounts (source for 0016 backfill) |
| `roles` | **7** | Organization roles (source for 0016 backfill) |
| `departments` | **7** | Organization departments |
| `clients` | **1** | Client directory |
| `projects` | **0** | Target of 0018 RLS remediation |
| `project_members` | **0** | Target of 0018 RLS helper |
| `tasks` | **0** | Tasks directory |
| `meetings` | **0** | Meetings table |
| `deliverables` | **0** | Deliverables table |
| `files` | **0** | File assets table |
| `timelines` | **0** | Timelines table |
| `attendance_records` | **2** | Workforce attendance |
| `automation_workflows` | **0** | Workflow automations |
| `storage.buckets` | **1** | `documents` bucket |
| `storage.objects` | **0** | Storage assets |

**Verdict: PASS**.

---

## 9. Schema Preconditions (Post-0014 Absence Check)

Verified that migration targets `0015`–`0018` have not been prematurely or partially applied:

| Target Schema Object | Verified State | Target Expected | Status |
| :--- | :--- | :--- | :---: |
| `organizations.code_prefix` | **ABSENT** | NOT YET PRESENT | **PASS** |
| `organization_memberships` table | **ABSENT** | NOT YET PRESENT | **PASS** |
| `organization_invitations` table | **ABSENT** | NOT YET PRESENT | **PASS** |
| `app.is_project_member` function | **ABSENT** | NOT YET PRESENT | **PASS** |

**Verdict: PASS (Zero Schema Drift)**.

---

## 10. Production RLS Baseline

Inspected `pg_policies` and schema `app`:

- **RLS Status**:
  - `organizations`: `rowsecurity = true`
  - `users`: `rowsecurity = true`
  - `clients`: `rowsecurity = true`
  - `projects`: `rowsecurity = true`
  - `project_members`: `rowsecurity = true`
- **Current `projects_select` Policy**:
  ```sql
  (app.is_org_member(organization_id)
   AND app.has_permission('projects'::text, 'read'::text)
   AND ((visibility <> 'private'::project_visibility)
        OR app.has_permission('projects'::text, '*'::text)
        OR (EXISTS (SELECT 1 FROM project_members pm
                    WHERE pm.project_id = projects.project_id AND pm.user_id = auth.uid()))))
  ```
- **Existing `app` Schema Functions**:
  1. `app.current_user_organization_id()` (`prosecdef: true`)
  2. `app.has_permission()` (`prosecdef: true`)
  3. `app.is_org_member()` (`prosecdef: true`)
  4. `app.protect_privileged_user_fields()` (`prosecdef: true`)
  5. `app.touch_audit_fields()` (`prosecdef: false`)
- **Status of 0018 Remediation**: Function `app.is_project_member(uuid)` is **NOT present**. The recursive query structure is confirmed intact, waiting for migration 0018 to apply the Phase 5D remediation safely.

**Verdict: PASS**.

---

## 11. Storage Baseline

Inspected `storage.buckets` and `storage.objects`:

- **Bucket Count**: **1**.
- **Bucket ID / Name**: `documents`.
- **Public**: `false` (Private, signed-URL access only).
- **Files / Objects Stored**: **0**.
- **Configuration Parity**: Matches `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=documents` exactly.

**Verdict: PASS**.

---

## 12. Supabase Auth Configuration

Verified via authenticated Supabase Management API:

- **Site URL**: `https://ai-nexos.antideploy.com` (Exact match).
- **URI Allow List**:
  - `https://ai-nexos.antideploy.com/auth/callback`
  - `https://ai-nexos.antideploy.com/**`
  - `https://ai-nexos.antideploy.com/dashboard`
  - `http://localhost:3000/auth/callback`
  - `http://127.0.0.1:3000/auth/callback`
- **Email Auth**: Enabled (`external_email_enabled: true`).
- **Signups**: Enabled (`disable_signup: false`).
- **Token Rotation**: Enabled (`refresh_token_rotation_enabled: true`).
- **Staging URL Contamination**: **0** (No staging URLs present).

**Verdict: PASS**.

---

## 13. Repository / Production Parity & Delta

- **Production Migration Baseline**: Migrations `0000` through `0014` (15 total).
- **Repository Target Graph**: Migrations `0000` through `0018` (19 total).
- **Pending Migrations**: Exactly **4**:
  1. `0015_organization_code_prefix.sql`
  2. `0016_organization_memberships.sql`
  3. `0017_organization_invitations.sql`
  4. `0018_remediate_projects_rls_recursion.sql`
- **Delta Safety Analysis**:
  - Migration 0015 adds column and unique index; safely succeeds with 1 organization.
  - Migration 0016 creates memberships table and backfills 2 users cleanly.
  - Migration 0017 creates invitations table additively.
  - Migration 0018 replaces `projects_select` and creates `app.is_project_member`, eliminating recursion.

**Verdict: PASS**.

---

## 14. Git & Monorepo Safety

- **Commits Created**: **0**.
- **Pushes Executed**: **0**.
- **Migration SQL Modified**: **0**.

---

## 15. Production Mutation Audit

- **Production Schema Mutations (DDL)**: **0**.
- **Production Data Mutations (DML)**: **0**.
- **Production Auth Mutations**: **0**.
- **Production Storage Mutations**: **0**.
- **Production Application Deployments**: **0**.

---

## 16. Blockers

**ZERO (0) BLOCKERS DETECTED**.

All empirical data, database state, credentials, schema baselines, and local backups are in 100% alignment.

---

## 17. Operational Conditions

Prior to executing the production migration in the subsequent phase:

1. **Backup Verification**: Retain local dump file `pre_migration_backup_gsgseacjcalkhhmunjhx_20260926194357.dump` (1.08 MB) as the designated roll-back point.
2. **Organization Prefix Acknowledgement**: The single production organization (`AI NEXOS`) will receive prefix `'NEX'` under migration 0015.
3. **Dedicated Migration Execution**: Execute database migration using the explicit production flag:
   ```bash
   npm run db:migrate -- --environment=production
   ```
4. **Decoupled Deployment**: Application deployment to Antideploy must occur only after the migration runner reports all 19 migrations applied.

---

## 18. Final Status

# **STATUS A: PRODUCTION PREFLIGHT PASSED — READY FOR MIGRATION AUTHORIZATION**

*(Note: Production migration was NOT executed in this phase. The system awaits explicit operator authorization to execute `npm run db:migrate -- --environment=production` in the next phase).*
