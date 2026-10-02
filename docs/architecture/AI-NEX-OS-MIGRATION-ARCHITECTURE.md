# AI NEX OS — Schema Migration & Rollback Architecture
## Phase 1C: 10-Stage Forward-Only Migration Strategy & Rollback Runbooks

---

## Document Control

| Attribute | Detail |
| :--- | :--- |
| **Document Path** | `docs/architecture/AI-NEX-OS-MIGRATION-ARCHITECTURE.md` |
| **Version** | 1.0.0 (Phase 1C Migration Specification) |
| **Status** | **APPROVED TECHNICAL DESIGN (DOCUMENTATION ONLY)** |
| **Date** | September 26, 2026 |
| **Architects** | Principal Migration Architect, Database Architect, Site Reliability Engineer |
| **Repository Root** | `ai-nexos` (`NEXOS Comb / AIC NEXOS / ai-nexos`) |
| **Target Branch** | `phase-2-production-readiness` |
| **Scope** | Detailed 10-stage zero-downtime migration plan, comprehensive failure rollback runbooks, data reconciliation procedures, and operational checklists. |

---

## 1. Executive Summary & Zero-Downtime Guarantee

The primary challenge of the AI NEX OS multi-tenant rearchitecture is transitioning the live database from single-tenant coupling (`public.users` with mandatory `organization_id` and `role_id`) to a multi-tenant membership model (`public.organization_memberships`) without:
- Dropping active user sessions or forcing re-authentication.
- Disrupting live workforce clock-ins, break calculations, or correction reviews.
- Breaking external client review sessions on `portal.<domain>/s/{token}`.
- Risking tenant crossover or data loss during backfill.
- Locking production database tables during business hours.

To achieve this, the architecture adopts a **10-Stage Additive-First Migration Strategy** (Stages 0 through 9). Each stage is decoupled, forward-compatible, independently verifiable, and backed by a non-destructive rollback procedure.

---

## 2. 10-Stage Zero-Downtime Migration Strategy

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 0: Preflight Audits & Baseline Snapshots                                              │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 1: Introduce New Additive Structures (`organization_memberships`, `code_prefix`, etc.) │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 2: Atomic Data Backfill (Migrate existing users to memberships, set `is_default=true`) │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 3: Dual-Read with Verification Logging (Read membership, compare with user record)    │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 4: Dual-Write (Mutations write to both memberships and legacy user columns)           │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 5: End-to-End Integrity Verification & Reconciliation                                 │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 6: Read Cutover (Application reads exclusively from `organization_memberships`)       │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 7: Write Cutover (Application writes exclusively to `organization_memberships`)      │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 8: Legacy Column Deprecation (Make `users.organization_id` nullable; log warnings)    │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 9: Legacy Column Removal (Drop deprecated columns in future major release milestone)  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Detailed Stage Specifications

#### STAGE 0: Preflight & Baseline Auditing
- **Description**: Verify database connection health, take full physical and logical backups, verify table row counts, and validate that zero dangling references exist in production tables.
- **Dependencies**: Clean git working tree, verified direct connection string (`DIRECT_DATABASE_URL`).
- **Risk**: Low (Read-only operations).
- **Validation**: Compare row counts between `auth.users`, `public.users`, and `public.organizations`.
- **Rollback**: Abort migration; zero production impact.
- **Production Impact**: Zero downtime; zero locking.

#### STAGE 1: Introduce New Additive Structures
- **Description**: Apply additive DDL creating `organization_memberships`, `organization_invitations`, `organization_settings`, adding `code_prefix` to `organizations`, and creating updated RLS helper functions in schema `app`.
- **Phase 2 Status (`code_prefix`)**: `[MIGRATION CREATED & LOCALLY VALIDATED]`. Additive migration `database/migrations/0015_organization_code_prefix.sql` created and validated against Drizzle schema snapshot journal (index 15). Backfills seed organization to `'AIC'`. Execution against production is deferred until authorized.
- **Dependencies**: Stage 0 preflight sign-off.
- **Risk**: Low. All DDL is additive (new tables, new nullable columns with defaults). Zero modifications to existing tables' column types.
- **Validation**: Verify tables exist in `information_schema.tables`; verify indexes and constraints are created.
- **Rollback**: Drop newly created tables and remove added columns (`DROP TABLE organization_memberships CASCADE; ALTER TABLE organizations DROP COLUMN code_prefix;`).
- **Production Impact**: Sub-second catalog metadata locks; zero user impact.

#### STAGE 2: Atomic Data Backfill
- **Description**: Execute idempotent SQL backfill script migrating every row in `public.users` into `public.organization_memberships`:
  ```sql
  INSERT INTO public.organization_memberships (
    membership_id, user_id, organization_id, role_id, department_id,
    designation, employment_type, working_hours, status, is_default, joined_at
  )
  SELECT 
    gen_random_uuid(), u.user_id, u.organization_id, u.role_id, u.department_id,
    u.designation, u.employment_type, u.working_hours, u.status, true, u.created_at
  FROM public.users u
  WHERE u.organization_id IS NOT NULL
  ON CONFLICT (user_id, organization_id) DO NOTHING;
  ```
- **Dependencies**: Stage 1 completed.
- **Risk**: Medium. Potential foreign key mismatches if legacy data contains orphaned rows.
- **Validation**: Query `SELECT count(*) FROM users WHERE organization_id IS NOT NULL` must match `SELECT count(*) FROM organization_memberships`.
- **Rollback**: `TRUNCATE TABLE public.organization_memberships;`. Legacy `users` rows remain completely intact.
- **Production Impact**: Row locks during bulk insert. Mitigated by chunked batching (`BATCH_SIZE = 500`).

#### STAGE 3: Dual-Read with Verification Logging
- **Description**: Deploy application code update where `getCurrentUser()` reads tenancy from `organization_memberships`, compares the resolved tenant with `users.organization_id`, and logs discrepancies without failing the request.
- **Dependencies**: Stage 2 backfill validated.
- **Risk**: Low. If membership read fails, code seamlessly falls back to reading legacy `users.organization_id`.
- **Validation**: Sentry / log monitoring: zero `MEMBERSHIP_TENANT_MISMATCH` alerts over 48 hours of live traffic.
- **Rollback**: Revert application deployment to previous commit.
- **Production Impact**: Negligible latency delta (< 2ms) from secondary read.

#### STAGE 4: Dual-Write
- **Description**: Deploy application code update where all user mutations (role updates, department changes, new user provisioning) write to BOTH `organization_memberships` and legacy `users` columns inside an atomic transaction.
- **Dependencies**: Stage 3 dual-read stable for 48 hours.
- **Risk**: Medium. Transaction rollback if write to either table fails.
- **Validation**: Automated reconciliation script running hourly to ensure zero drift between `users` and `organization_memberships`.
- **Rollback**: Disable dual-write flag; revert mutations to write strictly to legacy columns.
- **Production Impact**: Minimal write overhead (< 5ms per user mutation).

#### STAGE 5: Verification & Integrity Auditing
- **Description**: Comprehensive audit executing all 16 Data Integrity Invariants (INVAR-01 through INVAR-16). Automated consistency checks verify:
  1. Every active user has an active membership.
  2. Every membership role matches the organization's role set.
  3. Every project and task sequence is intact.
- **Dependencies**: Stage 4 running cleanly.
- **Risk**: Low (Read-only verification scripts).
- **Validation**: Automated verification suite returns exit code 0.
- **Rollback**: Fix data discrepancies via targeted idempotent fixup scripts before proceeding.
- **Production Impact**: None.

#### STAGE 6: Read Cutover
- **Description**: Deploy application code update where `getCurrentUser()`, `requireCurrentUser()`, and all workspace queries read EXCLUSIVELY from `organization_memberships`. The legacy columns on `public.users` are no longer queried.
- **Dependencies**: Stage 5 integrity audit passes with 100% compliance.
- **Risk**: Low. Fallback mechanisms remain compiled in codebase behind feature flag.
- **Validation**: User navigation, switching, and permission checks function seamlessly across all workspace modules.
- **Rollback**: Flip feature flag `READ_MEMBERSHIP_PRIMARY=false` to restore legacy reads.
- **Production Impact**: Zero downtime.

#### STAGE 7: Write Cutover
- **Description**: Cease writing to legacy `users.organization_id` and `users.role_id`. All user status changes, role assignments, and department transfers write strictly to `organization_memberships`.
- **Dependencies**: Stage 6 active for 7 days with zero tenant leakage reports.
- **Risk**: Low.
- **Validation**: Verify that user invites and role updates modify only `organization_memberships`.
- **Rollback**: Re-enable dual-write adapter.
- **Production Impact**: Zero downtime.

#### STAGE 8: Legacy Deprecation
- **Description**: Apply additive DDL altering legacy columns on `public.users` to become `NULLABLE`:
  ```sql
  ALTER TABLE public.users ALTER COLUMN organization_id DROP NOT NULL;
  ALTER TABLE public.users ALTER COLUMN role_id DROP NOT NULL;
  ```
- **Dependencies**: Stage 7 completed.
- **Risk**: Low. Existing rows retain legacy values; new multi-organization users can now be created with `organization_id = NULL`.
- **Validation**: Create a new test user without an organization; verify no database constraint violation occurs.
- **Rollback**: `UPDATE public.users SET organization_id = ...` and restore `NOT NULL` constraint if needed.
- **Production Impact**: Sub-second catalog lock.

#### STAGE 9: Legacy Column Removal [FUTURE RELEASE MILESTONE]
- **Description**: In a future major version release (Phase 8+), drop the deprecated legacy columns (`ALTER TABLE public.users DROP COLUMN organization_id, DROP COLUMN role_id;`).
- **Dependencies**: Multi-tenant architecture running in production for at least 60 days with all legacy dependencies eliminated.
- **Risk**: Medium. Irreversible column drop.
- **Validation**: Full schema lint and AST test suite pass.
- **Rollback**: Restore from pre-drop point-in-time recovery (PITR) backup.
- **Production Impact**: Table rewrite lock; scheduled for maintenance window.

---

## 3. Comprehensive Rollback Architecture & Runbooks

Every potential migration failure mode has a documented, non-destructive rollback procedure:

### 3.1 Failure Mode 1: Backfill Script Failure (Stage 2)
- **Symptom**: Foreign key constraint violation or timeout during Stage 2 batch insert.
- **Immediate Action**: Transaction automatically aborts.
- **Remediation Runbook**:
  1. Inspect failed batch offset: `SELECT * FROM users WHERE user_id NOT IN (SELECT user_id FROM organization_memberships)`.
  2. Identify orphaned `organization_id` or `role_id` references.
  3. Re-run backfill with explicit batch transaction handling.
  4. Production user access remains completely uninterrupted because application still reads `public.users`.

### 3.2 Failure Mode 2: Tenant Crossover or Membership Mismatch (Stage 3–6)
- **Symptom**: User reports seeing projects or clients from another agency workspace.
- **Immediate Action**: Emergency stop.
- **Remediation Runbook**:
  1. Flip feature flag: `NEXT_PUBLIC_FORCE_LEGACY_TENANCY=true` (instant rollback to `users.organization_id`).
  2. Clear all active cookies: Invalidate `nexos_active_org_id` by issuing global cookie clear header.
  3. Flush Redis and React cache keys.
  4. Query audit logs for recent `organization.switched` events to isolate affected accounts.

### 3.3 Failure Mode 3: Broken Workforce Attendance (Stage 4–7)
- **Symptom**: Punch clock or break calculations fail with timezone or membership resolution errors.
- **Immediate Action**:
  1. Verify `organization_memberships.working_hours` and `organizations.timezone` match legacy user values.
  2. Restore fallback in `src/features/workforce/shared/business-day.ts` to read `organizations.timezone` directly from the user's legacy organization row.
  3. Re-run reconciliation query on active attendance records.

### 3.4 Failure Mode 4: Broken Client Review Portal (Stage 1–8)
- **Symptom**: External client reviewer receives 404 or 403 on `/s/{token}`.
- **Immediate Action**:
  1. Portal review sessions rely on `deliverable_share_links` and `shares.ts` which are structurally independent of `users.organization_id`.
  2. If portal routing is affected, verify that `src/proxy.ts` domain rewrites for `portal.<domain>` remain unmodified.
  3. Confirm that `external_identities` table is intact.

### 3.5 Failure Mode 5: Code Prefix Collision
- **Symptom**: Attempting to insert an organization with a `code_prefix` that already exists.
- **Immediate Action**:
  1. The unique constraint `uq_organizations_code_prefix` prevents duplicate prefixes at the database level.
  2. Application catches unique constraint violation and prompts the agency owner: `"This prefix is already in use. Please select a distinct 3-8 character prefix."`

---

## 4. Operational Migration Runbook (Step-by-Step Execution Plan)

> **IMPORTANT**: This runbook is a documentation-only specification. It must NOT be executed in Phase 1C.

```
================================================================================
AI NEX OS PRODUCTION MIGRATION RUNBOOK (PHASE 4 EXECUTION GUIDE)
================================================================================

[STEP 1: PRE-CHECKS]
1.1 Verify git status: Ensure clean working tree on `phase-2-production-readiness`.
1.2 Verify environment: Ensure DIRECT_DATABASE_URL connects to target database.
1.3 Take Supabase physical backup: Trigger manual snapshot via Supabase dashboard.
1.4 Record baseline counts:
    psql "$DIRECT_DATABASE_URL" -c "SELECT count(*) FROM users;" > baseline_users.txt
    psql "$DIRECT_DATABASE_URL" -c "SELECT count(*) FROM organizations;" > baseline_orgs.txt

[STEP 2: APPLY ADDITIVE DDL (STAGE 1)]
2.1 Execute migration script:
    npm run db:migrate -- --environment=production
2.2 Verify new tables:
    psql "$DIRECT_DATABASE_URL" -c "\dt public.organization_*"

[STEP 3: EXECUTE BACKFILL (STAGE 2)]
3.1 Execute backfill script:
    npm run db:backfill:memberships -- --environment=production
3.2 Validate counts:
    psql "$DIRECT_DATABASE_URL" -c "SELECT count(*) FROM organization_memberships;"
    Verify count matches baseline_users.txt.

[STEP 4: DEPLOY DUAL-READ APPLICATION CODE (STAGE 3)]
4.1 Deploy Next.js release containing dual-read logic.
4.2 Monitor Sentry for 2 hours: Zero unexpected exceptions.

[STEP 5: DEPLOY DUAL-WRITE APPLICATION CODE (STAGE 4)]
4.1 Deploy Next.js release containing dual-write logic.
4.2 Run reconciliation audit after 24 hours:
    npm run db:audit:reconciliation -- --environment=production

[STEP 6: READ CUTOVER (STAGE 6)]
6.1 Enable READ_MEMBERSHIP_PRIMARY feature flag.
6.2 Verify active user sessions remain valid.
6.3 Test organization switcher in production smoke test account.

[STEP 7: POST-MIGRATION AUDIT]
7.1 Execute full automated test suite:
    npm run test
7.2 Execute AST security gate:
    npm run test tests/unit/tenant-identity-surface.test.ts
7.3 Verify zero cross-tenant query regressions.

================================================================================
MIGRATION COMPLETED SUCCESSFULLY — ZERO DOWNTIME / ZERO REGRESSION
================================================================================
```
